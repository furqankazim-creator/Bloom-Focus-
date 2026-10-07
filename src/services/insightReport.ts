import { dateLocale, t } from '../i18n';
/**
 * A colour progress report for one child (for the family or school), from the Insights data.
 * HTML with inline SVG charts, printed or saved as PDF. Practice summaries, not clinical measures.
 */
import type { ChildRow, Insights, Range } from '../engine/insights';
import { RANGE_LABEL } from '../engine/insights';

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
const C = { forest: '#2F5D46', lime: '#D4E98C', ink: '#1E3A2F', soft: '#5E7268', bg: '#F4F2EC', line: '#E3E6DD', coral: '#E2604F' };

function ring(score: number, color: string) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return `<svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" stroke="#E9EEE6" stroke-width="12" fill="none"/><circle cx="60" cy="60" r="${r}" stroke="${color}" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${(c * score) / 100} ${c}" transform="rotate(-90 60 60)"/><text x="60" y="68" text-anchor="middle" font-size="30" font-weight="800" fill="${color}">${score}</text></svg>`;
}

function lineChart(points: (number | null)[], labels: string[], color: string) {
  const w = 560;
  const h = 170;
  const x = (i: number) => 34 + (labels.length <= 1 ? 0 : (i / (labels.length - 1)) * (w - 44));
  const y = (v: number) => 10 + (1 - v) * (h - 36);
  let d = '';
  points.forEach((p, i) => {
    if (p === null) return;
    d += `${d && points[i - 1] !== null ? 'L' : 'M'}${x(i)},${y(p)} `;
  });
  const grid = [0, 0.5, 1].map((t) => `<line x1="34" x2="${w}" y1="${y(t)}" y2="${y(t)}" stroke="${C.line}"/><text x="28" y="${y(t) + 4}" font-size="10" text-anchor="end" fill="${C.soft}">${t * 100}</text>`).join('');
  const dots = points.map((p, i) => (p === null ? '' : `<circle cx="${x(i)}" cy="${y(p)}" r="4" fill="#fff" stroke="${color}" stroke-width="2.5"/>`)).join('');
  const lbl = labels.map((l, i) => (labels.length > 8 && i % 2 ? '' : `<text x="${x(i)}" y="${h - 6}" font-size="10" text-anchor="middle" fill="${C.soft}">${esc(l)}</text>`)).join('');
  return `<svg width="${w}" height="${h}">${grid}<line x1="34" x2="${w}" y1="${y(0.85)}" y2="${y(0.85)}" stroke="#94BA6A" stroke-dasharray="5 4"/><path d="${d}" stroke="${color}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${dots}${lbl}</svg>`;
}

function skillBars(skills: Insights['skills']) {
  const rows = skills.filter((s) => s.now !== null);
  if (!rows.length) return '<p class="muted">No scored games in this period.</p>';
  return rows
    .map((s) => {
      const delta = s.now !== null && s.prev !== null ? s.now - s.prev : null;
      const arrow = delta === null ? '' : delta >= 0.03 ? `<span class="up">▲ ${Math.round(delta * 100)}%</span>` : delta <= -0.03 ? `<span class="down">▼ ${Math.round(-delta * 100)}%</span>` : '<span class="same">●</span>';
      return `<div class="bar"><span class="bl">${esc(s.label)}</span><span class="track"><span style="width:${Math.round((s.now ?? 0) * 100)}%"></span></span><b>${pct(s.now)}</b>${arrow}</div>`;
    })
    .join('');
}

