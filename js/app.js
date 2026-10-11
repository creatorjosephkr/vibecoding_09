import { CONFIG, TOPICS } from './config.js';
import { icons } from './icons.js';
import { fetchTopicPage, getApiKey, setApiKey, isDemoMode } from './api.js';
import { appendCards, appendSkeletons, removeSkeletons, createBadge } from './feed.js';
import { initModal, openArticle } from './modal.js';

/* ------------------------------------------------------------------
 * 상태
 * ------------------------------------------------------------------ */
const state = {
  selectedTopics: [],
  articles: [],
  seenKeys: new Set(),
  cursors: {},        // { topicKey: nextPage | null }
  rotationIndex: 0,
  isLoading: false,
  isExhausted: false,
  requestId: 0,       // 새 검색 시 이전 응답 무시용
};

/* ------------------------------------------------------------------
 * DOM
 * ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const dom = {
  form: $('topicForm'),
  chips: $('topicChips'),
  submitBtn: $('viewNewsBtn'),
  selectionHint: $('selectionHint'),
  emptyState: $('emptyState'),
  results: $('results'),
  resultsCount: $('resultsCount'),
  resultsTopics: $('resultsTopics'),
  refreshBtn: $('refreshBtn'),
  grid: $('newsGrid'),
  sentinel: $('feedSentinel'),
  feedStatus: $('feedStatus'),
  modeBtn: $('modeBtn'),
  modeLabel: $('modeLabel'),
  settings: $('settingsModal'),
  settingsForm: $('settingsForm'),
  apiKeyInput: $('apiKeyInput'),
  clearKeyBtn: $('clearKeyBtn'),
  toastRegion: $('toastRegion'),
};

/* ------------------------------------------------------------------
 * 초기화
 * ------------------------------------------------------------------ */
function init() {
  renderStaticIcons();
  renderChips();
  restoreSelection();
  updateSelectionUI();
  updateModeUI();
  initModal();
  initSettings();
  initInfiniteScroll();

  dom.chips.addEventListener('change', (e) => {
    // '전체' 칩: 모든 주제를 한 번에 선택/해제
    if (e.target.id === 'topic-all') {
      getCheckboxes().forEach((c) => (c.checked = e.target.checked));
    }
    updateSelectionUI();
    persistSelection();
  });
  dom.form.addEventListener('submit', (e) => {
    e.preventDefault();
    loadInitial();
  });
  dom.refreshBtn.addEventListener('click', () => loadInitial());
}

function renderStaticIcons() {
  document.querySelectorAll('[data-icon]').forEach((node) => {
    const name = node.dataset.icon;
    const size = Number(node.dataset.size) || undefined;
    if (icons[name]) node.insertAdjacentHTML(node.dataset.pos === 'end' ? 'beforeend' : 'afterbegin', icons[name](size));
  });
}

function renderChips() {
  const allChip = `
      <label class="chip chip--all" for="topic-all">
        <input class="chip-input chip-input--all" type="checkbox" id="topic-all">
        <span class="chip-body">
          <span class="chip-check">${icons.check(13)}</span>
          <span class="chip-label">전체</span>
        </span>
      </label>
      <span class="chip-divider" aria-hidden="true"></span>`;

  dom.chips.innerHTML = allChip + Object.entries(TOPICS)
    .map(
      ([key, t]) => `
      <label class="chip chip--${key}" for="topic-${key}">
        <input class="chip-input" type="checkbox" id="topic-${key}" name="topics" value="${key}">
        <span class="chip-body">
          <span class="chip-check">${icons.check(13)}</span>
          <span class="chip-label">${t.label}</span>
        </span>
      </label>`
    )
    .join('');
}

const getCheckboxes = () => [...dom.chips.querySelectorAll('.chip-input:not(.chip-input--all)')];
const getSelected = () => getCheckboxes().filter((c) => c.checked).map((c) => c.value);

function updateSelectionUI() {
  const count = getSelected().length;
  const total = getCheckboxes().length;
  // 개별 주제가 모두 선택되면 '전체'도 자동 선택
  document.getElementById('topic-all').checked = count === total;
  dom.submitBtn.disabled = count === 0;
  dom.selectionHint.textContent =
    count === 0 ? '주제를 하나 이상 선택하세요' : count === total ? '전체 주제 선택됨' : `${count}개 주제 선택됨`;
}

