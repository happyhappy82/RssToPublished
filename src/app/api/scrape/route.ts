import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { scrapeRssFeed } from "@/lib/scrapers/rss";
import { detectPlatformFromUrl } from "@/lib/utils/detectPlatform";

// POST - RSS에서 링크 목록만 수집 (본문은 AI 가공 시 가져옴)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sourceId = body.source_id;
    const maxItems = body.max_items || 20;

    const supabase = createServerSupabaseClient();

    // 특정 소스 또는 모든 활성 소스 가져오기
    let query = supabase.from("sources").select("*").eq("is_active", true);
    if (sourceId) {
      query = query.eq("id", sourceId);
    }

    const { data: sources, error: sourcesError } = await query;
    if (sourcesError) {
      return NextResponse.json({ error: sourcesError.message }, { status: 500 });
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json(
        { error: "No active sources found" },
        { status: 404 }
      );
    }

    const results: {
      sourceId: string;
      platform: string;
      scraped: number;
      errors: string[];
    }[] = [];

    for (const source of sources) {
      const result = {
        sourceId: source.id,
        platform: source.platform,
        scraped: 0,
        errors: [] as string[],
      };

      try {
        // RSS URL 필수
        if (!source.rss_url) {
          result.errors.push("RSS URL이 필요합니다");
          results.push(result);
          continue;
        }

        // RSS에서 링크 목록만 가져오기 (본문 스크래핑 X)
        const rssItems = await scrapeRssFeed(source.rss_url);

        // 기존 제목 목록 가져오기 (중복 방지)
        // 해당 소스의 모든 플랫폼 콘텐츠 제목 조회 (URL마다 플랫폼이 다를 수 있음)
        const { data: existingContents } = await supabase
          .from("scraped_contents")
          .select("title")
          .eq("source_id", source.id);

        const existingTitles = new Set(
          existingContents?.map((c) => c.title?.trim()).filter(Boolean) || []
        );

        // DB에 RSS 메타데이터만 저장 (content는 RSS 요약 또는 빈 값)
        for (const rssItem of rssItems.slice(0, maxItems)) {
          if (!rssItem.url) continue;

          // 제목 기준 중복 체크
          const trimmedTitle = rssItem.title?.trim();
          if (trimmedTitle && existingTitles.has(trimmedTitle)) {
            continue; // 이미 존재하는 제목은 스킵
          }

          // URL에서 플랫폼 자동 감지 (YouTube, Twitter, LinkedIn, Threads, Website)
          const detectedPlatform = detectPlatformFromUrl(rssItem.url);

          const { error: insertError } = await supabase
            .from("scraped_contents")
            .upsert(
              {
                source_id: source.id,
                platform: detectedPlatform, // URL에서 자동 감지된 플랫폼
                external_id: rssItem.id,
                title: rssItem.title,
                content: rssItem.content || "", // RSS 요약만 저장
                author: rssItem.author,
                original_url: rssItem.url,
                thumbnail_url: rssItem.thumbnail,
                published_at: rssItem.publishedAt,
                scraped_at: new Date().toISOString(),
                is_processed: false,
                category: source.category || null, // 소스의 카테고리 복사
              },
              { onConflict: "platform,external_id", ignoreDuplicates: true }
            );

          if (!insertError) {
            result.scraped++;
            // 새로 추가된 제목을 Set에 추가
            if (trimmedTitle) {
              existingTitles.add(trimmedTitle);
            }
          }
        }

        // 최근 수집 시간 업데이트
        await supabase
          .from("sources")
          .update({ last_scraped_at: new Date().toISOString() })
          .eq("id", source.id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        result.errors.push(errorMessage);
      }

      results.push(result);
    }

    const totalScraped = results.reduce((sum, r) => sum + r.scraped, 0);
    return NextResponse.json({
      success: true,
      totalScraped,
      results,
    });
  } catch (error) {
    console.error("POST /api/scrape error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
