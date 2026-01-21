import { create } from "zustand";
import type { ScrapedContent, ContentType } from "@/types";

interface ProcessingJob {
  contentId: string;
  status: "processing" | "completed" | "error";
  result?: string;
  error?: string;
  startedAt: number;
}

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

  // 백그라운드 처리 작업 (contentId -> job)
  processingJobs: Record<string, ProcessingJob>;
  startProcessingJob: (contentId: string) => void;
  completeProcessingJob: (contentId: string, result: string) => void;
  failProcessingJob: (contentId: string, error: string) => void;
  getProcessingJob: (contentId: string) => ProcessingJob | undefined;
  clearProcessingJob: (contentId: string) => void;

  // 리셋
  reset: () => void;
}

export const useProcessStore = create<ProcessStore>((set, get) => ({
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

  // 백그라운드 처리 작업
  processingJobs: {},

  startProcessingJob: (contentId) => set((state) => ({
    processingJobs: {
      ...state.processingJobs,
      [contentId]: {
        contentId,
        status: "processing",
        startedAt: Date.now(),
      },
    },
  })),

  completeProcessingJob: (contentId, result) => set((state) => ({
    processingJobs: {
      ...state.processingJobs,
      [contentId]: {
        ...state.processingJobs[contentId],
        status: "completed",
        result,
      },
    },
  })),

  failProcessingJob: (contentId, error) => set((state) => ({
    processingJobs: {
      ...state.processingJobs,
      [contentId]: {
        ...state.processingJobs[contentId],
        status: "error",
        error,
      },
    },
  })),

  getProcessingJob: (contentId) => get().processingJobs[contentId],

  clearProcessingJob: (contentId) => set((state) => {
    const { [contentId]: _, ...rest } = state.processingJobs;
    return { processingJobs: rest };
  }),

  reset: () =>
    set({
      selectedContent: null,
      selectedContentType: "foreign_case",
      customPrompt: "",
      generatedResult: "",
      isGenerating: false,
    }),
}));