function persistSelection() {
  try { localStorage.setItem(CONFIG.STORAGE_KEY_TOPICS, JSON.stringify(getSelected())); } catch {}
}

function restoreSelection() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY_TOPICS) || '[]');
    getCheckboxes().forEach((c) => (c.checked = saved.includes(c.value)));
  } catch {}
}

/* ------------------------------------------------------------------
 * 기사 병합 (중복 제거)
 * ------------------------------------------------------------------ */
function takeNew(articles) {
  const fresh = [];
  for (const a of articles) {
    const key = a.url || a.id || a.title;
    const titleKey = `t:${a.title}`;
    if (state.seenKeys.has(key) || state.seenKeys.has(titleKey)) continue;
    state.seenKeys.add(key);
    state.seenKeys.add(titleKey);
    fresh.push(a);
  }
  return fresh;
}

const byNewest = (a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || '');

/* ------------------------------------------------------------------
 * 최초 로드: 선택한 주제별 상위 10건
 * ------------------------------------------------------------------ */
async function loadInitial() {
  const topics = getSelected();
  if (!topics.length) return;

  const reqId = ++state.requestId;
  Object.assign(state, {
    selectedTopics: topics,
    articles: [],
    seenKeys: new Set(),
    cursors: {},
    rotationIndex: 0,
    isLoading: true,
    isExhausted: false,
  });

  dom.emptyState.hidden = true;
  dom.results.hidden = false;
  dom.grid.replaceChildren();
  dom.grid.setAttribute('aria-busy', 'true');
  setFeedStatus('idle');
  renderResultsHeader(true);
  appendSkeletons(dom.grid, Math.min(topics.length * 4, 8));
  setSubmitLoading(true);

  const results = await Promise.allSettled(topics.map((t) => fetchTopicPage(t)));
  if (reqId !== state.requestId) return;

  const collected = [];
  results.forEach((r, i) => {
    const topic = topics[i];
    if (r.status === 'fulfilled') {
      state.cursors[topic] = r.value.nextPage;
      collected.push(...r.value.articles);
    } else {
      state.cursors[topic] = null;
      handleError(r.reason, topic);
    }
  });

  const fresh = takeNew(collected).sort(byNewest);
  state.articles.push(...fresh);

  removeSkeletons(dom.grid);
  appendCards(dom.grid, fresh, openArticle);
  dom.grid.setAttribute('aria-busy', 'false');
  setSubmitLoading(false);
  state.isLoading = false;
  renderResultsHeader();

  if (!fresh.length) {
    state.isExhausted = true;
    setFeedStatus(results.every((r) => r.status === 'rejected') ? 'error' : 'none');
    return;
  }
  checkExhausted();

  // 화면이 충분히 채워지지 않은 경우 바로 추가 로드
  requestAnimationFrame(() => {
    if (isSentinelVisible()) loadMore();
  });
}

/* ------------------------------------------------------------------
 * 추가 로드: 주제를 돌아가며 10건 채우기
 * ------------------------------------------------------------------ */
async function loadMore() {
  if (state.isLoading || state.isExhausted || !state.selectedTopics.length) return;

  const reqId = state.requestId;
  state.isLoading = true;
  setFeedStatus('loading');

  const collected = [];
  let attempts = 0;
  const maxAttempts = state.selectedTopics.length * 2;

  while (collected.length < CONFIG.PAGE_SIZE && attempts < maxAttempts) {
    const topic = nextTopicInRotation();
    if (!topic) break;
    attempts++;
    try {
      const { articles, nextPage } = await fetchTopicPage(topic, state.cursors[topic]);
      if (reqId !== state.requestId) return;
      state.cursors[topic] = nextPage;
      collected.push(...takeNew(articles));
    } catch (err) {
      if (reqId !== state.requestId) return;
      state.cursors[topic] = null;
      handleError(err, topic);
      if (err.code === 'RATE_LIMIT' || err.code === 'AUTH') break;
    }
  }

  const batch = collected.slice(0, CONFIG.PAGE_SIZE).sort(byNewest);
  state.articles.push(...batch);
  appendCards(dom.grid, batch, openArticle);
  renderResultsHeader();

  state.isLoading = false;
  setFeedStatus('idle');
  checkExhausted();

  // 감시 요소가 여전히 화면 안에 있으면 Observer가 다시 호출되지 않으므로 직접 이어서 로드
  if (!state.isExhausted && batch.length) {
    requestAnimationFrame(() => {
      if (isSentinelVisible()) loadMore();
    });
  }
}

