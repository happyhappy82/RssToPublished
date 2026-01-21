import { DEFAULT_CONTENT_TYPES, type ContentTypeItem } from "@/types";

// localStorage 키
const CONTENT_TYPES_STORAGE_KEY = "custom_content_types";

// 콘텐츠 유형 목록 가져오기
export function getContentTypes(): ContentTypeItem[] {
  if (typeof window === "undefined") return DEFAULT_CONTENT_TYPES;

  const saved = localStorage.getItem(CONTENT_TYPES_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_CONTENT_TYPES;
    }
  }
  return DEFAULT_CONTENT_TYPES;
}

// 콘텐츠 유형 저장하기
export function saveContentTypes(types: ContentTypeItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONTENT_TYPES_STORAGE_KEY, JSON.stringify(types));
}

// 콘텐츠 유형 추가
export function addContentType(type: ContentTypeItem): ContentTypeItem[] {
  const types = getContentTypes();
  types.push(type);
  saveContentTypes(types);
  return types;
}

// 콘텐츠 유형 삭제
export function deleteContentType(id: string): ContentTypeItem[] {
  const types = getContentTypes().filter(t => t.id !== id);
  saveContentTypes(types);
  return types;
}

// 콘텐츠 유형 업데이트 (프롬프트 수정 등)
export function updateContentType(id: string, updates: Partial<ContentTypeItem>): ContentTypeItem[] {
  const types = getContentTypes().map(t =>
    t.id === id ? { ...t, ...updates } : t
  );
  saveContentTypes(types);
  return types;
}

// 기본값으로 초기화
export function resetContentTypes(): ContentTypeItem[] {
  saveContentTypes(DEFAULT_CONTENT_TYPES);
  return DEFAULT_CONTENT_TYPES;
}

export const PLATFORM_LABELS = {
  twitter: "Twitter/X",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  threads: "Threads",
};
