import { create } from "zustand";
import type { ScrapedContent, ContentType } from "@/types";

interface ProcessStore {
  // 선택된 원본 콘텐츠
  selectedContent: ScrapedContent | null;
  setSelectedContent: (content: ScrapedContent | null) => void;

  // 선택된 콘텐츠 유형
  selectedContentType: ContentType;
  setSelectedContentType: (type: ContentType) => void;

  // 커스텀 프롬프트
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;

  // 생성된 결과
  generatedResult: string;
  setGeneratedResult: (result: string) => void;

  // 로딩 상태
  isGenerating: boolean;
  setIsGenerating: (loading: boolean) => void;

  // 리셋
  reset: () => void;
}

export const useProcessStore = create<ProcessStore>((set) => ({
  selectedContent: null,
  setSelectedContent: (content) => set({ selectedContent: content }),

  selectedContentType: "foreign_case",
  setSelectedContentType: (type) => set({ selectedContentType: type }),

  customPrompt: "",
  setCustomPrompt: (prompt) => set({ customPrompt: prompt }),

  generatedResult: "",
  setGeneratedResult: (result) => set({ generatedResult: result }),

  isGenerating: false,
  setIsGenerating: (loading) => set({ isGenerating: loading }),

  reset: () =>
    set({
      selectedContent: null,
      selectedContentType: "foreign_case",
      customPrompt: "",
      generatedResult: "",
      isGenerating: false,
    }),
}));
