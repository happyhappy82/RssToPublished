import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { getVideoTranscript, extractVideoId } from "@/lib/scrapers/youtube-transcript";
import { scrapeWebpage } from "@/lib/scrapers/website";
import { scrapeTwitterPost } from "@/lib/apify/twitter";
import { scrapeLinkedInPost } from "@/lib/apify/linkedin";
import { scrapeThreadsPost } from "@/lib/apify/threads";
import { scrapeYouTubeComments } from "@/lib/apify/youtube";
import { generateContent } from "@/lib/ai/gemini";
import type { ContentType } from "@/types";

// 플랫폼별 본문 + 댓글 가져오기
async function fetchFullContent(
  platform: string,
  url: string
): Promise<{ content: string; author?: string } | null> {
  try {
    switch (platform) {
      case "youtube": {
        const videoId = extractVideoId(url);
        if (videoId) {
          const transcript = await getVideoTranscript(videoId);
          if (transcript?.transcript) {
            // 댓글도 가져오기
            const comments = await scrapeYouTubeComments(url, 30);
            const fullContent = `[본문 (자막)]\n${transcript.transcript}${comments ? `\n\n${comments}` : ""}`;
            return { content: fullContent };
          }
        }
        break;
      }

      case "website": {
        const webContent = await scrapeWebpage(url);
        if (webContent?.content) {
          return { content: webContent.content, author: webContent.author || undefined };
        }
        break;
      }

      case "twitter": {
        // 포스트 URL에서 본문 + 댓글 가져오기
        const result = await scrapeTwitterPost(url);
        if (result.content) {
          return { content: result.content, author: result.author || undefined };
        }
        break;
      }

      case "linkedin": {
        // 포스트 URL에서 본문 + 댓글 가져오기
        const result = await scrapeLinkedInPost(url);
        if (result.content) {
          return { content: result.content, author: result.author || undefined };
        }
        break;
      }

      case "threads": {
        // 포스트 URL에서 본문 + 댓글 가져오기
        const result = await scrapeThreadsPost(url);
        if (result.content) {
          return { content: result.content, author: result.author || undefined };
        }
        break;
      }
    }
  } catch (error) {
    console.error(`Failed to fetch content for ${platform}:`, error);
  }
  return null;
}

// GET - 가공된 콘텐츠 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get("content_type");
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("processed_contents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (contentType && contentType !== "all") {
      query = query.eq("content_type", contentType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/process error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - AI로 가공 (본문 스크래핑 + AI 처리)
// fetch_only=true인 경우 본문만 가져오고 AI 처리 안함
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scraped_content_id, content_type, prompt_used, fetch_only, model_settings } = body;

    // fetch_only 모드: scraped_content_id만 필요
    if (fetch_only) {
      if (!scraped_content_id) {
        return NextResponse.json({ error: "scraped_content_id가 필요합니다" }, { status: 400 });
      }
    } else if (!scraped_content_id || !content_type) {
      return NextResponse.json({ error: "scraped_content_id와 content_type이 필요합니다" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 1. scraped_content 가져오기
    const { data: scrapedContent, error: fetchError } = await supabase
      .from("scraped_contents")
      .select("*, source:sources(*)")
      .eq("id", scraped_content_id)
      .single();

    if (fetchError || !scrapedContent) {
      return NextResponse.json({ error: "콘텐츠를 찾을 수 없습니다" }, { status: 404 });
    }

    // 2. Apify/스크래퍼로 본문 + 댓글 가져오기 (항상 실행)
    let originalContent = scrapedContent.content;

    const fullContent = await fetchFullContent(
      scrapedContent.platform,
      scrapedContent.original_url
    );

    if (fullContent?.content) {
      originalContent = fullContent.content;

      // DB 업데이트
      await supabase
        .from("scraped_contents")
        .update({
          content: originalContent,
          author: fullContent.author || scrapedContent.author,
        })
        .eq("id", scraped_content_id);
    }

    if (!originalContent) {
      return NextResponse.json({ error: "본문을 가져올 수 없습니다" }, { status: 400 });
    }

    // fetch_only 모드: 본문만 가져오고 반환
    if (fetch_only) {
      // 새 콘텐츠를 가져왔으면 성공, 아니면 원본이라도 반환
      const fetched = !!fullContent?.content;
      return NextResponse.json({
        success: true,
        fetched, // 실제로 새 콘텐츠를 가져왔는지 여부
        content: originalContent,
        author: fullContent?.author || scrapedContent.author,
      });
    }

    // 3. Gemini AI로 콘텐츠 가공
    let processedContent: string;
    try {
      processedContent = await generateContent({
        originalContent,
        contentType: content_type as ContentType,
        customPrompt: prompt_used,
        modelSettings: model_settings,
      });
    } catch (aiError) {
      console.error("Gemini AI error:", aiError);
      return NextResponse.json({
        error: aiError instanceof Error ? aiError.message : "AI 처리 중 오류가 발생했습니다"
      }, { status: 500 });
    }

    // 4. 가공 결과 저장
    const { data, error } = await supabase
      .from("processed_contents")
      .insert({
        scraped_content_id,
        content_type,
        prompt_used,
        original_content: originalContent,
        processed_content: processedContent,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. 원본 콘텐츠 처리됨 표시
    await supabase
      .from("scraped_contents")
      .update({ is_processed: true })
      .eq("id", scraped_content_id);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/process error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - 가공된 콘텐츠 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("processed_contents").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/process error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
