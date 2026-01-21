import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";
import { createPost, getProfileIds } from "@/lib/buffer/client";
import type { Platform } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Buffer를 통해 즉시 업로드
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = createServerSupabaseClient();

    // 대기열 아이템 조회
    const { data: queueItem, error: fetchError } = await supabase
      .from("upload_queue")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !queueItem) {
      return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
    }

    // 플랫폼별 프로필 ID 매핑
    const profileIdMap = getProfileIds();
    const profileIds: string[] = [];

    (queueItem.target_platforms as Platform[]).forEach((platform) => {
      if (platform === "threads" && profileIdMap.threads) {
        profileIds.push(profileIdMap.threads);
      } else if (platform === "linkedin" && profileIdMap.linkedin) {
        profileIds.push(profileIdMap.linkedin);
      }
    });

    if (profileIds.length === 0) {
      return NextResponse.json(
        { error: "No valid profile IDs found for target platforms" },
        { status: 400 }
      );
    }

    // Buffer를 통해 업로드
    const bufferResponse = await createPost({
      text: queueItem.content,
      profileIds,
    });

    if (!bufferResponse.success) {
      // 업로드 실패 시 상태 업데이트
      await supabase
        .from("upload_queue")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", id);

      return NextResponse.json({ error: "Buffer upload failed" }, { status: 500 });
    }

    // 업로드 성공 시 상태 업데이트
    const { data, error } = await supabase
      .from("upload_queue")
      .update({
        status: "uploaded",
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, buffer: bufferResponse });
  } catch (error) {
    console.error("POST /api/queue/[id]/upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
