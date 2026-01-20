import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [
      ["media:group", "mediaGroup"],
      ["media:thumbnail", "mediaThumbnail"],
      ["yt:videoId", "videoId"],
      ["yt:channelId", "channelId"],
    ],
  },
});

interface YouTubeVideo {
  id: string;
  title: string;
  content: string;
  author: string;
  url: string;
  thumbnail: string | null;
  publishedAt: string;
}

/**
 * YouTube 채널 ID로 RSS 피드 URL 생성
 */
export function getYouTubeRssUrl(channelId: string): string {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

/**
 * YouTube 채널 URL에서 채널 ID 추출 (동기)
 * 지원 형식:
 * - https://www.youtube.com/channel/UC...
 */
export function extractChannelId(url: string): string | null {
  // channel ID 직접 포함된 경우
  const channelMatch = url.match(/youtube\.com\/channel\/(UC[\w-]+)/);
  if (channelMatch) {
    return channelMatch[1];
  }

  return null;
}

/**
 * YouTube @username URL에서 채널 ID 조회 (비동기)
 * YouTube 페이지를 스크랩하여 채널 ID 추출
 */
export async function resolveChannelId(url: string): Promise<string | null> {
  // 이미 채널 ID 형식이면 바로 반환
  const directId = extractChannelId(url);
  if (directId) return directId;

  // @username 형식 확인
  const usernameMatch = url.match(/youtube\.com\/@([\w.-]+)/);
  if (!usernameMatch) return null;

  try {
    // YouTube 페이지에서 채널 ID 추출
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // 여러 패턴으로 채널 ID 찾기
    const patterns = [
      /"channelId":"(UC[\w-]+)"/,
      /"externalId":"(UC[\w-]+)"/,
      /channel_id=(UC[\w-]+)/,
      /\/channel\/(UC[\w-]+)/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return match[1];
    }

    return null;
  } catch (error) {
    console.error("Failed to resolve YouTube channel ID:", error);
    return null;
  }
}

/**
 * YouTube RSS 피드 파싱
 */
export async function scrapeYouTubeChannel(rssUrl: string): Promise<YouTubeVideo[]> {
  try {
    const feed = await parser.parseURL(rssUrl);

    const videos: YouTubeVideo[] = feed.items.map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mediaGroup = (item as any).mediaGroup;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const videoId = (item as any).videoId;

      // 설명 추출 (media:group > media:description)
      let description = "";
      if (mediaGroup && typeof mediaGroup === "object") {
        const descMatch = JSON.stringify(mediaGroup).match(/"media:description":\s*\["([^"]+)"\]/);
        if (descMatch) {
          description = descMatch[1];
        }
      }

      // 썸네일 URL
      const thumbnail = videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : null;

      return {
        id: videoId || item.guid || item.link || "",
        title: item.title || "",
        content: description || item.contentSnippet || item.title || "",
        author: feed.title || "",
        url: item.link || "",
        thumbnail,
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
      };
    });

    return videos;
  } catch (error) {
    console.error("YouTube scraping error:", error);
    throw new Error(`Failed to scrape YouTube channel: ${error}`);
  }
}

/**
 * 여러 YouTube 채널 스크랩
 */
export async function scrapeMultipleChannels(
  channels: { id: string; rssUrl: string }[]
): Promise<{ channelId: string; videos: YouTubeVideo[] }[]> {
  const results = await Promise.allSettled(
    channels.map(async (channel) => ({
      channelId: channel.id,
      videos: await scrapeYouTubeChannel(channel.rssUrl),
    }))
  );

  return results
    .filter((result) => result.status === "fulfilled")
    .map((result) => (result as PromiseFulfilledResult<{ channelId: string; videos: YouTubeVideo[] }>).value);
}
