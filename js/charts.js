import { esc } from './utils.js';
export function lineChart(values, { height = 120, color = 'cyan', labels = true } = {}) {
  const data = values.length ? values : [0, 0], max = Math.max(1, ...data), w = 700, h = height - 22;
  const points = data.map((v, i) => `${(i / (data.length - 1 || 1) * w).toFixed(1)},${(h - v / max * (h - 12)).toFixed(1)}`);
  return `<svg class="line-chart ${color}" viewBox="0 0 ${w} ${height}" preserveAspectRatio="none" role="img" aria-label="Event rate chart; peak ${max.toFixed(1)} events per second"><path class="chart-grid" d="M0 12H700M0 ${h / 2}H700M0 ${h}H700"/><path class="chart-fill" d="M0 ${h} L${points.join(' L')} L700 ${h}Z"/><polyline class="chart-line" points="${points.join(' ')}"/>${labels ? `<text x="0" y="${height - 1}">EARLIER</text><text x="655" y="${height - 1}">NOW</text>` : ''}</svg>`;
}
export function bars(items, total) {
  const max = total || Math.max(1, ...items.map(x => x.value));
  return `<div class="bar-chart">${items.map(x => `<div class="bar-row"><div><span>${esc(x.name)}</span><b>${esc(x.value)}</b></div><svg viewBox="0 0 100 4" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="4" class="bar-track"/><rect width="${Math.max(0, Math.min(100, x.value / max * 100))}" height="4" class="bar-value ${x.color || 'cyan'}"/></svg></div>`).join('')}</div>`;
}
export function metrics(state) {
  const reviewed = state.alerts.filter(a => a.analysis), active = state.alerts.filter(a => !a.decision && a.state !== 'Suppressed');
  const labeled = reviewed.filter(a => a.truth !== 'unlabeled');
  const correct = labeled.filter(a => (a.truth === 'benign') === (a.analysis.classification === 'False positive')).length;
  return { active, reviewed, labeled, correct, suppressed: reviewed.filter(a => a.analysis.classification === 'False positive').length, analysisTime: reviewed.length ? (reviewed.reduce((n, a) => n + a.analysisTime, 0) / reviewed.length).toFixed(1) : '—', eps: state.events.filter(e => Date.now() - Date.parse(e.timestamp) < 5000).length / 5 };
}
