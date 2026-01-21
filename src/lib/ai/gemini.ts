import type { ContentType } from "@/types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// 콘텐츠 유형별 시스템 프롬프트
const contentTypePrompts: Record<ContentType, string> = {
  lament: `당신은 한국의 스레드/SNS 마케터입니다.
주어진 해외 콘텐츠를 바탕으로 공감을 이끌어내는 '한탄글' 스타일로 변환해주세요.
- 어투: ~하네요, ~인 것 같아요 등 부드러운 어미
- 길이: 3-5문장
- 마지막에 공감을 유도하는 질문 추가
- 한국어로 작성`,

  foreign_case: `당신은 한국의 테크 블로거입니다.
해외 사례를 한국 독자에게 소개하는 글을 작성해주세요.
- "해외에서는~" 또는 "미국에서는~" 등의 시작
- 핵심 인사이트 강조
- 한국 상황과 비교 또는 시사점 제시
- 한국어로 작성`,

  casual: `가벼운 뻘글 스타일로 작성해주세요.
- 짧고 임팩트 있게
- 이모지 적절히 사용
- 친근한 반말 또는 ~요체
- 한국어로 작성`,

  insight: `인사이트 정리글로 작성해주세요.
- 핵심 포인트 3-5개 정리
- 불릿 포인트 또는 숫자 리스트 활용
- 마무리에 액션 아이템 제시
- 한국어로 작성`,

  question: `질문형 글로 작성해주세요.
- 호기심을 자극하는 질문으로 시작
- 간단한 맥락 제공
- 독자 참여 유도
- 한국어로 작성`,

  listicle: `리스트형 정리글로 작성해주세요.
- "~하는 N가지 방법" 형식
- 각 항목 간결하게 설명
- 실용적인 팁 중심
- 한국어로 작성`,

  storytelling: `스토리텔링 형식으로 작성해주세요.
- 상황/배경 설정
- 전개-절정-결론 구조
- 감정적 연결 유도
- 한국어로 작성`,
};

interface ModelSettings {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GenerateContentParams {
  originalContent: string;
  contentType: ContentType;
  customPrompt?: string;
  modelSettings?: ModelSettings;
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

export async function generateContent({
  originalContent,
  contentType,
  customPrompt,
  modelSettings,
}: GenerateContentParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const model = modelSettings?.model || "gemini-3-flash-preview";
  const temperature = modelSettings?.temperature ?? 0.8;
  const maxTokens = modelSettings?.maxTokens || 1024;

  const systemPrompt = contentTypePrompts[contentType];
  // 커스텀 프롬프트가 있으면 커스텀 프롬프트만 사용 (기본 프롬프트 무시)
  const userPrompt = customPrompt
    ? `[작성 지침]\n${customPrompt}\n\n[원본 콘텐츠]\n${originalContent}`
    : `[작성 지침]\n${systemPrompt}\n\n[원본 콘텐츠]\n${originalContent}`;

  const apiUrl = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: userPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data: GeminiResponse = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("No response from Gemini");
  }

  return data.candidates[0].content.parts[0].text;
}

export { contentTypePrompts };
