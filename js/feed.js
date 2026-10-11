import { TOPICS } from './config.js';
import { icons } from './icons.js';

/* ------------------------------------------------------------------
 * 유틸
 * ------------------------------------------------------------------ */
const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' });

export function formatRelative(iso) {
  if (!iso) return '';
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60) return '방금 전';
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), 'day');
  return formatDate(iso);
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('ko', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

/** 주제 배지 */
export function createBadge(topicKey) {
  const badge = el('span', `badge badge--${topicKey}`, TOPICS[topicKey]?.label ?? topicKey);
  return badge;
}

/** 이미지가 없거나 깨졌을 때 표시할 대체 영역 */
export function createImageFallback(topicKey) {
  const box = el('div', `media-fallback media-fallback--${topicKey}`);
  box.innerHTML = icons.newspaper(32);
  return box;
}

/** 이미지 + 실패 시 대체 영역 */
export function createMedia(article, className = 'card-img') {
  if (!article.imageUrl) return createImageFallback(article.topic);
  const img = el('img', className);
  img.src = article.imageUrl;
  img.alt = article.title;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  img.addEventListener('error', () => img.replaceWith(createImageFallback(article.topic)), { once: true });
  return img;
}

/* ------------------------------------------------------------------
 * 카드
 * ------------------------------------------------------------------ */
function createCard(article, index, onRead) {
  const card = el('article', 'card');
  card.style.setProperty('--i', index % 10);
  card.dataset.id = article.id;

  // 이미지 영역
  const media = el('div', 'card-media');
  media.append(createMedia(article), createBadge(article.topic));

  // 본문 영역
  const body = el('div', 'card-body');

  const meta = el('div', 'card-meta');
  meta.append(el('span', 'card-source', article.source));
  if (article.publishedAt) {
    const time = el('time', 'card-time');
    time.dateTime = article.publishedAt;
    time.innerHTML = icons.clock(13);
    time.append(formatRelative(article.publishedAt));
    meta.append(time);
  }

  const title = el('h3', 'card-title', article.title);
  const desc = article.description ? el('p', 'card-desc', article.description) : null;

  const footer = el('div', 'card-footer');
  const btn = el('button', 'btn-read');
  btn.type = 'button';
  btn.id = `read-${String(article.id).replace(/[^\w-]/g, '')}`;
  btn.setAttribute('aria-label', `기사 읽기: ${article.title}`);
  btn.append('읽기');
  btn.insertAdjacentHTML('beforeend', icons.arrowRight(16));
  btn.addEventListener('click', () => onRead(article, btn));
  footer.append(btn);

  // 썸네일 클릭 시에도 읽기 모달 열기 (키보드 사용자는 '읽기' 버튼 이용)
  media.classList.add('is-clickable');
  media.setAttribute('aria-hidden', 'true');
  media.addEventListener('click', () => onRead(article, btn));

  body.append(meta, title);
  if (desc) body.append(desc);
  body.append(footer);

  card.append(media, body);
  return card;
}

export function appendCards(grid, articles, onRead) {
  const frag = document.createDocumentFragment();
  articles.forEach((a, i) => frag.append(createCard(a, i, onRead)));
  grid.append(frag);
}

/* ------------------------------------------------------------------
 * 스켈레톤
 * ------------------------------------------------------------------ */
export function appendSkeletons(grid, count) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const sk = el('div', 'card card--skeleton');
    sk.setAttribute('aria-hidden', 'true');
    sk.innerHTML = `
      <div class="card-media sk"></div>
      <div class="card-body">
        <div class="sk sk-line sk-line--xs"></div>
        <div class="sk sk-line"></div>
        <div class="sk sk-line sk-line--md"></div>
        <div class="sk sk-line sk-line--sm"></div>
      </div>`;
    frag.append(sk);
  }
  grid.append(frag);
}

export function removeSkeletons(grid) {
  grid.querySelectorAll('.card--skeleton').forEach((n) => n.remove());
}
