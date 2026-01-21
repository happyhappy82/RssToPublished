import { NextRequest, NextResponse } from "next/server";

interface NotionPageRequest {
  notionApiKey: string;
  notionDatabaseId: string;
  title: string;
  content: string;
  contentType: string;
  targetPlatforms: string[];
  sourceUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: NotionPageRequest = await request.json();
    const {
      notionApiKey,
      notionDatabaseId,
      title,
      content,
      contentType,
      targetPlatforms,
      sourceUrl,
    } = body;

    if (!notionApiKey || !notionDatabaseId) {
      return NextResponse.json(
        { error: "Notion API Key와 Database ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "콘텐츠 내용이 필요합니다." },
        { status: 400 }
      );
    }

    // Notion API로 페이지 생성
    const notionResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${notionApiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: {
          database_id: notionDatabaseId,
        },
        properties: {
          // 제목 속성 (Name 또는 Title)
          Name: {
            title: [
              {
                text: {
                  content: title || "AI 생성 콘텐츠",
                },
              },
            ],
          },
          // 콘텐츠 유형
          ...(contentType && {
            "콘텐츠 유형": {
              select: {
                name: contentType,
              },
            },
          }),
          // 타겟 플랫폼
          ...(targetPlatforms && targetPlatforms.length > 0 && {
            "플랫폼": {
              multi_select: targetPlatforms.map(p => ({ name: p })),
            },
          }),
          // 상태
          "상태": {
            select: {
              name: "대기",
            },
          },
          // 원본 URL
          ...(sourceUrl && {
            "원본 URL": {
              url: sourceUrl,
            },
          }),
        },
        // 페이지 본문
        children: [
          {
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "생성된 콘텐츠",
                  },
                },
              ],
            },
          },
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: content.slice(0, 2000), // Notion 블록당 2000자 제한
                  },
                },
              ],
            },
          },
          // 콘텐츠가 2000자 이상이면 추가 블록
          ...(content.length > 2000
            ? [
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [
                      {
                        type: "text",
                        text: {
                          content: content.slice(2000, 4000),
                        },
                      },
                    ],
                  },
                },
              ]
            : []),
          ...(content.length > 4000
            ? [
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [
                      {
                        type: "text",
                        text: {
                          content: content.slice(4000, 6000),
                        },
                      },
                    ],
                  },
                },
              ]
            : []),
        ],
      }),
    });

    if (!notionResponse.ok) {
      const errorData = await notionResponse.json();
      console.error("Notion API Error:", errorData);

      // 속성 오류 처리
      if (errorData.code === "validation_error") {
        return NextResponse.json(
          {
            error: "Notion 데이터베이스 속성이 맞지 않습니다. 'Name', '콘텐츠 유형', '플랫폼', '상태' 속성이 필요합니다.",
            details: errorData.message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: errorData.message || "Notion 저장에 실패했습니다." },
        { status: notionResponse.status }
      );
    }

    const notionData = await notionResponse.json();

    return NextResponse.json({
      success: true,
      pageId: notionData.id,
      pageUrl: notionData.url,
    });
  } catch (error) {
    console.error("Notion API error:", error);
    return NextResponse.json(
      { error: "Notion 연동 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
