
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async processContent(originalText: string, prompt: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `
          원본 콘텐츠: 
          "${originalText}"

          요청 사항: 
          "${prompt}"

          가이드라인:
          1. 자연스러운 한국어 구어체를 사용하세요.
          2. 대상 플랫폼(링크드인 또는 스레드)의 특성에 맞는 톤앤매너를 유지하세요.
          3. 한국 독자들의 클릭과 참여를 이끌어낼 수 있는 헤드라인을 포함하세요.
          4. 적절한 공백과 이모지를 활용하여 가독성을 높이세요.
        `,
        config: {
          temperature: 0.7,
          topP: 0.95,
        }
      });

      return response.text;
    } catch (error) {
      console.error("Gemini API 오류:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
