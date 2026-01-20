import { runActorAndGetResults, ScrapedItem } from "./client";

interface LinkedInPost {
  urn?: string;
  url?: string;
  text?: string;
  authorName?: string;
  authorProfilePicture?: string;
  postedAtISO?: string;
  numLikes?: number;
  numComments?: number;
  comments?: LinkedInComment[];
}

interface LinkedInComment {
  text?: string;
  author?: {
    firstName?: string;
    lastName?: string;
    occupation?: string;
  };
}

/**
 * 특정 LinkedIn 포스트 URL에서 본문 + 댓글 가져오기
 */
export async function scrapeLinkedInPost(
  postUrl: string,
  maxComments: number = 50
): Promise<{ content: string; author: string | null }> {
  try {
    const results = await runActorAndGetResults<LinkedInPost>(
      "supreme_coder/linkedin-post",
      {
        urls: [postUrl],
        limitPerSource: 1,
        deepScrape: true,
        scrapeComments: true,
        maxComments: maxComments,
      },
      1
    );

    if (results.length === 0) {
      return { content: "", author: null };
    }

    const post = results[0];
    const mainContent = post.text || "";
    const author = post.authorName || null;

    // 댓글 합치기
    let fullContent = `[본문]\n${mainContent}`;

    if (post.comments && post.comments.length > 0) {
      fullContent += "\n\n[댓글]";
      for (const comment of post.comments) {
        const firstName = comment.author?.firstName || "";
        const lastName = comment.author?.lastName || "";
        const commentAuthor = `${firstName} ${lastName}`.trim() || "익명";
        const commentText = comment.text || "";
        fullContent += `\n- ${commentAuthor}: ${commentText}`;
      }
    }

    return { content: fullContent, author };
  } catch (error) {
    console.error("LinkedIn post scrape failed:", error);
    return { content: "", author: null };
  }
}

/**
 * LinkedIn 프로필/회사 URL로 포스트 스크랩 (목록용)
 */
export async function scrapeLinkedInByUrl(
  profileUrl: string,
  maxItems: number = 20
): Promise<ScrapedItem[]> {
  const results = await runActorAndGetResults<LinkedInPost>(
    "supreme_coder/linkedin-post",
    {
      urls: [profileUrl],
      limitPerSource: maxItems,
      deepScrape: true,
    },
    maxItems
  );

  return results.map((post) => ({
    id: post.urn || "",
    title: null,
    content: post.text || "",
    author: post.authorName || "",
    url: post.url || null,
    thumbnail: post.authorProfilePicture || null,
    publishedAt: post.postedAtISO || new Date().toISOString(),
  }));
}

/**
 * LinkedIn URL에서 프로필/회사 이름 추출
 */
export function extractLinkedInName(url: string): string | null {
  // https://linkedin.com/in/username 또는 https://linkedin.com/company/name
  const inMatch = url.match(/linkedin\.com\/in\/([\w-]+)/i);
  if (inMatch) return inMatch[1];

  const companyMatch = url.match(/linkedin\.com\/company\/([\w-]+)/i);
  if (companyMatch) return companyMatch[1];

  return null;
}

/**
 * LinkedIn 포스트 URL인지 확인
 */
export function isLinkedInPostUrl(url: string): boolean {
  // https://linkedin.com/posts/xxx 또는 https://linkedin.com/feed/update/xxx
  return /linkedin\.com\/(posts|feed\/update)\//i.test(url);
}
