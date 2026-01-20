import { ApifyClient } from "apify-client";

// Apify 클라이언트 싱글톤
let client: ApifyClient | null = null;

export function getApifyClient(): ApifyClient {
  if (!client) {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new Error("APIFY_API_TOKEN 환경변수가 설정되지 않았습니다");
    }
    client = new ApifyClient({ token });
  }
  return client;
}

export interface ScrapedItem {
  id: string;
  title: string | null;
  content: string;
  author: string | null;
  url: string | null;
  thumbnail: string | null;
  publishedAt: string;
}

// Actor 실행 결과 가져오기
export async function runActorAndGetResults<T>(
  actorId: string,
  input: Record<string, unknown>,
  maxItems: number = 50
): Promise<T[]> {
  try {
    const client = getApifyClient();

    // Actor 실행 (완료될 때까지 충분히 대기)
    const run = await client.actor(actorId).call(input, {
      waitSecs: 300, // 최대 5분 대기
    });

    if (!run.defaultDatasetId) {
      return [];
    }

    // 결과 가져오기
    const { items } = await client.dataset(run.defaultDatasetId).listItems({
      limit: maxItems,
    });

    return items as T[];
  } catch (error) {
    // Apify 처리 중 발생한 에러는 조용히 처리하고 빈 배열 반환
    console.error(`Apify actor ${actorId} error:`, error);
    return [];
  }
}
