// 플랫폼 타입
export type Platform = "twitter" | "youtube" | "linkedin" | "threads" | "website";

// 콘텐츠 유형
export type ContentType =
  | "lament"        // 한탄글
  | "foreign_case"  // 외국 사례 소개글
  | "casual"        // 뻘글
  | "insight"       // 인사이트 정리글
  | "question"      // 질문형 글
  | "listicle"      // 리스트형 정리글
  | "storytelling"; // 스토리텔링형

// 업로드 상태
export type UploadStatus = "pending" | "scheduled" | "uploaded" | "failed";

// 해외 소스 (계정)
export interface Source {
  id: string;
  platform: Platform;
  account_id?: string;
  account_name: string;
  account_url: string;
  nickname: string | null;
  rss_url: string | null;
  is_active: boolean;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

// 스크랩된 콘텐츠
export interface ScrapedContent {
  id: string;
  source_id: string;
  platform: Platform;
  external_id: string | null;
  title: string | null;
  content: string;
  author: string | null;
  original_url: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  scraped_at: string;
  is_processed: boolean;
  created_at: string;
  source?: Source;
}

// 저장된 프롬프트
export interface Prompt {
  id: string;
  name: string;
  content_type: ContentType;
  prompt_text: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// 가공된 콘텐츠
export interface ProcessedContent {
  id: string;
  scraped_content_id: string | null;
  content_type: ContentType;
  prompt_used: string | null;
  original_content: string;
  processed_content: string;
  created_at: string;
  scraped_content?: ScrapedContent;
}

// 업로드 대기열
export interface QueueItem {
  id: string;
  processed_content_id: string | null;
  content: string;
  target_platforms: Platform[];
  status: UploadStatus;
  scheduled_at: string | null;
  uploaded_at: string | null;
  buffer_post_id: string | null;
  error_message: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  processed_content?: ProcessedContent;
}

// 콘텐츠 유형 정보
export const CONTENT_TYPES: Record<ContentType, { label: string; description: string }> = {
  lament: { label: "한탄글", description: "공감을 이끌어내는 한탄 스타일" },
  foreign_case: { label: "외국 사례 소개글", description: "해외 사례를 한국에 소개" },
  casual: { label: "뻘글", description: "가벼운 톤의 캐주얼한 글" },
  insight: { label: "인사이트 정리글", description: "핵심 포인트 정리" },
  question: { label: "질문형 글", description: "호기심 자극하는 질문형" },
  listicle: { label: "리스트형 정리글", description: "N가지 방법 형식" },
  storytelling: { label: "스토리텔링형", description: "스토리 구조로 전달" },
};

// 플랫폼 정보
export const PLATFORMS: Record<Platform, { label: string; icon: string; color: string }> = {
  twitter: { label: "Twitter/X", icon: "twitter", color: "#1DA1F2" },
  youtube: { label: "YouTube", icon: "youtube", color: "#FF0000" },
  linkedin: { label: "LinkedIn", icon: "linkedin", color: "#0A66C2" },
  threads: { label: "Threads", icon: "at-sign", color: "#000000" },
  website: { label: "Website", icon: "globe", color: "#6B7280" },
};
