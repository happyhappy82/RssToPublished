import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";

// GET - 소스 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get("platform");
    const category = searchParams.get("category");
    const categoriesOnly = searchParams.get("categories_only");

    const supabase = createServerSupabaseClient();

    // 카테고리 목록만 조회
    if (categoriesOnly === "true") {
      const { data, error } = await supabase
        .from("sources")
        .select("category")
        .not("category", "is", null);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // 중복 제거
      const categories = [...new Set(data?.map(d => d.category).filter(Boolean))];
      return NextResponse.json({ data: categories });
    }

    let query = supabase.from("sources").select("*").order("created_at", { ascending: false });

    if (platform && platform !== "all") {
      query = query.eq("platform", platform);
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/sources error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - 소스 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("sources").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/sources error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - 새 소스 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, account_name, account_url, nickname, rss_url, category } = body;

    if (!platform || !account_name || !rss_url) {
      return NextResponse.json({ error: "플랫폼, 이름, RSS URL은 필수입니다" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("sources")
      .insert({
        platform,
        account_id: account_name,
        account_name,
        account_url: account_url || rss_url,
        nickname,
        rss_url,
        category: category || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/sources error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error",
      details: error
    }, { status: 500 });
  }
}
