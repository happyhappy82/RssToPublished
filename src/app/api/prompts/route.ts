import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";

// GET - 프롬프트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get("content_type");

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("prompts")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (contentType && contentType !== "all") {
      query = query.eq("content_type", contentType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/prompts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - 새 프롬프트 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, content_type, prompt_text, is_default } = body;

    if (!name || !content_type || !prompt_text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("prompts")
      .insert({
        name,
        content_type,
        prompt_text,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/prompts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - 프롬프트 업데이트 (content_type 기준 upsert)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { content_type, prompt_text, name } = body;

    if (!content_type || !prompt_text) {
      return NextResponse.json({ error: "content_type과 prompt_text가 필요합니다" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 기존 프롬프트 확인
    const { data: existing } = await supabase
      .from("prompts")
      .select("id")
      .eq("content_type", content_type)
      .single();

    if (existing) {
      // 업데이트
      const { data, error } = await supabase
        .from("prompts")
        .update({ prompt_text, name: name || content_type })
        .eq("content_type", content_type)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data });
    } else {
      // 새로 생성
      const { data, error } = await supabase
        .from("prompts")
        .insert({ content_type, prompt_text, name: name || content_type })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data }, { status: 201 });
    }
  } catch (error) {
    console.error("PATCH /api/prompts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - 프롬프트 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("prompts").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/prompts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
