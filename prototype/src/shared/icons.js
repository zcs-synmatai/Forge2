const paths = {
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  restore: '<path d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5"/>',
  chat: '<rect x="3" y="3" width="18" height="15" rx="4"/><path d="m9 18 3 3 3-3M8 10h.1M12 10h.1M16 10h.1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  arrow: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  molecule: '<circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="8" r="2.5"/><circle cx="12" cy="17" r="2.5"/><path d="m9.2 8.1 5.3-.1M8.4 9.1l2.5 5.7m4.5-4.7-2.2 4.8"/>',
  flask: '<path d="M9 3h6M10 3v7L4 20h16L14 10V3M7 15h10"/>',
  flow: '<rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M6 9v9h9M9 6h9v9"/>',
  file: '<path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  sort: '<path d="m8 9 4-4 4 4M16 15l-4 4-4-4"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.2"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/>',
  refresh: '<path d="M20 8a9 9 0 1 0 1 8M20 3v6h-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
};

export function icon(name, className = "") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.file}</svg>`;
}
