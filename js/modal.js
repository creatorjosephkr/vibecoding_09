import { icons } from './icons.js';
import { createBadge, createMedia, formatDate } from './feed.js';

/**
 * 기사 본문 팝업 (<dialog> 기반)
 * - ESC, 배경 클릭, 닫기 버튼으로 닫힘
 * - 열려 있는 동안 배경 스크롤 잠금
 * - 닫힐 때 '읽기' 버튼으로 포커스 복귀
 */
let dialog, mediaBox, metaBox, titleEl, bodyEl, sourceLink, lastTrigger;

export function initModal() {
  dialog = document.getElementById('articleModal');
  mediaBox = document.getElementById('modalMedia');
  metaBox = document.getElementById('modalMeta');
  titleEl = document.getElementById('modalTitle');
  bodyEl = document.getElementById('modalBody');
  sourceLink = document.getElementById('modalSourceLink');

  document.getElementById('modalCloseBtn').innerHTML = icons.close(20);
  sourceLink.insertAdjacentHTML('beforeend', icons.external(16));

  dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeArticle));

  // 배경(dialog 자체) 클릭 시 닫기
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeArticle();
  });

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('is-locked');
    lastTrigger?.focus({ preventScroll: true });
  });
}

export function openArticle(article, trigger) {
  lastTrigger = trigger;

  // 이미지
  mediaBox.replaceChildren(createMedia(article, 'modal-img'));

  // 메타 정보
  const source = document.createElement('span');
  source.className = 'modal-source';
  source.textContent = article.source;
  metaBox.replaceChildren(createBadge(article.topic), source);
  if (article.publishedAt) {
    const time = document.createElement('time');
    time.className = 'modal-time';
    time.dateTime = article.publishedAt;
    time.innerHTML = icons.clock(14);
    time.append(formatDate(article.publishedAt));
    metaBox.append(time);
  }

  // 제목 + 본문
  titleEl.textContent = article.title;
  const text = article.content || article.description;
  const paragraphs = text
    ? text.split(/\n{2,}|\n/).map((t) => t.trim()).filter(Boolean)
    : ['이 기사는 본문 미리보기를 제공하지 않습니다. 원문에서 전체 내용을 확인해 주세요.'];
  bodyEl.replaceChildren(
    ...paragraphs.map((t) => {
      const p = document.createElement('p');
      p.textContent = t;
      return p;
    })
  );

  // 원문 링크
  if (article.url) {
    sourceLink.href = article.url;
    sourceLink.removeAttribute('aria-disabled');
    sourceLink.tabIndex = 0;
  } else {
    sourceLink.removeAttribute('href');
    sourceLink.setAttribute('aria-disabled', 'true');
    sourceLink.tabIndex = -1;
  }

  document.documentElement.classList.add('is-locked');
  dialog.showModal();
  dialog.querySelector('.modal-scroll').scrollTop = 0;
}

export function closeArticle() {
  if (!dialog.open) return;
  dialog.classList.add('is-closing');
  const done = () => {
    dialog.classList.remove('is-closing');
    dialog.close();
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  reduce ? done() : setTimeout(done, 180);
}
