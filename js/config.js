/**
 * 앱 설정
 * - API_KEY: NewsData.io 에서 발급받은 키 (https://newsdata.io/register)
 *   비워두면 화면 우측 상단 '데모 모드' 버튼에서 브라우저에 키를 저장할 수 있습니다.
 *   키가 없으면 데모 데이터로 동작합니다.
 * 주의: 이 파일은 .gitignore 대상입니다. 키가 브라우저에 노출되므로 개인/학습용으로만 사용하세요.
 */
export const CONFIG = {
  API_KEY: '',
  BASE_URL: 'https://newsdata.io/api/1/latest',
  COUNTRY: 'kr',
  LANGUAGE: 'ko',
  PAGE_SIZE: 10,
  STORAGE_KEY_API: 'briefly.apiKey',
  STORAGE_KEY_TOPICS: 'briefly.topics',
};

/**
 * 주제 정의 및 API 파라미터 매핑
 * NewsData.io에는 '증권', '문화' 카테고리가 없으므로 카테고리 + 키워드 조합으로 대체합니다.
 */
export const TOPICS = {
  business: { label: '비즈니스', params: { category: 'business' } },
  stock: { label: '증권', params: { category: 'business', q: '증시 OR 주식 OR 코스피 OR 코스닥' } },
  it: { label: 'IT', params: { category: 'technology' } },
  sports: { label: '스포츠', params: { category: 'sports' } },
  culture: { label: '문화', params: { category: 'entertainment' } },
};
