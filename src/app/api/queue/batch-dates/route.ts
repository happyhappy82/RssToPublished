import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";

// PATCH - 선택된 항목들의 scheduled_at 일괄 설정
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, startDate, intervalHours } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids 배열이 필요합니다" }, { status: 400 });
    }

    if (!startDate) {
      return NextResponse.json({ error: "startDate가 필요합니다" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const interval = intervalHours || 24; // 기본값 24시간 (1일)

    // 각 항목에 순차적으로 날짜 설정
    const updates = [];
    let currentDate = new Date(startDate);

    for (let i = 0; i < ids.length; i++) {
      const scheduledAt = new Date(currentDate);

      const { data, error } = await supabase
        .from("upload_queue")
        .update({
          scheduled_at: scheduledAt.toISOString(),
          status: "scheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ids[i])
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${ids[i]}:`, error);
      } else {
        updates.push(data);
      }

      // 다음 항목을 위해 interval만큼 시간 추가
      currentDate = new Date(currentDate.getTime() + interval * 60 * 60 * 1000);
    }

    return NextResponse.json({
      success: true,
      updated: updates.length,
      data: updates,
    });
  } catch (error) {
    console.error("PATCH /api/queue/batch-dates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
