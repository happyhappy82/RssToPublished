import type { Platform } from "@/types";

/**
 * URL에서 플랫폼을 자동으로 감지
 * RSS 피드에 여러 플랫폼의 링크가 섞여있을 때 사용
 */
export function detectPlatformFromUrl(url: string): Platform {
  if (!url) return "website";

  const urlLower = url.toLowerCase();

  // YouTube
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
    return "youtube";
  }

  // Twitter/X
  if (urlLower.includes("twitter.com") || urlLower.includes("x.com")) {
    return "twitter";
  }

  // LinkedIn
  if (urlLower.includes("linkedin.com")) {
    return "linkedin";
  }

  // Threads
  if (urlLower.includes("threads.net")) {
    return "threads";
  }

  // 기본값: 일반 웹사이트
  return "website";
}

/**
 * 여러 URL의 플랫폼을 한번에 감지
 */
export function detectPlatformsFromUrls(urls: string[]): Map<string, Platform> {
  const platformMap = new Map<string, Platform>();

  for (const url of urls) {
    platformMap.set(url, detectPlatformFromUrl(url));
  }

  return platformMap;
}

/**
 * 플랫폼별로 URL 그룹화
 */
export function groupUrlsByPlatform(urls: string[]): Record<Platform, string[]> {
  const grouped: Record<Platform, string[]> = {
    youtube: [],
    twitter: [],
    linkedin: [],
    threads: [],
    website: [],
  };

  for (const url of urls) {
    const platform = detectPlatformFromUrl(url);
    grouped[platform].push(url);
  }

  return grouped;
}
