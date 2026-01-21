// 플랫폼 타입
export type Platform = "twitter" | "youtube" | "linkedin" | "threads" | "website";

// 콘텐츠 유형 (동적으로 관리 가능)
export type ContentType = string;

// 콘텐츠 유형 아이템
export interface ContentTypeItem {
  id: string;
  label: string;
  prompt: string;
}

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
  category: string | null;  // 분야 (AI, 경제, 마케팅 등)
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
  is_used: boolean;  // 사용 여부
  category: string | null;  // 분야 (소스에서 상속)
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

// 기본 콘텐츠 유형 (초기값)
export const DEFAULT_CONTENT_TYPES: ContentTypeItem[] = [
  { id: "lament", label: "한탄글 (공감형)", prompt: "이 내용을 바탕으로 한국 스레드 감성에 맞춰 약간의 한탄과 함께 공감을 유도하는 글을 작성해줘. 반말로 친근하게." },
  { id: "foreign_case", label: "외국 사례 소개", prompt: "이 해외 사례를 한국 비즈니스 환경에 적용했을 때의 시사점을 포함하여 링크드인용으로 전문성 있게 정리해줘." },
  { id: "casual", label: "뻘글 (가벼운 톤)", prompt: "이 내용을 아주 가볍고 재치 있게, 마치 친구에게 말하는 것처럼 짧은 스레드 게시물로 만들어줘." },
  { id: "insight", label: "인사이트 정리", prompt: "핵심 인사이트 3가지를 도출하고, 각각의 실천 방안을 제시하는 전문가스러운 링크드인 포스트를 작성해줘." },
  { id: "question", label: "질문형 글", prompt: "이 주제를 바탕으로 독자들의 참여를 이끌어낼 수 있는 흥미로운 질문과 함께 게시물을 작성해줘." },
  { id: "listicle", label: "리스트형 정리", prompt: "이 내용을 5가지 핵심 포인트로 번호를 매겨서 읽기 쉽게 정리해줘. 이모지를 적절히 사용해." },
  { id: "storytelling", label: "스토리텔링형", prompt: "이 정보가 하나의 흥미로운 이야기처럼 느껴지도록 기승전결을 갖춘 스토리텔링 방식으로 풀어서 써줘." },
];

// 플랫폼 정보
export const PLATFORMS: Record<Platform, { label: string; icon: string; color: string }> = {
  twitter: { label: "Twitter/X", icon: "twitter", color: "#1DA1F2" },
  youtube: { label: "YouTube", icon: "youtube", color: "#FF0000" },
  linkedin: { label: "LinkedIn", icon: "linkedin", color: "#0A66C2" },
  threads: { label: "Threads", icon: "at-sign", color: "#000000" },
  website: { label: "Website", icon: "globe", color: "#6B7280" },
};
