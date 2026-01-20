# 해외 소스 종합 마케팅 툴 - 기술 스펙 문서

## 1. 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 14.x | App Router 기반 풀스택 프레임워크 |
| React | 18.x | UI 라이브러리 |
| TypeScript | 5.x | 타입 안정성 |
| Tailwind CSS | 3.x | 스타일링 |
| shadcn/ui | latest | UI 컴포넌트 라이브러리 |
| Zustand | 4.x | 클라이언트 상태 관리 |
| React Query | 5.x | 서버 상태 관리 및 캐싱 |

### Backend
| 기술 | 용도 |
|------|------|
| Next.js API Routes | API 엔드포인트 |
| Supabase | PostgreSQL 데이터베이스 + 인증 |
| Vercel Cron | 스케줄링 (2시간 주기 스크래핑) |

### 외부 서비스
| 서비스 | 용도 |
|--------|------|
| Google Gemini API | AI 콘텐츠 가공 (Gemini 3 Flash Preview) |
| Buffer API | SNS 자동 업로드 (Threads, LinkedIn) |
| Apify | 스크래핑 (Twitter, LinkedIn, Threads) |
| YouTube RSS | YouTube 채널 피드 수집 |

---

## 2. 프로젝트 구조

```
blinkad-blog/
├── app/
│   ├── layout.tsx                 # 루트 레이아웃
│   ├── page.tsx                   # 대시보드 홈
│   ├── sources/
│   │   └── page.tsx               # 해외 소스 관리
│   ├── process/
│   │   └── page.tsx               # 글 가공
│   ├── queue/
│   │   └── page.tsx               # 업로드 대기열
│   └── api/
│       ├── sources/
│       │   ├── route.ts           # CRUD API
│       │   └── scrape/
│       │       └── route.ts       # 스크래핑 트리거
│       ├── process/
│       │   └── route.ts           # AI 가공 API
│       ├── prompts/
│       │   └── route.ts           # 프롬프트 CRUD
│       ├── queue/
│       │   └── route.ts           # 대기열 CRUD
│       ├── upload/
│       │   └── route.ts           # Buffer 업로드
│       └── cron/
│           └── scrape/
│               └── route.ts       # Cron Job 엔드포인트
├── components/
│   ├── ui/                        # shadcn/ui 컴포넌트
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Navigation.tsx
│   ├── sources/
│   │   ├── SourceList.tsx
│   │   ├── SourceForm.tsx
│   │   └── ScrapedContentList.tsx
│   ├── process/
│   │   ├── ContentTypeSelect.tsx
│   │   ├── PromptEditor.tsx
│   │   ├── PromptLibrary.tsx
│   │   └── ResultPreview.tsx
│   └── queue/
│       ├── QueueList.tsx
│       ├── QueueItem.tsx
│       └── UploadStatus.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Supabase 클라이언트
│   │   └── types.ts               # DB 타입 정의
│   ├── scrapers/
│   │   ├── youtube.ts             # YouTube RSS 파서
│   │   ├── twitter.ts             # Twitter 스크래퍼 (Apify)
│   │   ├── linkedin.ts            # LinkedIn 스크래퍼 (Apify)
│   │   └── threads.ts             # Threads 스크래퍼 (Apify)
│   ├── ai/
│   │   └── gemini.ts              # Gemini API 클라이언트
│   ├── buffer/
│   │   └── client.ts              # Buffer API 클라이언트
│   └── utils/
│       ├── rss.ts                 # RSS 파싱 유틸
│       └── date.ts                # 날짜 유틸
├── hooks/
│   ├── useSources.ts
│   ├── useScrapedContent.ts
│   ├── usePrompts.ts
│   └── useQueue.ts
├── store/
│   └── index.ts                   # Zustand 스토어
├── types/
│   └── index.ts                   # 공통 타입 정의
├── .env.local                     # 환경 변수
├── vercel.json                    # Vercel 설정 (Cron)
└── package.json
```

---

## 3. 데이터베이스 스키마

### 3.1 sources (해외 계정)
```sql
CREATE TABLE sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(20) NOT NULL,  -- 'twitter' | 'youtube' | 'linkedin' | 'threads'
  account_id VARCHAR(255) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_url TEXT NOT NULL,
  nickname VARCHAR(100),          -- 사용자 지정 별명
  rss_url TEXT,                   -- RSS 피드 URL (YouTube용)
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 scraped_contents (스크랩된 콘텐츠)
```sql
CREATE TABLE scraped_contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  external_id VARCHAR(255),       -- 원본 플랫폼의 게시물 ID
  title TEXT,
  content TEXT NOT NULL,
  author VARCHAR(255),
  original_url TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT NOW(),
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(platform, external_id)   -- 중복 방지
);
```

### 3.3 prompts (저장된 프롬프트)
```sql
CREATE TABLE prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL,  -- 콘텐츠 유형
  prompt_text TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.4 processed_contents (가공된 콘텐츠)
