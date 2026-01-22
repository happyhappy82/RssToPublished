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

interface NotionProperty {
  id: string;
  name: string;
  type: string;
  status?: {
    options: { id: string; name: string; color: string }[];
    groups: { id: string; name: string; option_ids: string[] }[];
  };
  select?: {
    options: { id: string; name: string; color: string }[];
  };
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

    // 1. 먼저 데이터베이스 스키마 가져오기
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
        { error: `데이터베이스 접근 실패: ${errorData.message}` },
        { status: dbResponse.status }
      );
    }

    const dbData = await dbResponse.json();
    const properties = dbData.properties as Record<string, NotionProperty>;

    // 2. 스키마에서 속성 타입 확인
    const propMap: Record<string, { name: string; type: string }> = {};
    let titlePropertyName = "Name"; // 기본값

    for (const [name, prop] of Object.entries(properties)) {
      propMap[name.toLowerCase()] = { name, type: prop.type };

      // title 타입 속성 찾기
      if (prop.type === "title") {
        titlePropertyName = name;
      }
    }

    // 3. 동적으로 properties 구성
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageProperties: Record<string, any> = {
      // 제목은 필수 (title 타입 속성)
      [titlePropertyName]: {
        title: [
          {
            text: {
              content: title || "AI 생성 콘텐츠",
            },
          },
        ],
      },
    };

    // Status 속성이 있으면 추가 (다양한 이름 지원) - 실제 옵션에서 첫 번째 사용
    const statusNames = ["status", "상태", "진행상태", "state"];
    for (const statusName of statusNames) {
      const prop = propMap[statusName];
      const fullProp = properties[prop?.name] as NotionProperty | undefined;

      if (prop && prop.type === "status" && fullProp?.status?.options?.length) {
        // 실제 Status 옵션 중 첫 번째 사용
        const firstOption = fullProp.status.options[0].name;
        pageProperties[prop.name] = {
          status: {
            name: firstOption,
          },
        };
        break;
      } else if (prop && prop.type === "select" && fullProp?.select?.options?.length) {
        // 실제 Select 옵션 중 첫 번째 사용
        const firstOption = fullProp.select.options[0].name;
        pageProperties[prop.name] = {
          select: {
            name: firstOption,
          },
        };
        break;
      }
    }

    // 콘텐츠 유형 속성이 있으면 추가
    const typeNames = ["콘텐츠 유형", "유형", "type", "content type", "category", "카테고리"];
    for (const typeName of typeNames) {
      const prop = propMap[typeName];
      if (prop && prop.type === "select" && contentType) {
        pageProperties[prop.name] = {
          select: {
            name: contentType,
          },
        };
        break;
      }
    }

    // 플랫폼 속성이 있으면 추가
    const platformNames = ["플랫폼", "platform", "platforms", "타겟"];
    for (const platformName of platformNames) {
      const prop = propMap[platformName];
      if (prop && prop.type === "multi_select" && targetPlatforms?.length > 0) {
        pageProperties[prop.name] = {
          multi_select: targetPlatforms.map((p) => ({ name: p })),
        };
        break;
      }
    }

    // URL 속성이 있으면 추가
    const urlNames = ["원본 url", "url", "source", "link", "원본"];
    for (const urlName of urlNames) {
      const prop = propMap[urlName];
      if (prop && prop.type === "url" && sourceUrl) {
        pageProperties[prop.name] = {
          url: sourceUrl,
        };
        break;
      }
    }

    // 4. 페이지 생성
    const notionResponse = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${notionApiKey}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: {
          database_id: notionDatabaseId,
        },
        properties: pageProperties,
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
          // 콘텐츠를 여러 블록으로 나눠서 저장 (2000자 제한)
          ...splitContentToBlocks(content),
        ],
      }),
    });

    if (!notionResponse.ok) {
      const errorData = await notionResponse.json();
      console.error("Notion API Error:", errorData);

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
