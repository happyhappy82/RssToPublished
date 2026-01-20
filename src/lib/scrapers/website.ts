import puppeteer from "puppeteer";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface WebsiteContent {
  title: string | null;
  content: string;
  author: string | null;
  thumbnail: string | null;
}

/**
 * Gemini Vision으로 이미지에서 텍스트 추출
 */
async function extractTextFromImage(
  imageBase64: string,
  url: string
): Promise<{ title: string | null; content: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "placeholder-gemini-key") {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "image/png",
        data: imageBase64,
      },
    },
    `이 웹페이지 스크린샷에서 메인 콘텐츠를 추출해주세요.

URL: ${url}

다음 형식으로 응답해주세요:
---TITLE---
[페이지 제목]
---CONTENT---
[본문 내용 전체 - 광고, 네비게이션, 푸터 제외]

본문이 길면 전체를 추출하되, 핵심 내용 위주로 정리해주세요.
한국어와 영어 모두 그대로 추출하세요.`,
  ]);

  const text = result.response.text();

  // 제목과 본문 파싱
  const titleMatch = text.match(/---TITLE---\s*([\s\S]*?)\s*---CONTENT---/);
  const contentMatch = text.match(/---CONTENT---\s*([\s\S]*?)$/);

  const title = titleMatch ? titleMatch[1].trim() : null;
  const content = contentMatch ? contentMatch[1].trim() : text;

  return { title, content };
}

/**
 * 웹페이지 스크린샷 + Gemini OCR로 본문 추출
 */
export async function scrapeWebpage(url: string): Promise<WebsiteContent | null> {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // 뷰포트 설정
    await page.setViewport({ width: 1280, height: 2000 });

    // 페이지 로드
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // 잠시 대기 (동적 콘텐츠 로딩)
    await new Promise((r) => setTimeout(r, 2000));

    // 스크린샷 촬영 (base64)
    const screenshot = await page.screenshot({
      fullPage: true,
      type: "png",
      encoding: "base64",
    });

    const imageBase64 = screenshot as string;

    // 페이지 메타 정보 추출
    const pageInfo = await page.evaluate(() => {
      const getMeta = (name: string) =>
        document
          .querySelector(`meta[property="${name}"], meta[name="${name}"]`)
          ?.getAttribute("content") || null;

      return {
        ogImage: getMeta("og:image"),
        author: getMeta("author") || getMeta("article:author"),
      };
    });

    await browser.close();
    browser = null;

    // Gemini Vision으로 텍스트 추출
    const { title, content } = await extractTextFromImage(imageBase64, url);

    if (!content || content.length < 50) {
      return null;
    }

    return {
      title,
      content,
      author: pageInfo.author,
      thumbnail: pageInfo.ogImage,
    };
  } catch (error) {
    console.error(`Website scraping failed for ${url}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
