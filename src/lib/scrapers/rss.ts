import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
      ["enclosure", "enclosure"],
    ],
  },
});

export interface RssItem {
  id: string;
  title: string | null;
  content: string;
  author: string | null;
  url: string | null;
  thumbnail: string | null;
  publishedAt: string;
}

/**
 * 범용 RSS 피드 스크래퍼
 * 모든 플랫폼에서 RSS URL이 제공되면 이 함수로 수집
 */
export async function scrapeRssFeed(rssUrl: string): Promise<RssItem[]> {
  try {
    const feed = await parser.parseURL(rssUrl);

    const items: RssItem[] = feed.items.map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyItem = item as any;

      // 썸네일 추출 (여러 형식 지원)
      let thumbnail: string | null = null;
      if (anyItem.mediaThumbnail?.url) {
        thumbnail = anyItem.mediaThumbnail.url;
      } else if (anyItem.mediaContent?.url) {
        thumbnail = anyItem.mediaContent.url;
      } else if (anyItem.enclosure?.url && anyItem.enclosure.type?.startsWith("image")) {
        thumbnail = anyItem.enclosure.url;
      }

      // 콘텐츠 추출 (여러 필드 시도)
      const content =
        item.contentSnippet ||
        item.content ||
        item.summary ||
        anyItem.description ||
        item.title ||
        "";

      return {
        id: item.guid || item.link || item.title || "",
        title: item.title || null,
        content: typeof content === "string" ? content : String(content),
        author: item.creator || feed.title || null,
        url: item.link || null,
        thumbnail,
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
      };
    });

    return items;
  } catch (error) {
    console.error("RSS scraping error:", error);
    throw new Error(`Failed to scrape RSS feed: ${error}`);
  }
}
