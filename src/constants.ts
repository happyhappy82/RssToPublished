import { Search, MapPin, BarChart3 } from 'lucide-react';
import type { ServiceItem, CaseStudy, BlogPost, ChartDataPoint } from './types';

// Updated to a standalone glowing filament bulb against a dark background
export const HERO_IMAGE_URL = "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=2000&auto=format&fit=crop"; 

export const SERVICES: ServiceItem[] = [
  {
    id: 'seo',
    title: '프리미엄 SEO',
    description: '기술적 정교함과 콘텐츠 권위를 바탕으로 구글 첫 페이지를 선점합니다.',
    icon: Search,
  },
  {
    id: 'maps',
    title: '지도 최적화 (Local SEO)',
    description: '지역 검색 결과에서 귀하의 비즈니스가 가장 먼저 선택되도록 만듭니다.',
    icon: MapPin,
  },
  {
    id: 'profile',
    title: '비즈니스 프로필 관리',
    description: '구글 비즈니스 프로필을 체계적으로 관리하여 디지털 평판을 높입니다.',
    icon: BarChart3,
  },
];

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: '1',
    client: '어반 에스테틱',
    metric: '유기적 트래픽',
    value: '+420%',
    description: '6개월 만에 시장 리더로 도약한 성공 사례.',
    colSpan: 2,
  },
  {
    id: '2',
    client: '로펌 파트너스',
    metric: '지도 전화 문의',
    value: '3.5x',
    description: '로컬 지배력 강화 전략 실행.',
    colSpan: 1,
  },
  {
    id: '3',
    client: '테크 솔루션',
    metric: '리드 전환',
    value: '+180%',
    description: '구매 의도가 높은 키워드 타겟팅.',
    colSpan: 1,
  },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    "id": "2ea753ebc013813087f2c97866227bc4",
    "title": "Chat GPT 이름 뜻은 무엇인가요?",
    "category": "General",
    "date": "2026.01.16",
    "excerpt": "",
    "imageUrl": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
    "content": "<p><br/><h2>Chat GPT 이름 뜻은 무엇인가요?</h2></p><p><br/>Chat GPT는 채팅을 뜻하는 Chat과 기술적 기반인 Generative Pre-trained Transformer의 앞 글자를 따서 만든 이름입니다.</p><p><br/>이번 글에서는 ChatGPT 이름 뜻에 대해 말씀드리겠습니다.</p><p><br/><h3>요약</h3><br/><li>Chat은 사용자와 주고받는 대화형 인터페이스를 의미합니다.</li><br/><li>GPT는 생성(Generative) 사전학습(Pre-trained) 변환기(Transformer)의 약자입니다.</li><br/><li>대규모 데이터를 학습하여 질문에 적절한 문장을 만들어내는 언어 모델 툴입니다.</li></p><p><h3>핵심 체크리스트</h3><br/><li>Chat: 실시간 대화가 가능한 서비스 형태</li><br/><li>Generative: 데이터를 바탕으로 새로운 텍스트를 생성하는 능력</li><br/><li>Pre-trained: 방대한 양의 정보를 미리 학습한 상태</li><br/><li>Transformer: 문장 속 단어 간의 관계를 파악하는 딥러닝 알고리즘</li><br/><li>개발사: 미국의 인공지능 연구소 OpenAI</li></p><p><h3>도입부</h3></p><p><br/>많은 분이 일상에서 이 서비스를 사용하고 있지만 정확한 명칭의 의미를 모르는 경우가 많습니다. 단순히 대화하는 프로그램으로 생각하기 쉽지만 이름 속에는 이 툴이 작동하는 핵심 원리가 모두 담겨 있습니다. 각 단어가 상징하는 기술적 배경을 이해하면 서비스의 특성을 파악하는 데 도움이 됩니다.</p><p><br/><h3>Chat GPT 명칭의 정의와 결론</h3></p><p><br/>Chat GPT 이름 뜻은 서비스의 형태와 기술 구조를 결합한 형태입니다. Chat은 사용자가 텍스트를 입력하고 결과값을 받는 대화 방식을 설명합니다. 뒤에 붙은 GPT는 이 서비스의 두뇌 역할을 하는 기술 이름입니다. 방대한 텍스트 데이터를 미리 공부하고 이를 바탕으로 문맥에 맞는 답변을 생성하는 원리를 담고 있습니다. 이는 단순한 검색 엔진이 아니라 학습된 데이터를 조합하여 새로운 문장을 구성하는 생성형 모델임을 나타냅니다. </p><p><br/><h3>GPT 구성 요소 상세 비교</h3></p><p><br/>| 구분   | 풀 네임        | 주요 기능 및 특징                         |<br/>| ---- | ----------- | ---------------------------------- |<br/>| G    | Generative  | 학습한 통계적 확률에 따라 다음 단어를 예측하여 문장을 생성함 |<br/>| P    | Pre-trained | 대규모 데이터셋을 통해 언어의 구조와 지식을 미리 습득함    |<br/>| T    | Transformer | 문장 내 단어의 거리에 상관없이 문맥을 파악하는 신경망 구조  |<br/>| 서비스명 | Chat GPT    | 위 기술을 활용하여 대화형으로 제공되는 소프트웨어 툴      |</p><p><br/>*표를 통해 GPT가 생성 기능과 사전 학습 그리고 특정 알고리즘의 결합임을 알 수 있습니다.</p><p><br/><h3>기술적 특징과 주의사항</h3></p><p><br/>GPT 모델은 텍스트의 패턴을 분석하여 자연스러운 응답을 내놓는 데 특화되어 있습니다. 하지만 이 과정에서 몇 가지 확인해야 할 사항이 있습니다.<br/><li>데이터 학습 시점에 따라 최신 정보 반영이 늦어질 수 있습니다.</li><br/><li>존재하지 않는 정보를 사실인 것처럼 말하는 환각 현상이 발생하기도 합니다.</li><br/><li>입력한 정보가 학습에 활용될 수 있으므로 민감한 데이터 입력은 지양해야 합니다.</li><br/><li>논리적 추론보다는 확률적인 단어 조합에 기반하여 답변을 구성합니다.</li><br/><li>사용자는 결과물을 그대로 믿기보다 사실 관계를 직접 검토하는 과정이 필요합니다.</li></p><p><h3>마무리하며</h3></p><p><br/>이번 글에서는 Chat GPT 이름 뜻에 대해 알아보았습니다.  다음에도 도움이 되는 내용으로 찾아오겠습니다. 끝까지 읽어주셔서 고맙습니다.</p><p><br/><h3>Q&A</h3></p><p><br/>Q. GPT 뒤에 붙는 숫자는 무엇을 의미하나요?</p><p><br/>A. 숫자는 해당 언어 모델의 버전을 뜻합니다. 숫자가 높을수록 더 많은 데이터를 학습하고 복잡한 연산을 수행할 수 있는 성능을 갖췄음을 의미합니다.</p><p><br/>Q. Transformer 기술은 왜 중요한가요?</p><p><br/>A. 문장 전체의 문맥을 한꺼번에 파악하는 효율적인 알고리즘이기 때문입니다. 기존 방식보다 긴 문장을 더 정확하게 이해하고 처리하는 데 기여합니다.</p><p><br/>Q. 생성형 모델은 검색 엔진과 어떻게 다른가요?</p><p><br/>A. 검색 엔진은 저장된 웹 페이지 링크를 찾아주는 역할을 합니다. 반면 생성형 모델은 학습한 지식을 바탕으로 직접 문장을 써서 답변을 제공하는 차이가 있습니다.</p><p><br/>Q. Pre-trained 과정에는 어떤 데이터가 사용되나요?</p><p><br/>A. 인터넷 기사나 책 그리고 위키피디아 등 공개된 방대한 텍스트 자료가 사용됩니다. 이를 통해 문법과 일반적인 상식을 스스로 습득하게 됩니다.</p><p><br/>Q. 이름에 왜 AI라는 단어가 직접 들어가지 않나요?</p><p><br/>A. GPT 자체가 이미 인공지능의 한 종류인 대규모 언어 모델을 지칭하기 때문입니다. 기술적 정체성을 더 구체적으로 표현하기 위해 특정 알고리즘 명칭을 사용한 것으로 보입니다.</p><p></p>"
  }
];

export const CHART_DATA: ChartDataPoint[] = [
  { month: '1월', traffic: 1200 },
  { month: '2월', traffic: 1900 },
  { month: '3월', traffic: 2400 },
  { month: '4월', traffic: 3800 },
  { month: '5월', traffic: 5100 },
  { month: '6월', traffic: 8500 },
];