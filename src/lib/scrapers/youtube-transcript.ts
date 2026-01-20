import { runActorAndGetResults } from "../apify/client";

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export interface VideoTranscript {
  videoId: string;
  transcript: string;
  segments: TranscriptSegment[];
}

/**
 * YouTube 영상 ID에서 자막(transcript) 가져오기 (Apify Actor 사용)
 */
export async function getVideoTranscript(
  videoId: string
): Promise<VideoTranscript | null> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Apify Actor로 자막 가져오기
    const results = await runActorAndGetResults<any>(
      "starvibe/youtube-video-transcript",
      {
        youtube_url: videoUrl,
        language: "ko", // 한국어 우선
        include_transcript_text: true,
      },
      1
    );

    if (results.length === 0) {
      console.warn(`No transcript found for ${videoId}`);
      return null;
    }

    const data = results[0];

    // transcript_text가 있으면 사용 (타임스탬프 없는 전체 텍스트)
    if (data.transcript_text) {
      console.log(`✓ Transcript found for ${videoId}: ${data.transcript_text.length} chars`);

      return {
        videoId,
        transcript: data.transcript_text,
        segments: [], // 타임스탬프 없는 전체 텍스트만 사용
      };
    }

    // transcript 배열이 있으면 사용 (타임스탬프 포함)
    if (data.transcript && Array.isArray(data.transcript) && data.transcript.length > 0) {
      const segments: TranscriptSegment[] = data.transcript.map((item: any) => ({
        text: item.text || "",
        offset: item.start || 0,
        duration: item.duration || 0,
      }));

      const fullTranscript = segments.map((s) => s.text).join(" ");

      if (fullTranscript.trim()) {
        console.log(`✓ Transcript found for ${videoId}: ${segments.length} segments`);

        return {
          videoId,
          transcript: fullTranscript,
          segments,
        };
      }
    }

    console.warn(`No valid transcript data for ${videoId}`);
    return null;
  } catch (error) {
    console.error(`Apify transcript fetch failed for ${videoId}:`, error);
    return null;
  }
}

/**
 * YouTube URL에서 영상 ID 추출
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/v\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * 여러 영상의 자막 가져오기
 */
export async function getMultipleTranscripts(
  videoIds: string[]
): Promise<VideoTranscript[]> {
  const results = await Promise.allSettled(
    videoIds.map((id) => getVideoTranscript(id))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<VideoTranscript | null> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value as VideoTranscript);
}
