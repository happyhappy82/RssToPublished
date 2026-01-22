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
  const maxTokens = modelSettings?.maxTokens || 65536; // 사실상 무제한

  // 커스텀 프롬프트(시스템 프롬프트) + 원본 소스
  const userPrompt = customPrompt
    ? `${customPrompt}\n\n원본 소스:\n${originalContent}`
    : `원본 소스:\n${originalContent}`;

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
    console.error("Gemini API error response:", error);
    throw new Error(`Gemini API error (${response.status}): ${error}`);
  }

  const data: GeminiResponse = await response.json();
  console.log("Gemini API response received, candidates:", data.candidates?.length || 0);

  if (!data.candidates || data.candidates.length === 0) {
    console.error("Gemini returned no candidates:", JSON.stringify(data));
    throw new Error("No response from Gemini - empty candidates");
  }

  return data.candidates[0].content.parts[0].text;
}
