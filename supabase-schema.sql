-- Supabase SQL Schema
-- 이 파일을 Supabase SQL Editor에서 실행하세요

-- 1. sources (해외 계정)
CREATE TABLE IF NOT EXISTS sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('twitter', 'youtube', 'linkedin', 'threads', 'website')),
  account_id VARCHAR(255) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_url TEXT NOT NULL,
  nickname VARCHAR(100),
  rss_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. scraped_contents (스크랩된 콘텐츠)
CREATE TABLE IF NOT EXISTS scraped_contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  external_id VARCHAR(255),
  title TEXT,
  content TEXT NOT NULL,
  author VARCHAR(255),
  original_url TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  is_processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(platform, external_id)
);

-- 3. prompts (저장된 프롬프트)
CREATE TABLE IF NOT EXISTS prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  prompt_text TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. processed_contents (가공된 콘텐츠)
CREATE TABLE IF NOT EXISTS processed_contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scraped_content_id UUID REFERENCES scraped_contents(id) ON DELETE SET NULL,
  content_type VARCHAR(50) NOT NULL,
  prompt_used TEXT,
  original_content TEXT NOT NULL,
  processed_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. upload_queue (업로드 대기열)
CREATE TABLE IF NOT EXISTS upload_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  processed_content_id UUID REFERENCES processed_contents(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  target_platforms TEXT[] NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'uploaded', 'failed')),
  scheduled_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ,
  buffer_post_id VARCHAR(255),
  error_message TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sources_platform ON sources(platform);
CREATE INDEX IF NOT EXISTS idx_sources_is_active ON sources(is_active);
CREATE INDEX IF NOT EXISTS idx_scraped_contents_source_id ON scraped_contents(source_id);
CREATE INDEX IF NOT EXISTS idx_scraped_contents_platform ON scraped_contents(platform);
CREATE INDEX IF NOT EXISTS idx_scraped_contents_is_processed ON scraped_contents(is_processed);
CREATE INDEX IF NOT EXISTS idx_prompts_content_type ON prompts(content_type);
CREATE INDEX IF NOT EXISTS idx_upload_queue_status ON upload_queue(status);
CREATE INDEX IF NOT EXISTS idx_upload_queue_position ON upload_queue(position);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_sources_updated_at ON sources;
CREATE TRIGGER update_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts;
CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_upload_queue_updated_at ON upload_queue;
CREATE TRIGGER update_upload_queue_updated_at
  BEFORE UPDATE ON upload_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 기본 프롬프트 삽입
INSERT INTO prompts (name, content_type, prompt_text, is_default) VALUES
('한탄글 기본', 'lament', '주어진 해외 콘텐츠를 바탕으로 공감을 이끌어내는 한탄글 스타일로 변환해주세요.
- 어투: ~하네요, ~인 것 같아요 등 부드러운 어미
- 길이: 3-5문장
- 마지막에 공감을 유도하는 질문 추가', true),

('외국 사례 소개 기본', 'foreign_case', '해외 사례를 한국 독자에게 소개하는 글을 작성해주세요.
- "해외에서는~" 또는 "미국에서는~" 등의 시작
- 핵심 인사이트 강조
- 한국 상황과 비교 또는 시사점 제시', true),

('뻘글 기본', 'casual', '가벼운 뻘글 스타일로 작성해주세요.
- 짧고 임팩트 있게
- 이모지 적절히 사용
- 친근한 반말 또는 ~요체', true),

('인사이트 정리 기본', 'insight', '인사이트 정리글로 작성해주세요.
- 핵심 포인트 3-5개 정리
- 불릿 포인트 또는 숫자 리스트 활용
- 마무리에 액션 아이템 제시', true),

('질문형 기본', 'question', '질문형 글로 작성해주세요.
- 호기심을 자극하는 질문으로 시작
- 간단한 맥락 제공
- 독자 참여 유도', true),

('리스트형 기본', 'listicle', '리스트형 정리글로 작성해주세요.
- "~하는 N가지 방법" 형식
- 각 항목 간결하게 설명
- 실용적인 팁 중심', true),

('스토리텔링 기본', 'storytelling', '스토리텔링 형식으로 작성해주세요.
- 상황/배경 설정
- 전개-절정-결론 구조
- 감정적 연결 유도', true)
ON CONFLICT DO NOTHING;
