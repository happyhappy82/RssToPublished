import { runActorAndGetResults, ScrapedItem } from "./client";

interface TwitterTweet {
  id?: string;
  conversationId?: string;
  fullText?: string;
  text?: string;
  author?: {
    name?: string;
    userName?: string;
  };
  createdAt?: string;
  likeCount?: number;
  replyCount?: number;
  retweetCount?: number;
  media?: string[];
  isReply?: boolean;
}

/**
 * 특정 트윗 URL에서 본문 + 댓글 가져오기
 */
export async function scrapeTwitterPost(
  tweetUrl: string,
  maxReplies: number = 50
): Promise<{ content: string; author: string | null }> {
  try {
    // 트윗 ID 추출
    const tweetId = extractTweetId(tweetUrl);
    if (!tweetId) {
      return { content: "", author: null };
    }

    // conversationIds를 사용하여 트윗 + 댓글 가져오기
    const results = await runActorAndGetResults<TwitterTweet>(
      "apidojo/tweet-scraper",
      {
        conversationIds: [tweetId],
        maxItems: maxReplies + 1, // 본문 + 댓글
      },
      maxReplies + 1
    );

    if (results.length === 0) {
      return { content: "", author: null };
    }

    // 원본 트윗 찾기 (conversationId가 자신의 id와 같은 것)
    const originalTweet = results.find(
      (t) => t.id === tweetId || t.conversationId === tweetId && !t.isReply
    ) || results[0];

    const mainContent = originalTweet.fullText || originalTweet.text || "";
    const author = originalTweet.author?.name || originalTweet.author?.userName || null;

    // 댓글 합치기 (원본 제외)
    let fullContent = `[본문]\n${mainContent}`;

    const replies = results.filter((t) => t.id !== originalTweet.id && t.isReply);
    if (replies.length > 0) {
      fullContent += "\n\n[댓글]";
      for (const reply of replies) {
        const replyAuthor = reply.author?.name || reply.author?.userName || "익명";
        const replyText = reply.fullText || reply.text || "";
        const likes = reply.likeCount || 0;
        fullContent += `\n- @${replyAuthor} (좋아요 ${likes}): ${replyText}`;
      }
    }

    return { content: fullContent, author };
  } catch (error) {
    console.error("Twitter post scrape failed:", error);
    return { content: "", author: null };
  }
}

/**
 * Twitter 핸들로 트윗 스크랩 (목록용)
 */
export async function scrapeTwitterByHandle(
  handle: string,
  maxItems: number = 20
): Promise<ScrapedItem[]> {
  const cleanHandle = handle.replace("@", "").trim();

  const results = await runActorAndGetResults<TwitterTweet>(
    "apidojo/tweet-scraper",
    {
      twitterHandles: [cleanHandle],
      maxItems,
      sort: "Latest",
    },
    maxItems
  );

  return results.map((tweet) => ({
    id: tweet.id || "",
    title: null,
    content: tweet.fullText || tweet.text || "",
    author: tweet.author?.name || tweet.author?.userName || cleanHandle,
    url: tweet.id
      ? `https://x.com/${cleanHandle}/status/${tweet.id}`
      : null,
    thumbnail: tweet.media?.[0] || null,
    publishedAt: tweet.createdAt || new Date().toISOString(),
  }));
}

/**
 * Twitter URL에서 핸들 추출
 */
export function extractTwitterHandle(url: string): string | null {
  // https://twitter.com/username 또는 https://x.com/username
  const match = url.match(/(?:twitter\.com|x\.com)\/(@?[\w]+)/i);
  if (match) {
    return match[1].replace("@", "");
  }
  return null;
}

/**
 * 트윗 ID 추출
 */
export function extractTweetId(url: string): string | null {
  // https://twitter.com/user/status/123456 또는 https://x.com/user/status/123456
  const match = url.match(/(?:twitter\.com|x\.com)\/[\w]+\/status\/(\d+)/i);
  if (match) return match[1];
  return null;
}

/**
 * 트윗 URL인지 확인
 */
export function isTwitterPostUrl(url: string): boolean {
  return /(?:twitter\.com|x\.com)\/[\w]+\/status\/\d+/i.test(url);
}
