import { CONFIG, TOPICS } from './config.js';

/* ------------------------------------------------------------------
 * API 키 관리 (localStorage > config.js)
 * ------------------------------------------------------------------ */
export function getApiKey() {
  try {
    return localStorage.getItem(CONFIG.STORAGE_KEY_API) || CONFIG.API_KEY || '';
  } catch {
    return CONFIG.API_KEY || '';
  }
}

export function setApiKey(key) {
  if (key) localStorage.setItem(CONFIG.STORAGE_KEY_API, key.trim());
  else localStorage.removeItem(CONFIG.STORAGE_KEY_API);
}

export const isDemoMode = () => !getApiKey();

/* ------------------------------------------------------------------
 * 에러 타입
 * ------------------------------------------------------------------ */
export class NewsApiError extends Error {
  constructor(message, code = 'UNKNOWN') {
    super(message);
    this.code = code;
  }
}

/* ------------------------------------------------------------------
 * 공개 함수: 주제별 한 페이지(최대 10건) 가져오기
 * @returns {Promise<{ articles: Article[], nextPage: string|null }>}
 * ------------------------------------------------------------------ */
export async function fetchTopicPage(topicKey, cursor = null) {
  return isDemoMode() ? fetchDemoPage(topicKey, cursor) : fetchLivePage(topicKey, cursor);
}

/* ------------------------------------------------------------------
 * 실제 API (NewsData.io)
 * ------------------------------------------------------------------ */
async function fetchLivePage(topicKey, cursor) {
  const topic = TOPICS[topicKey];
  const params = new URLSearchParams({
    apikey: getApiKey(),
    country: CONFIG.COUNTRY,
    language: CONFIG.LANGUAGE,
    size: String(CONFIG.PAGE_SIZE),
    ...topic.params,
  });
  if (cursor) params.set('page', cursor);

  let res;
  try {
    res = await fetch(`${CONFIG.BASE_URL}?${params}`);
  } catch {
    throw new NewsApiError('네트워크 연결을 확인해 주세요.', 'NETWORK');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.status !== 'success') {
    const apiCode = data?.results?.code || '';
    if (res.status === 429 || /RateLimit/i.test(apiCode)) {
      throw new NewsApiError('오늘 사용할 수 있는 API 요청 한도를 초과했습니다.', 'RATE_LIMIT');
    }
    if (res.status === 401 || /Unauthorized|ApiKey/i.test(apiCode)) {
      throw new NewsApiError('API 키가 올바르지 않습니다. 설정에서 키를 확인해 주세요.', 'AUTH');
    }
    throw new NewsApiError(data?.results?.message || `요청에 실패했습니다. (${res.status})`, apiCode || 'HTTP');
  }

  return {
    articles: (data.results || []).map((raw) => normalize(raw, topicKey)).filter((a) => a.title),
    nextPage: data.nextPage || null,
  };
}

const PAID_ONLY = /ONLY AVAILABLE IN/i;

function normalize(raw, topicKey) {
  const clean = (v) => (typeof v === 'string' && !PAID_ONLY.test(v) ? v.trim() : '');
  // NewsData.io의 pubDate는 UTC 기준 "YYYY-MM-DD HH:mm:ss"
  const published = raw.pubDate ? new Date(raw.pubDate.replace(' ', 'T') + 'Z') : null;

  return {
    id: raw.article_id || raw.link,
    topic: topicKey,
    title: clean(raw.title),
    description: clean(raw.description),
    content: clean(raw.content),
    imageUrl: raw.image_url || null,
    source: raw.source_name || raw.source_id || '알 수 없는 출처',
    publishedAt: published && !isNaN(published) ? published.toISOString() : null,
    url: raw.link || '',
  };
}

/* ------------------------------------------------------------------
 * 데모 데이터 (API 키가 없을 때 화면 확인용)
 * ------------------------------------------------------------------ */
const DEMO_SOURCES = ['데일리 브리프', '모닝 리포트', '코리아 위클리', '뉴스 라인', '이코노미 투데이'];
const DEMO_PAGES = 3;

