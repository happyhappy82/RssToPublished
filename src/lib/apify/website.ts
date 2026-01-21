import { runActorAndGetResults } from "./client";

interface WebScraperResult {
  url?: string;
  title?: string;
  text?: string;
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
    author?: string;
    keywords?: string[];
    languageCode?: string;
  };
}

/**
 * Apify를 사용한 웹페이지 본문 스크래핑
 * apify/website-content-crawler Actor 사용
 */
export async function scrapeWebsiteWithApify(
  url: string
): Promise<{ content: string; author: string | null; title: string | null }> {
  try {
    // apify/website-content-crawler Actor 사용
    const results = await runActorAndGetResults<WebScraperResult>(
      "apify/website-content-crawler",
      {
        startUrls: [{ url }],
        maxCrawlPages: 1,
        crawlerType: "playwright:firefox",
        maxCrawlDepth: 0,
        includeUrlGlobs: [],
        excludeUrlGlobs: [],
        proxyConfiguration: {
          useApifyProxy: true,
        },
      },
      1
    );

    if (results.length === 0) {
      // 폴백: cheerio-scraper 시도
      return await scrapeWithCheerio(url);
    }

    const data = results[0];
    const content = data.text || data.markdown || "";
    const author = data.metadata?.author || null;
    const title = data.title || data.metadata?.title || null;

    if (!content || content.length < 50) {
      // 콘텐츠가 부족하면 cheerio-scraper로 재시도
      return await scrapeWithCheerio(url);
    }

    return { content, author, title };
  } catch (error) {
    console.error("Apify website scrape failed:", error);
    // 폴백 시도
    return await scrapeWithCheerio(url);
  }
}

/**
 * 폴백: cheerio-scraper 사용 (더 빠르고 저렴)
 */
async function scrapeWithCheerio(
  url: string
): Promise<{ content: string; author: string | null; title: string | null }> {
  try {
    const results = await runActorAndGetResults<WebScraperResult>(
      "apify/cheerio-scraper",
      {
        startUrls: [{ url }],
        maxRequestsPerCrawl: 1,
        pageFunction: `async function pageFunction(context) {
          const { $, request } = context;

          // 제목 추출
          const title = $('title').text() ||
                       $('h1').first().text() ||
                       $('meta[property="og:title"]').attr('content') || '';

          // 작성자 추출
          const author = $('meta[name="author"]').attr('content') ||
                        $('meta[property="article:author"]').attr('content') ||
                        $('[class*="author"]').first().text() || '';

          // 본문 추출 (여러 선택자 시도)
          let content = '';
          const selectors = [
            'article',
            '[class*="content"]',
            '[class*="article"]',
            '[class*="post"]',
            'main',
            '.entry-content',
            '#content'
          ];

          for (const selector of selectors) {
            const text = $(selector).text();
            if (text && text.length > content.length) {
              content = text;
            }
          }

          // 선택자로 못 찾으면 body 전체
          if (!content || content.length < 100) {
            content = $('body').text();
          }

          // 공백 정리
          content = content.replace(/\\s+/g, ' ').trim();

          return {
            url: request.url,
            title: title.trim(),
            text: content,
            metadata: { author: author.trim() }
          };
        }`,
      },
      1
    );

    if (results.length === 0) {
      return { content: "", author: null, title: null };
    }

    const data = results[0];
    return {
      content: data.text || "",
      author: data.metadata?.author || null,
      title: data.title || null,
    };
  } catch (error) {
    console.error("Cheerio scraper fallback failed:", error);
    return { content: "", author: null, title: null };
  }
}