```sql
CREATE TABLE processed_contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scraped_content_id UUID REFERENCES scraped_contents(id),
  content_type VARCHAR(50) NOT NULL,
  prompt_used TEXT,
  original_content TEXT NOT NULL,
  processed_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.5 upload_queue (업로드 대기열)
```sql
CREATE TABLE upload_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  processed_content_id UUID REFERENCES processed_contents(id),
  content TEXT NOT NULL,
  target_platforms TEXT[] NOT NULL,  -- ['threads', 'linkedin']
  status VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'scheduled' | 'uploaded' | 'failed'
  scheduled_at TIMESTAMP,
  uploaded_at TIMESTAMP,
  buffer_post_id VARCHAR(255),        -- Buffer 포스트 ID
  error_message TEXT,
  position INTEGER,                   -- 대기열 순서
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. API 엔드포인트

### 4.1 Sources API
```
GET    /api/sources           # 모든 소스 조회
POST   /api/sources           # 소스 추가
PUT    /api/sources/:id       # 소스 수정
DELETE /api/sources/:id       # 소스 삭제
POST   /api/sources/scrape    # 수동 스크래핑 트리거
```

### 4.2 Scraped Contents API
```
GET    /api/contents          # 스크랩된 콘텐츠 조회 (필터링/페이지네이션)
GET    /api/contents/:id      # 단일 콘텐츠 조회
DELETE /api/contents/:id      # 콘텐츠 삭제
```

### 4.3 Process API
```
POST   /api/process           # AI 콘텐츠 가공
GET    /api/process/types     # 콘텐츠 유형 목록
```

### 4.4 Prompts API
```
GET    /api/prompts           # 프롬프트 목록
POST   /api/prompts           # 프롬프트 저장
PUT    /api/prompts/:id       # 프롬프트 수정
DELETE /api/prompts/:id       # 프롬프트 삭제
```

### 4.5 Queue API
```
GET    /api/queue             # 대기열 조회
POST   /api/queue             # 대기열 추가
PUT    /api/queue/:id         # 대기열 수정 (순서, 예약시간 등)
DELETE /api/queue/:id         # 대기열 삭제
POST   /api/queue/:id/upload  # 즉시 업로드
```

### 4.6 Cron API
```
GET    /api/cron/scrape       # 스케줄 스크래핑 (Vercel Cron)
```

---

## 5. 스크래핑 전략

### 5.1 YouTube (RSS)
```typescript
// RSS 피드 URL 형식
const rssFeedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

// 파싱 라이브러리: rss-parser
```

### 5.2 Twitter/X (Apify)
```typescript
// Apify Actor: apify/twitter-scraper
// 또는 RSSHub: https://rsshub.app/twitter/user/{username}

const input = {
  handles: ["username"],
  maxItems: 20,
};
```

### 5.3 LinkedIn (Apify)
```typescript
// Apify Actor: apify/linkedin-profile-scraper
// 또는 apify/linkedin-posts-scraper

const input = {
  profileUrls: ["https://linkedin.com/in/username"],
  maxPosts: 20,
};
```

### 5.4 Threads (Apify)
```typescript
// Apify Actor: apify/threads-scraper

const input = {
  usernames: ["username"],
  maxPosts: 20,
};
```

---

## 6. AI 연동 (Google Gemini)

### 6.1 설정
```typescript
// lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp"  // Gemini 3 Flash Preview
});
```

### 6.2 콘텐츠 유형별 시스템 프롬프트
```typescript
const contentTypePrompts = {
  lament: `당신은 한국의 스레드/SNS 마케터입니다.
    주어진 해외 콘텐츠를 바탕으로 공감을 이끌어내는 '한탄글' 스타일로 변환해주세요.
    - 어투: ~하네요, ~인 것 같아요 등 부드러운 어미
    - 길이: 3-5문장
    - 마지막에 공감을 유도하는 질문 추가`,

  foreign_case: `당신은 한국의 테크 블로거입니다.
    해외 사례를 한국 독자에게 소개하는 글을 작성해주세요.
    - "해외에서는~" 또는 "미국에서는~" 등의 시작
    - 핵심 인사이트 강조
    - 한국 상황과 비교 또는 시사점 제시`,

  casual: `가벼운 뻘글 스타일로 작성해주세요.
    - 짧고 임팩트 있게
    - 이모지 적절히 사용
    - 친근한 반말 또는 ~요체`,

  insight: `인사이트 정리글로 작성해주세요.
    - 핵심 포인트 3-5개 정리
    - 불릿 포인트 또는 숫자 리스트 활용
    - 마무리에 액션 아이템 제시`,

  question: `질문형 글로 작성해주세요.
    - 호기심을 자극하는 질문으로 시작
    - 간단한 맥락 제공
    - 독자 참여 유도`,

  listicle: `리스트형 정리글로 작성해주세요.
    - "~하는 N가지 방법" 형식
    - 각 항목 간결하게 설명
    - 실용적인 팁 중심`,

  storytelling: `스토리텔링 형식으로 작성해주세요.
    - 상황/배경 설정
    - 전개-절정-결론 구조
    - 감정적 연결 유도`
};
```

