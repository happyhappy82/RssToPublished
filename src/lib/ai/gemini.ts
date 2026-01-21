const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface ModelSettings {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GenerateContentParams {
  originalContent: string;
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

  // 커스텀 프롬프트만 사용
  const userPrompt = customPrompt
    ? `[작성 지침]\n${customPrompt}\n\n[원본 콘텐츠]\n${originalContent}`
    : `[원본 콘텐츠]\n${originalContent}`;

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
