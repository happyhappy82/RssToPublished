const BUFFER_API_URL = "https://api.bufferapp.com/1";

interface BufferProfile {
  id: string;
  service: string;
  service_username: string;
}

interface BufferUpdateResponse {
  success: boolean;
  buffer_count: number;
  buffer_percentage: number;
  updates: {
    id: string;
    created_at: number;
    status: string;
    text: string;
    profile_id: string;
  }[];
}

interface CreatePostParams {
  text: string;
  profileIds: string[];
  scheduledAt?: Date;
}

/**
 * Buffer 연결된 프로필 목록 조회
 */
export async function getProfiles(): Promise<BufferProfile[]> {
  const accessToken = process.env.BUFFER_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("BUFFER_ACCESS_TOKEN is not set");
  }

  const response = await fetch(
    `${BUFFER_API_URL}/profiles.json?access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Buffer API error: ${error}`);
  }

  return response.json();
}

/**
 * Buffer를 통해 포스트 생성
 */
export async function createPost({
  text,
  profileIds,
  scheduledAt,
}: CreatePostParams): Promise<BufferUpdateResponse> {
  const accessToken = process.env.BUFFER_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("BUFFER_ACCESS_TOKEN is not set");
  }

  const params = new URLSearchParams({
    access_token: accessToken,
    text,
    ...profileIds.reduce((acc, id, index) => {
      acc[`profile_ids[${index}]`] = id;
      return acc;
    }, {} as Record<string, string>),
  });

  // 예약 업로드인 경우
  if (scheduledAt) {
    params.append("scheduled_at", Math.floor(scheduledAt.getTime() / 1000).toString());
  } else {
    // 즉시 업로드 (Buffer 큐에 추가)
    params.append("now", "true");
  }

  const response = await fetch(`${BUFFER_API_URL}/updates/create.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Buffer API error: ${error}`);
  }

  return response.json();
}

/**
 * 특정 포스트 상태 조회
 */
export async function getUpdateStatus(updateId: string): Promise<{
  id: string;
  status: string;
  text: string;
  sent_at?: number;
}> {
  const accessToken = process.env.BUFFER_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("BUFFER_ACCESS_TOKEN is not set");
  }

  const response = await fetch(
    `${BUFFER_API_URL}/updates/${updateId}.json?access_token=${accessToken}`
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Buffer API error: ${error}`);
  }

  return response.json();
}

/**
 * 환경변수에서 플랫폼별 프로필 ID 가져오기
 */
export function getProfileIds(): {
  threads: string | undefined;
  linkedin: string | undefined;
} {
  return {
    threads: process.env.BUFFER_THREADS_PROFILE_ID,
    linkedin: process.env.BUFFER_LINKEDIN_PROFILE_ID,
  };
}