function calendar(days: Insights['calendar'], color: string) {
  const max = Math.max(1, ...days.map((d) => d.minutes));
  const pad = (new Date(days[0].date).getDay() + 6) % 7;
  const cells = [...Array(pad).fill(null), ...days]
    .map((d) => (d ? `<span class="cal" style="background:${d.minutes ? color : '#EEF0EA'};color:${d.minutes ? '#fff' : '#8A9A91'};opacity:${d.minutes ? 0.3 + (0.7 * d.minutes) / max : 1}">${new Date(d.date).getDate()}</span>` : '<span class="cal empty"></span>'))
    .join('');
  return `<div class="calhead">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span>${x}</span>`).join('')}</div><div class="calgrid">${cells}</div>`;
}

export function insightReportHtml(row: ChildRow, ins: Insights, range: Range, therapist: string, color = C.forest, brand: { clinic?: string; signoff?: string } = {}): string {
  const c = row.child;
  const series = ins.series.find((s) => s.childId === c.id);
  const goals = ins.clinic.find((x) => x.childId === c.id);
  const mood = ins.mood.counts.filter((m) => m.count).map((m) => `${({ happy: '😊', calm: '😌', excited: '🤩', tired: '😴', worried: '😟', grumpy: '😠' } as Record<string, string>)[m.feeling]} ${m.count}`).join(' &nbsp; ');
  const wins = ins.alerts.filter((a) => a.childId === c.id && a.tone === 'green').map((a) => `<li>${esc(a.title.replace(/^[^:]+:\s*/, ''))}</li>`).join('');
  const watch = ins.alerts.filter((a) => a.childId === c.id && a.tone !== 'green').map((a) => `<li>${esc(a.title.replace(/^[^:]+:\s*/, ''))}</li>`).join('');
  const next = row.lastVisit?.nextGoal;
  const period = `${new Date(ins.from).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })} – ${new Date(ins.to).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.name)} · Progress report</title><style>
  :root{color-scheme:light}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{background:#fff}body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:${C.ink};margin:0;padding:24px}@page{margin:12mm}
  .head{display:flex;align-items:center;gap:18px;padding:18px 22px;border-radius:24px;background:linear-gradient(120deg,${color},#4F8A69 60%,${C.lime});color:#fff}
  .head h1{margin:0;font-size:28px}.head .sub{opacity:.95;font-size:14px;margin-top:4px}.badge{margin-left:auto;background:#fff;color:${color};border-radius:16px;padding:8px 14px;font-weight:800}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.kpi{background:${C.bg};border-radius:16px;padding:12px 14px}.kpi b{display:block;font-size:22px}.kpi span{font-size:12px;color:${C.soft}}
  .row{display:flex;gap:16px;align-items:center}.card{border:2px solid ${C.line};border-radius:20px;padding:16px;margin-top:14px}
  h2{font-size:16px;margin:0 0 10px;letter-spacing:.3px}.muted{color:${C.soft};font-size:13px}
  .bar{display:flex;align-items:center;gap:10px;margin:7px 0;font-size:13px}.bl{width:170px}.track{flex:1;height:12px;border-radius:6px;background:#EEF0EA;overflow:hidden}.track span{display:block;height:100%;background:${color};border-radius:6px}
  .up{color:#2E9E6B;font-weight:700;font-size:12px}.down{color:${C.coral};font-weight:700;font-size:12px}.same{color:${C.soft}}
  .calhead,.calgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;max-width:330px}.calhead span{text-align:center;font-size:11px;color:${C.soft};font-weight:700}
  .cal{aspect-ratio:1;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:600}.cal.empty{background:transparent}
  ul{margin:4px 0 0 18px;padding:0;font-size:14px;line-height:1.6}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .foot{margin-top:18px;font-size:11px;color:${C.soft};display:flex;justify-content:space-between}
  </style></head><body>
  <div class="head"><div style="font-size:44px">🌸</div><div><h1>${esc(c.name)} · Progress report</h1><div class="sub">${esc(RANGE_LABEL[range])} · ${period} · prepared by ${esc(therapist)}${brand.clinic ? ` · ${esc(brand.clinic)}` : ''}</div></div><span class="badge">${row.bloom.emoji} ${row.bloom.label}</span></div>
  <div class="grid">
    <div class="kpi"><b>${row.practiceDays}</b><span>days practised (plan ${row.planned})</span></div>
    <div class="kpi"><b>${row.minutes} min</b><span>focus time</span></div>
    <div class="kpi"><b>${pct(row.accuracy)}</b><span>accuracy ${row.trend === null ? '' : row.trend >= 0 ? `▲ ${Math.round(row.trend * 100)}%` : `▼ ${Math.round(-row.trend * 100)}%`}</span></div>
    <div class="kpi"><b>${row.levelUps}</b><span>level-ups · ${row.streak}-day streak</span></div>
  </div>
  <div class="row card"><div>${ring(row.bloom.score, color)}</div><div><h2>Bloom score</h2><p class="muted">A friendly summary of accuracy (40%), keeping to the home plan (35%) and how ${esc(c.name.split(' ')[0])} felt before playing (25%). It is a practice signal, not a test score.</p></div></div>
  <div class="card"><h2>Accuracy over time</h2>${series ? lineChart(series.points, ins.bucketLabels, color) : '<p class="muted">No games yet.</p>'}<p class="muted">Dashed line: 85% — games get a little harder after two rounds above it.</p></div>
  <div class="two">
    <div class="card"><h2>Skills</h2>${skillBars(ins.skills)}</div>
    <div class="card"><h2>Practice calendar</h2>${calendar(ins.calendar, color)}<p class="muted" style="margin-top:8px">${mood ? `Feelings before playing: ${mood}` : ''}</p></div>
  </div>
  <div class="two">
    <div class="card"><h2>🌟 Going well</h2>${wins ? `<ul>${wins}</ul>` : '<p class="muted">Keep going — small steps count.</p>'}</div>
    <div class="card"><h2>🎯 To work on</h2>${watch ? `<ul>${watch}</ul>` : '<p class="muted">Nothing needs extra attention right now.</p>'}${next ? `<p><b>Next goal:</b> ${esc(next)}</p>` : ''}${goals ? `<p class="muted">Clinic goals: ${goals.met} met · ${goals.partly} partly · ${goals.notYet} not yet</p>` : ''}</div>
  </div>
  ${brand.signoff ? `<p style="margin-top:16px;font-size:14px;white-space:pre-line">${esc(brand.signoff)}</p>` : ''}
  <div class="foot"><span>${brand.clinic ? `${esc(brand.clinic)} · ` : ''}Bloom Focus · practice summary, not a diagnosis or clinical measure.</span><span>${new Date().toLocaleDateString(dateLocale())}</span></div>
  </body></html>`;
}
