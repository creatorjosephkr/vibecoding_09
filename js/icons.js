/**
 * SVG 아이콘 모음 (Lucide 스타일, stroke 기반)
 * 모든 아이콘은 currentColor를 사용하므로 CSS color로 색상을 제어합니다.
 */
const svg = (paths, size = 20) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const icons = {
  logo: (s = 22) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3.5" stroke="currentColor" stroke-width="1.75"/><path d="M7 9h6M7 12.5h10M7 16h7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/><circle cx="17" cy="9" r="1.6" fill="currentColor"/></svg>`,
  check: (s = 14) => svg('<path d="M20 6 9 17l-5-5"/>', s),
  arrowRight: (s = 18) => svg('<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>', s),
  close: (s = 20) => svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', s),
  external: (s = 16) =>
    svg('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', s),
  clock: (s = 14) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', s),
  newspaper: (s = 28) =>
    svg('<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>', s),
  spinner: (s = 20) =>
    `<svg class="spin" xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity=".18" stroke-width="2.25"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"/></svg>`,
  alert: (s = 18) =>
    svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4.5"/><path d="M12 16h.01"/>', s),
  refresh: (s = 16) =>
    svg('<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/>', s),
  checkCircle: (s = 18) => svg('<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>', s),
  key: (s = 16) =>
    svg('<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8"/><path d="m16 7 3 3"/><path d="m18.5 4.5 2 2"/>', s),
  layers: (s = 16) =>
    svg('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>', s),
};