function nextTopicInRotation() {
  const topics = state.selectedTopics;
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[(state.rotationIndex + i) % topics.length];
    if (state.cursors[topic]) {
      state.rotationIndex = (state.rotationIndex + i + 1) % topics.length;
      return topic;
    }
  }
  return null;
}

function checkExhausted() {
  if (!state.selectedTopics.some((t) => state.cursors[t])) {
    state.isExhausted = true;
    setFeedStatus('end');
  }
}

/* ------------------------------------------------------------------
 * 무한 스크롤
 * ------------------------------------------------------------------ */
function initInfiniteScroll() {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && state.articles.length) loadMore();
    },
    { rootMargin: '0px 0px 400px 0px' }
  );
  observer.observe(dom.sentinel);
}

function isSentinelVisible() {
  const rect = dom.sentinel.getBoundingClientRect();
  return rect.top < window.innerHeight + 400;
}

/* ------------------------------------------------------------------
 * UI 헬퍼
 * ------------------------------------------------------------------ */
function renderResultsHeader(loading = false) {
  dom.resultsCount.textContent = loading ? '불러오는 중' : `${state.articles.length}건`;
  dom.resultsTopics.replaceChildren(...state.selectedTopics.map(createBadge));
}

function setSubmitLoading(on) {
  dom.submitBtn.classList.toggle('is-loading', on);
  dom.submitBtn.setAttribute('aria-busy', String(on));
}

function setFeedStatus(type) {
  const map = {
    idle: '',
    loading: `${icons.spinner(18)}<span>기사를 더 불러오는 중</span>`,
    end: `${icons.checkCircle(18)}<span>모든 기사를 불러왔습니다</span>`,
    none: `${icons.newspaper(22)}<span>표시할 기사가 없습니다. 다른 주제를 선택해 보세요.</span>`,
    error: `${icons.alert(18)}<span>기사를 불러오지 못했습니다.</span>`,
  };
  dom.feedStatus.className = `feed-status feed-status--${type}`;
  dom.feedStatus.innerHTML = map[type] ?? '';
}

function handleError(err, topic) {
  const label = TOPICS[topic]?.label ?? topic;
  const msg = err?.code === 'RATE_LIMIT' || err?.code === 'AUTH'
    ? err.message
    : `${label} 뉴스를 불러오지 못했습니다. ${err?.message ?? ''}`;
  showToast(msg, err?.code === 'AUTH' ? { label: 'API 키 설정', onClick: openSettings } : { label: '다시 시도', onClick: loadInitial });
}

const activeToasts = new Set();
function showToast(message, action) {
  if (activeToasts.has(message)) return;
  activeToasts.add(message);

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="toast-icon">${icons.alert(18)}</span>`;
  const text = document.createElement('span');
  text.className = 'toast-text';
  text.textContent = message;
  toast.append(text);

  if (action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => { dismiss(); action.onClick(); });
    toast.append(btn);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', '알림 닫기');
  close.innerHTML = icons.close(16);
  close.addEventListener('click', dismiss);
  toast.append(close);

  dom.toastRegion.append(toast);
  const timer = setTimeout(dismiss, 6000);

  function dismiss() {
    clearTimeout(timer);
    activeToasts.delete(message);
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 200);
  }
}

/* ------------------------------------------------------------------
 * API 키 설정 / 모드 표시
 * ------------------------------------------------------------------ */
function updateModeUI() {
  const demo = isDemoMode();
  dom.modeBtn.classList.toggle('is-demo', demo);
  dom.modeLabel.textContent = demo ? '데모 모드' : '실시간 뉴스';
}

function openSettings() {
  dom.apiKeyInput.value = getApiKey();
  dom.settings.showModal();
  dom.apiKeyInput.focus();
}

function initSettings() {
  dom.modeBtn.addEventListener('click', openSettings);
  dom.settings.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dom.settings.close()));
  dom.settings.addEventListener('click', (e) => { if (e.target === dom.settings) dom.settings.close(); });

  dom.settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    setApiKey(dom.apiKeyInput.value);
    afterKeyChange();
  });
  dom.clearKeyBtn.addEventListener('click', () => {
    setApiKey('');
    dom.apiKeyInput.value = '';
    afterKeyChange();
  });
}

function afterKeyChange() {
  dom.settings.close();
  updateModeUI();
  if (state.selectedTopics.length) loadInitial();
}

init();
