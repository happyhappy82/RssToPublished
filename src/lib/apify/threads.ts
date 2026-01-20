import { runActorAndGetResults, ScrapedItem } from "./client";

interface ThreadsPost {
  id?: string;
  text?: string;
  caption?: string;
  username?: string;
  displayName?: string;
  postUrl?: string;
  url?: string;
  timestamp?: string;
  createdAt?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
}

// logical_scrapers/threads-post-scraper 결과 타입
interface ThreadsPostDetail {
  thread?: {
    text?: string;
    username?: string;
    like_count?: number;
    reply_count?: number;
    url?: string;
  };
  replies?: Array<{
    text?: string;
    username?: string;
    like_count?: number;
  }>;
}

/**
 * 특정 Threads 포스트 URL에서 본문 + 연속 포스트 + 댓글 가져오기
 *
 * trantus/threads-post-scraper 사용
 * - 성공률 100%
 * - 더 저렴 ($0.002 vs $0.0025)
 * - nested comments 지원 (연속 포스트 포함)
 */
export async function scrapeThreadsPost(
  postUrl: string
): Promise<{ content: string; author: string | null }> {
  try {
    const results = await runActorAndGetResults<any>(
      "trantus/threads-post-scraper",
      {
        urls: [postUrl],
      },
      1
    );

    if (results.length === 0) {
      return { content: "", author: null };
    }

    const data = results[0];

    // trantus Actor의 출력 구조: { root_post: {...}, comments: [...] }
    const rootPost = data.root_post || {};
    const mainContent = rootPost.text || rootPost.caption || "";
    const author = rootPost.user?.username || null;

    let fullContent = `[본문]\n${mainContent}`;

    // comments 배열 처리
    const comments = data.comments || [];

    // 같은 작성자가 연속으로 쓴 포스트(thread chain) 추출
    const threadPosts: any[] = [];
    const regularComments: any[] = [];

    for (const item of comments) {
      const comment = item.comment || {};
      // 같은 작성자가 메인 포스트에 답글로 쓴 경우 → 연속 포스트
      if (comment.user?.username === author && comment.reply_to_post) {
        threadPosts.push({ comment, replies: item.replies || [] });
      } else {
        regularComments.push({ comment, replies: item.replies || [] });
      }
    }

    // 연속 포스트 처리 (1번, 2번, 3번...)
    if (threadPosts.length > 0) {
      fullContent += "\n\n[연속 포스트]";
      let threadNumber = 1;

      for (const threadPost of threadPosts) {
        const postText = threadPost.comment.text || threadPost.comment.caption || "";
        fullContent += `\n\n${threadNumber}번:\n${postText}`;
        threadNumber++;

        // 연속 포스트의 replies 안에 다음 연속 포스트가 있을 수 있음
        for (const reply of threadPost.replies) {
          if (reply.user?.username === author) {
            const replyText = reply.text || reply.caption || "";
            fullContent += `\n\n${threadNumber}번:\n${replyText}`;
            threadNumber++;
          }
        }
      }
    }

    // 일반 댓글 처리
    if (regularComments.length > 0) {
      fullContent += "\n\n[댓글]";
      for (const item of regularComments) {
        const comment = item.comment;
        const commentAuthor = comment.user?.username || "익명";
        const commentText = comment.text || comment.caption || "";
        const likes = comment.like_count || 0;
        fullContent += `\n- @${commentAuthor} (좋아요 ${likes}): ${commentText}`;

        // 댓글의 대댓글도 포함
        if (item.replies && item.replies.length > 0) {
          for (const reply of item.replies) {
            // 작성자 본인의 답글은 연속 포스트로 이미 처리됨
            if (reply.user?.username !== author) {
              const replyAuthor = reply.user?.username || "익명";
              const replyText = reply.text || reply.caption || "";
              const replyLikes = reply.like_count || 0;
              fullContent += `\n  └ @${replyAuthor} (좋아요 ${replyLikes}): ${replyText}`;
            }
          }
        }
      }
    }

    return { content: fullContent, author };
  } catch (error) {
    console.error("Threads post scrape failed:", error);
    return { content: "", author: null };
  }
}

/**
 * Threads 유저네임으로 포스트 스크랩 (목록용)
 */
export async function scrapeThreadsByUsername(
  username: string,
  maxItems: number = 20
): Promise<ScrapedItem[]> {
  const cleanUsername = username.replace("@", "").trim();

  const results = await runActorAndGetResults<ThreadsPost>(
    "futurizerush/meta-threads-scraper",
    {
      mode: "user",
      username: cleanUsername,
      max_posts: maxItems,
    },
    maxItems
  );

  return results.map((post) => ({
    id: post.id || "",
    title: null,
    content: post.text || post.caption || "",
    author: post.displayName || post.username || cleanUsername,
    url: post.postUrl || post.url || `https://threads.net/@${cleanUsername}`,
    thumbnail: post.imageUrl || post.thumbnailUrl || null,
    publishedAt: post.timestamp || post.createdAt || new Date().toISOString(),
  }));
}

/**
 * Threads URL에서 유저네임 추출
 */
export function extractThreadsUsername(url: string): string | null {
  // https://threads.net/@username
  const match = url.match(/threads\.net\/@?([\w.]+)/i);
  if (match) return match[1];
  return null;
}

/**
 * Threads 포스트 URL인지 확인
 */
export function isThreadsPostUrl(url: string): boolean {
  // https://threads.net/@username/post/xxx
  return /threads\.net\/@[\w.]+\/post\//i.test(url);
}
