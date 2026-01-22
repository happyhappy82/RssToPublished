import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/client";

interface NotionProperty {
  id: string;
  name: string;
  type: string;
}

// 콘텐츠를 2000자씩 나눠서 paragraph 블록 배열로 변환
function splitContentToBlocks(content: string) {
  const blocks = [];
  const chunkSize = 2000;

  for (let i = 0; i < content.length; i += chunkSize) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content: content.slice(i, i + chunkSize),
            },
          },
        ],
      },
    });
  }

  return blocks;
}

// POST - 선택된 항목들을 일괄로 Notion에 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, notionApiKey, notionDatabaseId } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids 배열이 필요합니다" }, { status: 400 });
    }

    if (!notionApiKey || !notionDatabaseId) {
      return NextResponse.json({ error: "Notion API Key와 Database ID가 필요합니다" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 대기열에서 해당 항목들 가져오기
    const { data: queueItems, error: fetchError } = await supabase
      .from("upload_queue")
      .select("*")
      .in("id", ids);

    if (fetchError || !queueItems) {
      return NextResponse.json({ error: "대기열 항목을 찾을 수 없습니다" }, { status: 404 });
    }

    // 데이터베이스 스키마 가져오기 (한 번만)
    const dbResponse = await fetch(
      `https://api.notion.com/v1/databases/${notionDatabaseId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${notionApiKey}`,
          "Notion-Version": "2022-06-28",
        },
      }
    );

    if (!dbResponse.ok) {
      const errorData = await dbResponse.json();
      return NextResponse.json(
        { error: `Notion 데이터베이스 접근 실패: ${errorData.message}` },
        { status: dbResponse.status }
      );
    }

    const dbData = await dbResponse.json();
    const properties = dbData.properties as Record<string, NotionProperty>;

    // 스키마에서 속성 타입 확인
    const propMap: Record<string, { name: string; type: string }> = {};
    let titlePropertyName = "Name";

    for (const [name, prop] of Object.entries(properties)) {
      propMap[name.toLowerCase()] = { name, type: prop.type };
      if (prop.type === "title") {
        titlePropertyName = name;
      }
    }

    // 각 항목을 Notion에 저장
    const results = [];
    const errors = [];

    for (const item of queueItems) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageProperties: Record<string, any> = {
          [titlePropertyName]: {
            title: [
              {
                text: {
                  content: item.title || "AI 생성 콘텐츠",
                },
              },
            ],
          },
        };

        // Status 속성
        const statusNames = ["status", "상태", "진행상태", "state"];
        for (const statusName of statusNames) {
          const prop = propMap[statusName];
          if (prop && prop.type === "status") {
            pageProperties[prop.name] = { status: { name: "Review" } };
            break;
          } else if (prop && prop.type === "select") {
            pageProperties[prop.name] = { select: { name: "Review" } };
            break;
          }
        }

        // 콘텐츠 유형 속성
        const typeNames = ["콘텐츠 유형", "유형", "type", "content type", "category", "카테고리"];
        for (const typeName of typeNames) {
          const prop = propMap[typeName];
          if (prop && prop.type === "select" && item.content_type) {
            pageProperties[prop.name] = { select: { name: item.content_type } };
            break;
          }
        }

        // URL 속성
        const urlNames = ["원본 url", "url", "source", "link", "원본"];
        for (const urlName of urlNames) {
          const prop = propMap[urlName];
          if (prop && prop.type === "url" && item.source_url) {
            pageProperties[prop.name] = { url: item.source_url };
            break;
          }
        }

        // 날짜 속성 (scheduled_at)
        const dateNames = ["발행일", "예약일", "date", "scheduled", "publish date", "날짜"];
        for (const dateName of dateNames) {
          const prop = propMap[dateName];
          if (prop && prop.type === "date" && item.scheduled_at) {
            pageProperties[prop.name] = {
              date: {
                start: item.scheduled_at.split("T")[0], // YYYY-MM-DD 형식
              },
            };
            break;
          }
        }

        // Notion 페이지 생성
        const notionResponse = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${notionApiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28",
          },
          body: JSON.stringify({
            parent: { database_id: notionDatabaseId },
            properties: pageProperties,
            children: [
              {
                object: "block",
                type: "heading_2",
                heading_2: {
                  rich_text: [{ type: "text", text: { content: "생성된 콘텐츠" } }],
                },
              },
              ...splitContentToBlocks(item.content),
            ],
          }),
        });

        if (!notionResponse.ok) {
          const errorData = await notionResponse.json();
          errors.push({ id: item.id, error: errorData.message });
          continue;
        }

        const notionData = await notionResponse.json();

        // 상태 업데이트
        await supabase
          .from("upload_queue")
          .update({
            status: "uploaded",
            uploaded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          pageId: notionData.id,
          pageUrl: notionData.url,
        });
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        errors.push({
          id: item.id,
          error: itemError instanceof Error ? itemError.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      uploaded: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error("POST /api/queue/batch-notion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
