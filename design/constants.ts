
import { ContentType } from './types';

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  empathy: '한탄글 (공감형)',
  case_study: '외국 사례 소개',
  casual: '뻘글 (가벼운 톤)',
  insight: '인사이트 정리',
  question: '질문형 글',
  listicle: '리스트형 정리',
  storytelling: '스토리텔링형'
};

export const DEFAULT_PROMPTS: Record<ContentType, string> = {
  empathy: "이 내용을 바탕으로 한국 스레드 감성에 맞춰 약간의 한탄과 함께 공감을 유도하는 글을 작성해줘. 반말로 친근하게.",
  case_study: "이 해외 사례를 한국 비즈니스 환경에 적용했을 때의 시사점을 포함하여 링크드인용으로 전문성 있게 정리해줘.",
  casual: "이 내용을 아주 가볍고 재치 있게, 마치 친구에게 말하는 것처럼 짧은 스레드 게시물로 만들어줘.",
  insight: "핵심 인사이트 3가지를 도출하고, 각각의 실천 방안을 제시하는 전문가스러운 링크드인 포스트를 작성해줘.",
  question: "이 주제를 바탕으로 독자들의 참여를 이끌어낼 수 있는 흥미로운 질문과 함께 게시물을 작성해줘.",
  listicle: "이 내용을 5가지 핵심 포인트로 번호를 매겨서 읽기 쉽게 정리해줘. 이모지를 적절히 사용해.",
  storytelling: "이 정보가 하나의 흥미로운 이야기처럼 느껴지도록 기승전결을 갖춘 스토리텔링 방식으로 풀어서 써줘."
};

export const MOCK_SOURCES = [
  { id: '1', platform: 'Twitter', name: '안드레 파시 (Karpathy)', url: 'https://twitter.com/karpathy', status: 'active', lastScraped: '2024-05-20 10:00' },
  { id: '2', platform: 'YouTube', name: 'Two Minute Papers', url: 'https://youtube.com/c/twominutepapers', status: 'active', lastScraped: '2024-05-20 11:30' },
  { id: '3', platform: 'LinkedIn', name: '샘 알트만 (Sam Altman)', url: 'https://linkedin.com/in/samaltman', status: 'active', lastScraped: '2024-05-19 09:00' }
];

export const MOCK_SCRAPED = [
  {
    id: 's1',
    sourceId: '1',
    sourceName: '안드레 파시',
    platform: 'Twitter',
    title: 'LLM 학습 효율화 팁',
    originalText: 'Found some interesting quirks while training a 7B model today. Most people forget to scale the LR linearly with batch size, which leads to instability in the late stages of training...',
    url: 'https://twitter.com/karpathy/status/123',
    createdAt: '2024-05-20T10:05:00Z'
  },
  {
    id: 's2',
    sourceId: '2',
    sourceName: 'Two Minute Papers',
    platform: 'YouTube',
    title: 'OpenAI Sora 기술 분석 결과',
    originalText: 'In this video we analyze the latest technical report of Sora. The consistency of temporal physics is something we have never seen before in generative models. Here are the key takeaways...',
    url: 'https://youtube.com/watch?v=abc',
    createdAt: '2024-05-20T11:45:00Z'
  }
];
