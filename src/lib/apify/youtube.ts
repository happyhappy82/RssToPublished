import { runActorAndGetResults } from "./client";

interface YouTubeComment {
  comment?: string;
  text?: string;
  author?: string;
  authorName?: string;
  voteCount?: number;
  likes?: number;
  likeCount?: number;
  publishedTimeText?: string;
  replyCount?: number;
}

/**
 * YouTube 영상 댓글 가져오기
 */
export async function scrapeYouTubeComments(
  videoUrl: string,
  maxComments: number = 50
): Promise<string> {
  try {
    const results = await runActorAndGetResults<YouTubeComment>(
      "streamers/youtube-comments-scraper",
      {
        startUrls: [{ url: videoUrl }],
        maxComments: maxComments,
        includeReplies: true,
      },
      maxComments
    );

    if (results.length === 0) {
      return "";
    }

    // 댓글 텍스트로 변환
    let commentsText = "[댓글]";
    for (const item of results) {
      const author = item.author || item.authorName || "익명";
      const text = item.comment || item.text || "";
      const likes = item.voteCount || item.likeCount || item.likes || 0;

      commentsText += `\n- ${author} (좋아요 ${likes}): ${text}`;
    }

    return commentsText;
  } catch (error) {
    console.error("YouTube comments scrape failed:", error);
    return "";
  }
}
