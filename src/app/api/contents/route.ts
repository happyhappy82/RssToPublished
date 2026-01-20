import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";

// GET - 스크랩된 콘텐츠 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const sourceId = searchParams.get("source_id");
    const isProcessed = searchParams.get("is_processed");
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("scraped_contents")
      .select(`*, source:sources(*)`)
      .order("scraped_at", { ascending: false })
      .limit(limit);

    if (platform && platform !== "all") {
      query = query.eq("platform", platform);
    }
    if (sourceId) {
      query = query.eq("source_id", sourceId);
    }
    if (isProcessed !== null) {
      query = query.eq("is_processed", isProcessed === "true");
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/contents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - 새 콘텐츠 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source_id, platform, title, content, author, original_url, external_id } = body;

    if (!platform || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("scraped_contents")
      .insert({
        source_id,
        platform,
        title,
        content,
        author,
        original_url,
        external_id,
        is_processed: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/contents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - 콘텐츠 삭제 (개별 또는 전체)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all");

    const supabase = createServerSupabaseClient();

    // 전체 삭제
    if (all === "true") {
      const { error } = await supabase.from("scraped_contents").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "All contents deleted" });
    }

    // 개별 삭제
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const { error } = await supabase.from("scraped_contents").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/contents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
