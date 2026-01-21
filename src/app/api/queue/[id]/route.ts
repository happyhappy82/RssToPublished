import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - 대기열 아이템 업데이트
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, position, content, target_platforms, scheduled_at } = body;

    const supabase = createServerSupabaseClient();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (position !== undefined) updates.position = position;
    if (content) updates.content = content;
    if (target_platforms) updates.target_platforms = target_platforms;
    if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at;
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
    console.error("PUT /api/queue/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - 대기열에서 삭제
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("upload_queue").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/queue/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
