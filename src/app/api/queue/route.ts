import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";

// GET - 업로드 대기열 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("upload_queue")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/queue error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - 대기열에 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { processed_content_id, content, target_platforms, scheduled_at } = body;

    if (!content || !target_platforms) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Get max position
    const { data: maxPosData } = await supabase
      .from("upload_queue")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPosData?.position || 0) + 1;

    const { data, error } = await supabase
      .from("upload_queue")
      .insert({
        processed_content_id,
        content,
        target_platforms,
        scheduled_at,
        status: scheduled_at ? "scheduled" : "pending",
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/queue error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH - 대기열 아이템 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, position, content, target_platforms } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (position !== undefined) updates.position = position;
    if (content) updates.content = content;
    if (target_platforms) updates.target_platforms = target_platforms;
    if (status === "uploaded") updates.uploaded_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("upload_queue")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("PATCH /api/queue error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - 대기열에서 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("upload_queue").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/queue error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