---

## 7. Buffer 연동

### 7.1 API 설정
```typescript
// lib/buffer/client.ts
const BUFFER_API_URL = "https://api.bufferapp.com/1";

export async function createPost(content: string, profileIds: string[], scheduledAt?: Date) {
  const response = await fetch(`${BUFFER_API_URL}/updates/create.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      access_token: process.env.BUFFER_ACCESS_TOKEN!,
      text: content,
      profile_ids: profileIds.join(","),
      ...(scheduledAt && { scheduled_at: scheduledAt.toISOString() }),
    }),
  });
  return response.json();
}
```

### 7.2 Buffer 프로필 매핑
```typescript
// 환경 변수로 관리
BUFFER_THREADS_PROFILE_ID=xxx
BUFFER_LINKEDIN_PROFILE_ID=xxx
```

---

## 8. Vercel Cron 설정

### vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/scrape",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

---

## 9. 환경 변수

### .env.local
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Google Gemini
GEMINI_API_KEY=xxx

# Buffer
BUFFER_ACCESS_TOKEN=xxx
BUFFER_THREADS_PROFILE_ID=xxx
BUFFER_LINKEDIN_PROFILE_ID=xxx

# Apify
APIFY_API_TOKEN=xxx

# Cron Secret (보안)
CRON_SECRET=xxx
```

---

## 10. UI/UX 상세

### 10.1 헤더 네비게이션
```
┌─────────────────────────────────────────────────────────────┐
│  🔗 BlinkAd Marketing Tool                                   │
├─────────────────────────────────────────────────────────────┤
│  [해외 소스]    [글 가공]    [업로드 대기열]                    │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 해외 소스 페이지
```
┌─────────────────────────────────────────────────────────────┐
│  해외 소스 관리                              [+ 계정 추가]    │
├─────────────────────────────────────────────────────────────┤
│  필터: [전체 ▼] [Twitter] [YouTube] [LinkedIn] [Threads]     │
├─────────────────────────────────────────────────────────────┤
│  계정 목록                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🎬 @OpenAI (YouTube)     마지막: 2시간 전  [편집][삭제] │  │
│  │ 🐦 @sama (Twitter)       마지막: 2시간 전  [편집][삭제] │  │
│  │ ...                                                   │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  최근 스크랩된 콘텐츠                         [수동 스크랩]   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📝 "GPT-5 is coming..."    @sama    3시간 전          │  │
│  │    [상세보기] [글 가공으로 보내기]                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 글 가공 페이지
```
┌────────────────────────────┬────────────────────────────────┐
│  원본 콘텐츠               │  가공 결과                      │
├────────────────────────────┼────────────────────────────────┤
│  [원본 텍스트 표시 영역]    │  [AI 생성 결과 표시]            │
│                            │                                │
│  ─────────────────────     │  [복사] [재생성]                │
│                            │                                │
│  콘텐츠 유형:              │  [업로드 대기열에 추가]          │
│  [한탄글 ▼]                │                                │
│                            │                                │
│  프롬프트:                 │                                │
│  ┌──────────────────────┐ │                                │
│  │ 추가 지시사항 입력... │ │                                │
│  └──────────────────────┘ │                                │
│  [저장된 프롬프트 ▼]       │                                │
│                            │                                │
│  [생성하기]                │                                │
└────────────────────────────┴────────────────────────────────┘
```

### 10.4 업로드 대기열 페이지
```
┌─────────────────────────────────────────────────────────────┐
│  업로드 대기열                                               │
├─────────────────────────────────────────────────────────────┤
│  필터: [전체 ▼] [대기중] [예약됨] [완료] [실패]               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ≡ 1. "해외에서는 AI가..."                            │  │
│  │    📱 Threads, LinkedIn    ⏰ 예약: 오후 3:00         │  │
│  │    [편집] [즉시 업로드] [삭제]                         │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ≡ 2. "GPT-5 발표 소식이..."                          │  │
│  │    📱 Threads              🟡 대기중                  │  │
│  │    [편집] [즉시 업로드] [삭제]                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. 보안 고려사항

1. **API 키 관리**: 모든 API 키는 환경 변수로 관리, 절대 클라이언트에 노출 금지
2. **Cron 보안**: CRON_SECRET으로 외부 호출 방지
3. **Rate Limiting**: API 호출 제한 구현 (특히 AI, 스크래핑)
4. **입력 검증**: 모든 사용자 입력 sanitize
5. **CORS**: API 라우트 CORS 설정

---

## 12. 성능 최적화

1. **React Query 캐싱**: 스크랩 데이터 캐싱으로 불필요한 재요청 방지
2. **페이지네이션**: 대량 데이터 처리 시 무한 스크롤 또는 페이지네이션
3. **이미지 최적화**: Next.js Image 컴포넌트 활용
4. **API 응답 최적화**: 필요한 필드만 select