const DEMO_POOL = {
  business: {
    subjects: ['국내 유통업계', '중소기업계', '대기업 그룹', '스타트업 업계', '제조업계', '항공업계'],
    actions: ['하반기 투자 계획 확대 발표', 'ESG 경영 전략 전면 재정비', '해외 시장 진출 속도 낸다', '신규 채용 규모 늘린다', '공급망 다변화 본격 착수'],
  },
  stock: {
    subjects: ['코스피', '코스닥', '외국인 투자자', '기관 투자자', '반도체 업종', '2차전지 업종'],
    actions: ['장 초반 강세 흐름 이어가', '변동성 확대 속 관망세', '순매수 전환 기대감 커져', '실적 시즌 앞두고 주목', '금리 발표 앞두고 숨 고르기'],
  },
  it: {
    subjects: ['생성형 AI 서비스', '국내 클라우드 업계', '반도체 업계', '모바일 플랫폼', '보안 업계', '로봇 산업'],
    actions: ['차세대 기술 로드맵 공개', '글로벌 협력 확대 나서', '신규 서비스 출시 임박', '인재 확보 경쟁 치열', '규제 대응 방안 마련'],
  },
  sports: {
    subjects: ['프로야구', 'K리그', '프로농구', '국가대표팀', 'V리그', '프로골프 투어'],
    actions: ['시즌 막판 순위 경쟁 치열', '신예 선수 활약 돋보여', '관중 수 역대 최고 기록', '감독 전술 변화 주목', '부상 선수 복귀 임박'],
  },
  culture: {
    subjects: ['국내 미술관', '공연계', '출판계', '영화계', '지역 문화 축제', '클래식 음악계'],
    actions: ['가을 시즌 대표 프로그램 공개', '관객 참여형 콘텐츠 확대', '신진 작가 발굴 나선다', '해외 교류 행사 잇따라', '온라인 관람 서비스 강화'],
  },
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchDemoPage(topicKey, cursor) {
  await wait(500 + Math.random() * 500);

  const page = cursor ? Number(cursor) : 0;
  const { subjects, actions } = DEMO_POOL[topicKey];
  const total = subjects.length * actions.length; // 30
  const label = TOPICS[topicKey].label;
  const topicOffset = Object.keys(TOPICS).indexOf(topicKey) * 11;

  const articles = Array.from({ length: CONFIG.PAGE_SIZE }, (_, i) => {
    const n = page * CONFIG.PAGE_SIZE + i;
    const idx = (n * 7) % total; // 7과 30은 서로소 → 중복 없이 섞임
    const subject = subjects[idx % subjects.length];
    const action = actions[Math.floor(idx / subjects.length)];
    const minutesAgo = n * 41 + topicOffset + 3;

    return {
      id: `demo-${topicKey}-${n}`,
      topic: topicKey,
      title: `${subject}, ${action}`,
      description: `${subject}의 최근 동향을 정리했습니다. 업계 관계자들은 이번 흐름이 당분간 이어질 것으로 내다보고 있습니다.`,
      content: [
        `${subject}을(를) 둘러싼 ${label} 분야의 흐름이 빠르게 변하고 있다. 관계자들은 "${action}"(이)라는 방향성에 대체로 공감하면서도, 구체적인 실행 방식에 대해서는 다양한 의견을 내놓고 있다.`,
        `전문가들은 단기적인 성과보다 중장기적인 체질 개선이 더 중요하다고 강조한다. 특히 데이터 기반의 의사결정과 이해관계자와의 소통이 핵심 과제로 꼽힌다.`,
        `이 기사는 API 키 없이 화면 구성을 확인할 수 있도록 생성된 데모 콘텐츠입니다. 우측 상단의 '데모 모드' 버튼에서 NewsData.io API 키를 등록하면 실제 뉴스를 불러옵니다.`,
      ].join('\n\n'),
      imageUrl: n % 6 === 4 ? null : `assets/demo/${topicKey}.jpg`,
      source: DEMO_SOURCES[n % DEMO_SOURCES.length],
      publishedAt: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      url: '',
    };
  });

  return { articles, nextPage: page + 1 < DEMO_PAGES ? String(page + 1) : null };
}
