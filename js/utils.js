export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const time = value => new Date(value).toLocaleTimeString('en-GB', { hour12: false });
export const number = value => Number(value || 0).toLocaleString('en-US');
export const badge = (text, type = '') => `<span class="badge ${esc(type || text.toLowerCase().replaceAll(' ', '-'))}">${esc(text)}</span>`;
const paths = {
 shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
 grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 network: '<rect x="9" y="2" width="6" height="5" rx="1"/><rect x="2" y="17" width="6" height="5" rx="1"/><rect x="16" y="17" width="6" height="5" rx="1"/><path d="M12 7v5M5 17v-5h14v5"/>',
 activity: '<path d="M2 12h5l3-8 4 16 3-8h5"/>',
 alert: '<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v1"/>',
 ai: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4z"/>',
 layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 17l10 5 10-5"/>',
 play: '<path d="m8 4 12 8-12 8Z"/>',
 flask: '<path d="M9 3h6m-5 0v7L4 20c-.4.7 0 1 1 1h14c1 0 1.4-.3 1-1l-6-10V3M7 15h10"/>',
 devices: '<rect x="2" y="4" width="14" height="11" rx="1"/><path d="M6 20h8m-4-5v5"/><rect x="17" y="10" width="5" height="11" rx="1"/>',
 chart: '<path d="M4 3v18h18M8 16v-5m5 5V7m5 9V4"/>',
 info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
 search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
 bell: '<path d="M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3Zm4 12h4"/>',
 arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
 chevron: '<path d="m9 5 7 7-7 7"/>',
 expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/>',
 check: '<path d="m5 12 4 4L20 5"/>',
 close: '<path d="m6 6 12 12M6 18 18 6"/>',
 pause: '<path d="M8 4v16M16 4v16"/>',
 refresh: '<path d="M20 7a9 9 0 1 0 1 9M20 2v6h-6"/>',
 server: '<rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/><path d="M6 6h1m-1 11h1m4-11h6m-6 11h6"/>',
 phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 5h4m-3 14h2"/>',
 globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/>',
 download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
};
export const icon = (name, cls = '') => `<svg class="icon ${cls}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
