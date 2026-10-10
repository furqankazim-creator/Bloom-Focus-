/**
 * Colour printable sheets for every Skill Builder, in the style of the therapist's worksheets
 * but with each activity's own colours. Each call makes a fresh sheet (seeded) as HTML with
 * inline SVG, ready for expo-print (or the browser's print dialog on web).
 */
import { FAMILY, LEVEL_NAMES, type LibraryFamilyId } from './catalog';
import { P3, P4, P5, type Seg } from './patterns';
import { configFor, type LevelConfig, type LibraryCustom } from './settings';
import { getLang } from '../i18n';
import { COLOUR_HEX, CONTAINER_EMOJI, instructionText, linksFor, whichIs } from './speech/data';
import { OBJ_SHAPE, listenRounds, oddRounds, questionRounds, sayItDeck, soundRounds, storyRounds } from './speech/rounds';

type C = LevelConfig;

type R = () => number;
function rng(seed: number): R {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const ri = (lo: number, hi: number, r: R) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(xs: T[], r: R) => xs[Math.floor(r() * xs.length)];
const shuffle = <T,>(xs: T[], r: R) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

const PAL = { red: '#E5383B', orange: '#F28C28', yellow: '#F6CF1C', green: '#3FA34D', blue: '#2A7FD4', purple: '#B05CD9', brown: '#8B5A2B', grey: '#8C8C8C', pink: '#E8418C', teal: '#2EC4B6' };
const RAINBOW = [PAL.red, PAL.orange, PAL.yellow, PAL.green, '#3AA8E0', '#1E5FB4', '#6A2C91'];
const INK = '#2E3352';

type Kind = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'heart' | 'pentagon' | 'trapezoid' | 'rightTriangle';
/** A shape as an SVG fragment centred on (x, y), `s` = size. */
function shape(kind: Kind, x: number, y: number, s: number, color: string, fill = true, sw = 3) {
  const h = s / 2;
  const st = `stroke="${color}" stroke-width="${sw}" fill="${fill ? color : 'none'}" stroke-linejoin="round"`;
  const pts = (p: [number, number][]) => `<polygon points="${p.map(([a, b]) => `${x + a * h},${y + b * h}`).join(' ')}" ${st}/>`;
  switch (kind) {
    case 'circle':
      return `<circle cx="${x}" cy="${y}" r="${h * 0.9}" ${st}/>`;
    case 'square':
      return `<rect x="${x - h * 0.8}" y="${y - h * 0.8}" width="${s * 0.8}" height="${s * 0.8}" rx="3" ${st}/>`;
    case 'triangle':
      return pts([[0, -0.9], [0.9, 0.8], [-0.9, 0.8]]);
    case 'diamond':
      return pts([[0, -0.95], [0.95, 0], [0, 0.95], [-0.95, 0]]);
    case 'pentagon':
      return pts([[0, -0.9], [0.88, -0.25], [0.55, 0.85], [-0.55, 0.85], [-0.88, -0.25]]);
    case 'trapezoid':
      return pts([[-0.45, -0.6], [0.45, -0.6], [0.9, 0.65], [-0.9, 0.65]]);
    case 'rightTriangle':
      return pts([[-0.8, -0.85], [-0.8, 0.85], [0.85, 0.85]]);
    case 'star':
      return pts([[0, -0.95], [0.24, -0.3], [0.92, -0.3], [0.36, 0.12], [0.57, 0.8], [0, 0.4], [-0.57, 0.8], [-0.36, 0.12], [-0.92, -0.3], [-0.24, -0.3]]);
    case 'heart':
      return `<path transform="translate(${x - h} ${y - h}) scale(${s / 100})" d="M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C40 8 47 14 50 22 C53 14 60 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z" stroke="${color}" stroke-width="${(sw * 100) / s}" fill="${fill ? color : 'none'}"/>`;
  }
}
const svg = (w: number, h: number, body: string) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const ansBox = (w = 44, h = 36) => `<span class="ans" style="width:${w}px;height:${h}px"></span>`;

/* ---------- One generator per activity ---------- */

function symbolMatch(level: number, r: R, c: string, cfg: C) {
  const all = ['□', '☆', '◎', '■', '○', '@', '▼', '*', '◇', '△', '※', '#', '▲', '×', '〒', '▽', '♪', '◆', '★', '●'];
  const n: number = cfg.count ?? [6, 12, 20][level - 1];
  const pools: Record<string, string[]> = {
    animals: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐢', '🐙', '🦋', '🐞'],
    fruit: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥕', '🌽', '🥦', '🍄'],
  };
  const set = shuffle(pools[cfg.theme] ?? all, r).slice(0, n);
  const left = shuffle(set, r);
  const right = shuffle(set, r);
  const rows = left.map((s, i) => `<tr><td class="sym" style="color:${c}">${s}</td><td class="dot">■</td><td class="gap"></td><td class="dot">■</td><td class="sym" style="color:${c}">${right[i]}</td></tr>`).join('');
  return `<table class="match">${rows}</table>`;
}

function colourConnect(level: number, r: R, _c: string, cfg: C) {
  const letters = cfg.labels === 'letters';
  const palette = letters ? [PAL.pink, '#7BC043', PAL.blue, '#F6E21C', PAL.grey, '#6B2A12', '#F7A531'] : [PAL.red, PAL.green, PAL.yellow, PAL.blue, PAL.purple, PAL.brown, PAL.orange, PAL.grey];
  const labels = letters ? 'ABCDEFG'.split('') : palette.map((_, i) => String(i + 1));
  const chart = `<table class="chart"><tr>${labels.map((l) => `<th>${l}</th>`).join('')}</tr><tr>${palette.map((p) => `<td><span class="sw" style="background:${p};border-radius:${letters ? 50 : 4}%"></span></td>`).join('')}</tr></table>`;
  const n = Math.min(palette.length, cfg.dots ?? 6);
  const circles = Array.from({ length: 6 }, () => {
    const dots = shuffle(palette.map((_, i) => i), r).slice(0, n);
    const code = shuffle(dots, r).slice(0, Math.min(n, cfg.codeLength ?? 5));
    const S = 170;
    const pos = (k: number) => [S / 2 + Math.cos(-Math.PI / 2 + (k / n) * 2 * Math.PI) * 66, 92 + Math.sin(-Math.PI / 2 + (k / n) * 2 * Math.PI) * 66];
    const ring = letters ? `<polygon points="${dots.map((_, k) => pos(k).join(',')).join(' ')}" fill="none" stroke="${INK}" stroke-width="1.5"/>` : `<circle cx="${S / 2}" cy="92" r="80" fill="#fff" stroke="#C9CEDF" stroke-width="2"/>`;
    const dd = dots.map((d, k) => `<circle cx="${pos(k)[0]}" cy="${pos(k)[1]}" r="11" fill="${palette[d]}"/>`).join('');
    return `<div class="cell">${svg(S, 184, ring + dd)}<div class="code">${code.map((d) => labels[d]).join(' - ')}</div></div>`;
  }).join('');
  return chart + `<div class="grid3">${circles}</div>`;
}

function dotGrid(n: number, size: number, segs: Seg[], color: string, empty = false) {
  const pad = 14;
  const st = (size - pad * 2) / (n - 1);
  const at = (v: number) => pad + v * st;
  let b = `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="10" fill="${empty ? '#fff' : '#FAFBFF'}" stroke="${color}" stroke-width="2"/>`;
  b += segs.map(([x1, y1, x2, y2]) => `<line x1="${at(x1)}" y1="${at(y1)}" x2="${at(x2)}" y2="${at(y2)}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`).join('');
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) b += `<circle cx="${at(x)}" cy="${at(y)}" r="3.6" fill="${INK}"/>`;
  return svg(size, size, b);
}
function dotCopy(level: number, r: R, c: string, cfg: C) {
  const n: number = cfg.grid ?? 3;
  const own: Seg[][] = (cfg.patterns ?? []).filter((p: Seg[]) => p.length && p.every((sg) => sg.every((v) => v < n)));
  const pool = [...own, ...shuffle(n === 3 ? P3 : n === 4 ? P4 : P5, r)];
  return `<div class="pairs">${pool
    .slice(0, 6)
    .map((segs) => `<div class="pair">${dotGrid(n, 140, segs, c)}<span class="arrow" style="color:${c}">➜</span>${dotGrid(n, 140, [], c, true)}</div>`)
    .join('')}</div>`;
}

function shapeCode(lv: number, r: R, _c: string, cfg: C) {
  const level: number = cfg.key ?? lv;
  if (level === 1) {
    const key: [Kind, string][] = [['square', PAL.red], ['circle', PAL.green], ['diamond', '#3B3BD9'], ['pentagon', '#E9B400'], ['triangle', PAL.purple]];
    const k = `<div class="keyrow">${key.map(([s, col], i) => `<div class="keyitem">${svg(54, 54, shape(s, 27, 27, 46, col, false, 4))}<b>${i + 1}</b></div>`).join('')}</div>`;
    const items = Array.from({ length: 25 }, () => pick(key, r));
    return k + `<div class="shapes5">${items.map(([s, col]) => `<div class="si">${svg(56, 56, shape(s, 28, 28, 46, col, false, 4))}${ansBox(40, 30)}</div>`).join('')}</div>`;
  }
  const shapes: Kind[] = level === 2 ? ['circle', 'square', 'triangle', 'heart'] : ['triangle', 'star', 'circle', 'square'];
  const cols = level === 2 ? [PAL.red, PAL.yellow, PAL.blue, PAL.green] : [PAL.yellow, PAL.red, '#7BC043', PAL.blue, PAL.orange, PAL.teal, '#7B3FA0', '#F6C7D3'];
  const codes = level === 2 ? [['1', '2', '3', '4'], ['A', 'C', 'D', 'E'], ['F', 'G', 'H', 'I'], ['5', '6', '7', '8']] : [['0', '2', '4', '6', '8', '10', '12', '14'], ['B', 'D', 'P', 'Q', 'F', 'T', 'M', 'N'], ['1', '3', '5', '7', '9', '11', '13', '15'], ['b', 'd', 'p', 'q', 'f', 't', 'm', 'n']];
  const table = `<table class="chart"><tr><th></th>${cols.map((col) => `<th style="background:${col}"></th>`).join('')}</tr>${shapes.map((s, i) => `<tr><td>${svg(28, 28, shape(s, 14, 14, 22, INK, false, 2.5))}</td>${codes[i].map((x) => `<td><b>${x}</b></td>`).join('')}</tr>`).join('')}</table>`;
  const rows = Array.from({ length: 8 }, () => `<div class="coderow">${Array.from({ length: 6 }, () => { const s = pick(shapes, r); const col = pick(cols, r); return svg(40, 40, shape(s, 20, 20, 32, col)); }).join('')}<span class="eq">=</span>${ansBox(170, 36)}</div>`).join('');
  return table + rows;
}

function shapeSums(level: number, r: R, _c: string, cfg: C) {
  const terms: number = cfg.terms ?? (level === 1 ? 2 : 3);
  const key: [Kind, string, number][] = [['triangle', '#4A90D9', 1], ['square', '#6AA84F', 3], ['circle', PAL.red, 4], ['diamond', '#F6B819', 5], ['rightTriangle', '#7B3FA0', 6], ['trapezoid', PAL.orange, 7], ['pentagon', '#9E9E9E', 8]].slice(0, terms <= 2 ? 5 : 7) as [Kind, string, number][];
  const k = `<table class="chart"><tr>${key.map(([s, col]) => `<td>${svg(40, 40, shape(s, 20, 20, 32, col))}</td>`).join('')}</tr><tr>${key.map(([, , v]) => `<td><b>${v}</b></td>`).join('')}</tr></table>`;
  const eqs = Array.from({ length: Math.max(8, cfg.questions ?? 8) }, () => {
    const n = terms;
    let parts = '';
    let total = 0;
    for (let i = 0; i < n; i++) {
      const [s, col, v] = pick(key, r);
      const op = i === 0 ? '' : cfg.minus && r() < 0.4 && total - v >= 0 ? '−' : '+';
      total = i === 0 ? v : op === '−' ? total - v : total + v;
      parts += `${op ? `<span class="op">${op}</span>` : ''}${svg(44, 44, shape(s, 22, 22, 36, col))}`;
    }
    return `<div class="sumrow">${parts}<span class="op">=</span>${ansBox(56, 40)}</div>`;
  }).join('');
  return k + `<div class="grid2">${eqs}</div>`;
}

function continuePattern(level: number, r: R, c: string, cfg: C) {
  const marks = ['○', '+', '•', '/', '\\', '×', '—', '|'];
  const period: number = cfg.period ?? level + 1;
  const rows = Array.from({ length: 9 }, () => {
    const unit = Array.from({ length: period }, () => pick(marks, r));
    if (new Set(unit).size === 1) unit[period - 1] = marks.find((m) => m !== unit[0])!;
    return `<tr>${Array.from({ length: 14 }, (_, k) => `<td>${k < period * 2 ? `<span style="color:${k % period === 0 ? c : INK}">${esc(unit[k % period])}</span>` : ''}</td>`).join('')}</tr>`;
  }).join('');
  return `<table class="pattern">${rows}</table>`;
}

function compareNumbers(level: number, r: R, _c: string, cfg: C) {
  const max: number = cfg.max ?? (level === 3 ? 99 : 9);
  const len: number = Math.max(cfg.length ?? 7, 6) + 2;
  const ex = `<div class="example">2 <span class="cmp">&lt;</span> 5 <span class="cmp">&lt;</span> 7 <span class="cmp">=</span> 7 <span class="cmp">&gt;</span> 3 &nbsp; 🐊 The crocodile eats the bigger number!</div>`;
  const rows = Array.from({ length: 10 }, () => `<div class="cmprow">${Array.from({ length: len }, (_, k) => `${k ? '<span class="cmp"></span>' : ''}<b>${ri(1, max, r)}</b>`).join('')}</div>`).join('');
  return ex + rows;
}

function digitGrid(size: number, words: string[], r: R, alphabet: string, diag: boolean) {
  const cells: string[] = Array(size * size).fill('');
  const placed: string[] = [];
  const dirs = diag ? [[1, 0], [0, 1], [1, 1]] : [[1, 0], [0, 1]];
  for (const w of words) {
    for (let t = 0; t < 150; t++) {
      const [dx, dy] = pick(dirs, r);
      const x0 = ri(0, size - 1 - dx * (w.length - 1), r);
      const y0 = ri(0, size - 1 - dy * (w.length - 1), r);
      const idx = Array.from(w, (_, i) => (y0 + dy * i) * size + x0 + dx * i);
      if (idx.some((c, i) => cells[c] && cells[c] !== w[i])) continue;
      idx.forEach((c, i) => (cells[c] = w[i]));
      placed.push(w);
      break;
    }
  }
  for (let i = 0; i < cells.length; i++) if (!cells[i]) cells[i] = alphabet[ri(0, alphabet.length - 1, r)];
  return { cells, placed };
}
function gridTable(size: number, cells: string[], cls = 'lgrid') {
  return `<table class="${cls}">${Array.from({ length: size }, (_, y) => `<tr>${cells.slice(y * size, y * size + size).map((ch) => `<td>${ch}</td>`).join('')}</tr>`).join('')}</table>`;
}
function numberSearch(level: number, r: R, c: string, cfg: C) {
  const size: number = Math.max(8, cfg.size ?? 8);
  const n: number = (cfg.count ?? 6) + 2;
  const digits: number = cfg.digits === 34 ? 0 : cfg.digits ?? 3;
  const words = Array.from({ length: n }, () => {
    const len = digits || ri(3, 4, r);
    return String(ri(10 ** (len - 1), 10 ** len - 1, r));
  });
  const { cells, placed } = digitGrid(size, words, r, '0123456789', false);
  return gridTable(size, cells) + `<div class="wordlist" style="border-color:${c}">${placed.sort((a, b) => +a - +b).map((w) => `<span>${w}</span>`).join('')}</div>`;
}

function mathSearch(level: number, r: R, c: string, cfg: C) {
  const base = [{ t: 10, op: '+' }, { t: 8, op: '+' }, { t: 6, op: '−' }][level - 1];
  const rule = { t: cfg.target ?? base.t, op: cfg.op === '-' ? '−' : cfg.op === '+' ? '+' : base.op };
  const size = level === 1 ? 7 : 9;
  const cells = Array.from({ length: size * size }, () => String(ri(0, rule.op === '+' ? 9 : 15, r)));
  return `<div class="target" style="border-color:${c};color:${c}">${rule.t}</div><p class="hint">Circle two numbers side by side that ${rule.op === '+' ? `add up to ${rule.t}` : `have a difference of ${rule.t}`}. How many pairs can you find?</p>${gridTable(size, cells)}`;
}

function numberSnake(level: number, r: R, c: string, cfg: C) {
  const steps: number = Math.max(6, (cfg.steps ?? 6) + 2);
  const maxOp: number = cfg.maxStep ?? 3;
  let v = ri(3, 9, r);
  const start = v;
  const ops: number[] = [];
  for (let i = 0; i < steps; i++) {
    let d = ri(1, maxOp, r) * (r() < 0.5 ? -1 : 1);
    if (v + d < 0 || v + d > 20) d = -d;
    v += d;
    ops.push(d);
  }
  const per = 6;
  const W = 640;
  const gap = W / per;
  const pos = (k: number) => {
    const row = Math.floor(k / per);
    const col = k % per;
    return [(row % 2 ? per - 1 - col : col) * gap + gap / 2, row * 100 + 40];
  };
  const H = Math.ceil((steps + 1) / per) * 100 + 10;
  let b = `<path d="${Array.from({ length: steps + 1 }, (_, k) => `${k ? 'L' : 'M'}${pos(k).join(',')}`).join(' ')}" stroke="${c}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.35"/>`;
  ops.forEach((o, k) => {
    const [x1, y1] = pos(k);
    const [x2, y2] = pos(k + 1);
    b += `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - (y1 === y2 ? 24 : 0)}" text-anchor="middle" font-size="16" font-weight="800" fill="${INK}">${o > 0 ? '+' : '−'}${Math.abs(o)}</text>`;
  });
  for (let k = 0; k <= steps; k++) {
    const [x, y] = pos(k);
    b += k === 0 ? `<ellipse cx="${x}" cy="${y}" rx="34" ry="24" fill="${c}"/><text x="${x}" y="${y + 8}" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">${start}</text><circle cx="${x - 12}" cy="${y - 10}" r="3" fill="#fff"/>` : `<circle cx="${x}" cy="${y}" r="21" fill="#fff" stroke="${c}" stroke-width="3"/>`;
  }
  return svg(W, H, b);
}

function stackSquares(level: number, r: R, c: string, cfg: C) {
  const n: number = cfg.grid ?? 2;
  const cards: number = cfg.cards ?? 2;
  const card = (cells: boolean[]) => svg(n * 22 + 4, n * 22 + 4, cells.map((d, i) => `<rect x="${2 + (i % n) * 22}" y="${2 + Math.floor(i / n) * 22}" width="22" height="22" fill="${d ? c : '#fff'}" stroke="${INK}" stroke-width="1.5"/>`).join(''));
  const rows = Array.from({ length: 10 }, () => `<div class="stackrow">${Array.from({ length: cards }, (_, k) => `${k ? '<span class="op">+</span>' : ''}${card(Array.from({ length: n * n }, () => r() < 0.3))}`).join('')}<span class="op">=</span>${card(Array(n * n).fill(false))}</div>`).join('');
  return `<div class="grid2">${rows}</div>`;
}

function colourSymbol(level: number, r: R, _c: string, cfg: C) {
  const ring = cfg.style === 'faces';
  const key = (ring ? [['#3FA34D', '🙂'], [PAL.red, '😣'], ['#3D6FD8', '🙁'], ['#F2B33D', '😀']] : [['#1E88D9', '—'], ['#4CAF50', '|'], ['#FBC02D', '✕'], ['#EF6C00', '□'], ['#E53935', '◯']]).slice(0, cfg.colours ?? 4);
  const total: number = Math.max(36, cfg.dots ?? 36);
  const cols = total >= 60 ? 10 : 8;
  const rows = Math.ceil(total / cols);
  const k = `<div class="keyrow">${key.map(([col, m]) => `<div class="keyitem"><span class="cdot" style="${ring ? `border:4px solid ${col}` : `background:${col}`}">${m}</span></div>`).join('')}</div>`;
  const dots = Array.from({ length: cols * rows }, () => pick(key, r)[0]);
  return k + `<div class="dots" style="grid-template-columns:repeat(${cols},1fr)">${dots.map((col) => `<span class="cdot" style="${ring ? `border:4px solid ${col}` : `background:${col}`}"></span>`).join('')}</div>`;
}

function spotDifference(level: number, r: R, c: string, cfg: C) {
  const scenes = [['🏠', '🏡', '🏢', '🚗', '🚌', '🚲', '🌳', '🚦', '🐕', '🎈', '☁️', '🏪'], ['⛺', '🔥', '🌲', '🍄', '🦋', '🐸', '🪵', '🌙', '⭐', '🎒', '🍫', '🐿️'], ['🐠', '🐙', '🐚', '⛵', '🦀', '🐬', '🌊', '🪸', '🐳', '🦑', '⚓', '🏝️']];
  const named: Record<string, number> = { town: 0, camping: 1, sea: 2 };
  const heroItems = ['🦖', '🚀', '🦄', '🐬', '🦁', '🐶', '⚽', '🦸', '🐉', '🤖', '🐢', '🐼'];
  const items = cfg.theme === 'heroes' ? heroItems : named[cfg.theme] !== undefined ? scenes[named[cfg.theme]] : pick(scenes, r);
  const top = Array.from({ length: 24 }, () => pick(items, r));
  const n: number = cfg.diffs ?? [3, 5, 8][level - 1];
  const bottom = [...top];
  for (const i of shuffle(top.map((_, k) => k), r).slice(0, n)) bottom[i] = r() < 0.25 ? '' : pick(items.filter((x) => x !== top[i]), r);
  const pic = (xs: string[]) => `<div class="scene" style="border-color:${c}">${xs.map((x) => `<span>${x || '&nbsp;'}</span>`).join('')}</div>`;
  return `<p class="hint">Find <b>${n}</b> differences. Circle them on the bottom picture.</p>${pic(top)}${pic(bottom)}`;
}

function rainbow(level: number, r: R, _c: string, cfg: C) {
  const bands: number = cfg.bands ?? (level === 1 ? 4 : 7);
  const one = (k: number) => {
    let order: string[];
    if (k === 0) order = RAINBOW.slice(0, bands).reverse();
    else if (cfg.repeats) {
      const few = shuffle([...RAINBOW, PAL.pink, PAL.grey, PAL.brown], r).slice(0, 3);
      order = Array.from({ length: bands }, () => pick(few, r));
    } else {
      const few = shuffle(RAINBOW, r).slice(0, bands);
      order = few;
    }
    const W = 250;
    const cx = W / 2;
    const cy = 130;
    const outer = 118;
    const inner = outer * 0.38;
    const w = (outer - inner) / bands;
    let b = '';
    for (let i = 0; i < bands; i++) {
      const ro = outer - i * w;
      const rI = ro - w;
      b += `<path d="M ${cx - ro} ${cy} A ${ro} ${ro} 0 0 1 ${cx + ro} ${cy} L ${cx + rI} ${cy} A ${rI} ${rI} 0 0 0 ${cx - rI} ${cy} Z" fill="${k === 0 ? order[i] : '#fff'}" stroke="${INK}" stroke-width="1.5"/>`;
    }
    order.forEach((col, i) => (b += `<circle cx="${cx - (bands - 1) * 15 + i * 30}" cy="${cy + 22}" r="11" fill="${col}" stroke="#555" stroke-width="1"/>`));
    return `<div class="cell">${svg(W, 165, b)}</div>`;
  };
  return `<p class="hint">The first rainbow shows how. Colour each band in the order of the dots — the first dot is the outside band.</p><div class="grid2">${Array.from({ length: 6 }, (_, k) => one(k)).join('')}</div>`;
}

const THEMES: [string, string[]][] = [
  ['Spring', ['BEE', 'EGG', 'FROG', 'WORM', 'LEAF', 'NEST', 'SUN', 'BIRD']],
  ['Space', ['MOON', 'STAR', 'MARS', 'NOVA', 'COMET', 'ORBIT', 'LIGHT', 'DUST', 'SUN', 'SKY', 'SHIP', 'ROCK']],
  ['Museum', ['ARTS', 'BOOKS', 'CULTURE', 'DINOSAUR', 'EXPLORE', 'FILMS', 'FOSSILS', 'HALLS', 'HISTORY', 'LEARN', 'RELICS', 'TOURS']],
  ['Vacation', ['AIRPORT', 'BEACH', 'FLIGHT', 'HOLIDAY', 'HOTEL', 'PACK', 'POOL', 'RELAX', 'TICKET', 'TRAVEL', 'TRIP', 'WINDOW']],
];
function wordSearch(level: number, r: R, c: string, cfg: C) {
  const own: string[] = (cfg.words ?? []).filter(Boolean).map((w: string) => w.toUpperCase().replace(/[^A-Z]/g, ''));
  const named = THEMES.find(([t]) => t === cfg.theme);
  const [title, words] = own.length ? (['My', own] as [string, string[]]) : named ?? (level === 1 ? THEMES[0] : level === 2 ? THEMES[1] : pick(THEMES.slice(2), r));
  const size = Math.max([8, 8, 10, 12, 13][(cfg.grid ?? 2) - 1] ?? 10, ...words.map((w) => w.length));
  const { cells, placed } = digitGrid(size, words, r, 'ABCDEFGHIJKLMNOPRSTUVWY', (cfg.grid ?? 2) > 2);
  return `<h2 class="theme" style="color:${c}">${title} Word Search</h2>${gridTable(size, cells, 'lgrid letters')}<div class="wordlist" style="border-color:${c}">${placed.map((w) => `<span>${w}</span>`).join('')}</div>`;
}

function followLines(level: number, r: R, c: string, cfg: C) {
  const fruits = ['🍎', '🍐', '🎃', '🥦', '🍅', '🍆'];
  const cols: number = Math.min(6, cfg.fruits ?? 4);
  const rowsN: number = cfg.rows ?? 2;
  const W = 560;
  const colW = W / cols;
  const x = (k: number) => k * colW + colW / 2;
  const GAP = 95;
  let b = '';
  const links = Array.from({ length: rowsN }, () => shuffle(Array.from({ length: cols }, (_, i) => i), r));
  links.forEach((l, row) => l.forEach((to, from) => (b += `<line x1="${x(from)}" y1="${row * GAP + 40}" x2="${x(to)}" y2="${(row + 1) * GAP}" stroke="${row % 2 ? c : INK}" stroke-width="2"/>`)));
  fruits.slice(0, cols).forEach((f, k) => (b += `<rect x="${x(k) - 22}" y="0" width="44" height="40" rx="6" fill="#fff" stroke="${INK}"/><text x="${x(k)}" y="29" text-anchor="middle" font-size="24">${f}</text>`));
  for (let row = 1; row <= rowsN; row++) for (let k = 0; k < cols; k++) b += `<rect x="${x(k) - 22}" y="${row * GAP}" width="44" height="40" rx="6" fill="#fff" stroke="${INK}"/><text x="${x(k)}" y="${row * GAP + 28}" text-anchor="middle" font-size="20" font-weight="700" fill="${INK}">${ri(0, 9, r)}</text>`;
  const table = `<table class="chart wide"><tr>${fruits.slice(0, cols).map((f) => `<td style="font-size:22px">${f}</td><td style="width:90px"></td>`).join('')}</tr></table>`;
  return svg(W, rowsN * GAP + 46, b) + `<p class="hint">Follow each line down and write the secret code for every fruit.</p>` + table;
}

function die(n: number, s = 34) {
  const P: Record<number, [number, number][]> = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]] };
  return svg(s, s, `<rect x="1" y="1" width="${s - 2}" height="${s - 2}" rx="6" fill="#fff" stroke="${INK}" stroke-width="1.5"/>${P[n].map(([a, b]) => `<circle cx="${7 + a * ((s - 14) / 2)}" cy="${7 + b * ((s - 14) / 2)}" r="3" fill="${INK}"/>`).join('')}`);
}
function diceMatch(level: number, r: R, c: string, cfg: C) {
  const n = Math.max(8, cfg.questions ?? 8);
  const maxSum: number = cfg.max ?? 6;
  const qs = Array.from({ length: n }, () => {
    if (maxSum <= 6) {
      const v = ri(1, 6, r);
      return { left: String(v), total: v };
    }
    const a = ri(0, maxSum <= 12 ? 6 : 10, r);
    const b = ri(1, Math.min(9, maxSum - a), r);
    return { left: `${a} + ${b}`, total: a + b };
  });
  const answers = shuffle(qs.map((q) => q.total), r);
  const dice = shuffle(qs.map((q) => q.total), r).map((t) => {
    const ds: number[] = [];
    let left = t;
    while (left > 0) {
      const d = Math.min(6, left > 6 ? ri(1, 6, r) : left);
      ds.push(d);
      left -= d;
    }
    return ds.map((d) => die(d)).join('');
  });
  const rows = qs.map((q, i) => `<tr><td class="box">${q.left}</td><td class="gapcol"></td><td class="box ans2" style="background:${c}22">${answers[i]}</td><td class="gapcol"></td><td class="dice">${dice[i]}</td></tr>`).join('');
  return `<p class="hint">Draw a line from each sum to its answer, then to the dice that show the same number.</p><table class="dicetable">${rows}</table>`;
}

function dotToDot(level: number, r: R, c: string, cfg: C) {
  const pics: [string, [number, number][]][] = [
    ['star', [[50, 4], [62, 36], [96, 37], [69, 58], [79, 93], [50, 72], [21, 93], [31, 58], [4, 37], [38, 36]]],
    ['house', [[50, 6], [94, 44], [82, 44], [82, 94], [18, 94], [18, 44], [6, 44]]],
    ['fish', [[8, 50], [30, 26], [60, 22], [80, 40], [96, 22], [92, 50], [96, 78], [80, 60], [60, 78], [30, 74]]],
    ['rocket', [[50, 4], [64, 24], [66, 62], [82, 82], [64, 80], [58, 94], [42, 94], [36, 80], [18, 82], [34, 62], [36, 24]]],
    ['heart', [[50, 92], [12, 56], [6, 32], [16, 12], [34, 8], [50, 24], [66, 8], [84, 12], [94, 32], [88, 56]]],
  ];
  const [, pts] = pics.find(([name]) => name === cfg.picture) ?? pick(pics, r);
  const n: number = cfg.dots ?? [15, 30, 50][level - 1];
  const segs = pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as const);
  const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const S = 520;
  let b = '';
  for (let k = 0; k < n; k++) {
    let d = (k / n) * total;
    let s = 0;
    while (d > lens[s]) d -= lens[s++];
    const [p, q] = segs[s];
    const t = d / lens[s];
    const x = 20 + ((p[0] + (q[0] - p[0]) * t) / 100) * (S - 40);
    const y = 20 + ((p[1] + (q[1] - p[1]) * t) / 100) * (S - 40);
    b += `<circle cx="${x}" cy="${y}" r="${k === 0 ? 6 : 4}" fill="${k === 0 ? c : INK}"/><text x="${x + 7}" y="${y - 6}" font-size="${n > 30 ? 11 : 13}" font-weight="700" fill="${k === 0 ? c : INK}">${k + 1}</text>`;
  }
  return `<p class="hint">Start at <b style="color:${c}">1</b> and join the dots in order. What picture appears? Then colour it in!</p>` + svg(S, S, b);
}

function countShapes(level: number, r: R, _c: string, cfg: C) {
  const kinds: Kind[] = ['circle', 'square', 'triangle'];
  const cols = [PAL.red, PAL.green, PAL.blue, PAL.orange, PAL.purple, PAL.pink];
  const n: number = cfg.shapes ?? 8;
  const apart = !cfg.overlap && n <= 8;
  let b = '';
  for (let k = 0; k < n; k++) {
    const kind = kinds[k % 3 === 0 ? 0 : ri(0, 2, r)];
    const s = apart ? 70 : ri(50, 120, r);
    const x = apart ? 70 + (k % 4) * 130 : ri(40, 500, r);
    const y = apart ? 70 + Math.floor(k / 4) * 130 : ri(40, 380, r);
    b += shape(kind, x, y, s, cfg.colourful ? pick(cols, r) : INK, false, 3);
  }
  const table = `<table class="chart wide"><tr>${kinds.map((k) => `<td>${svg(40, 40, shape(k, 20, 20, 30, INK, false, 3))}</td><td style="width:70px"></td>`).join('')}</tr></table>`;
  return `<p class="hint">How many circles, squares and triangles can you find? Some are hiding behind others!</p>${svg(540, apart ? 300 : 420, b)}${table}`;
}

/* ---------- Paper & flashcard activities ---------- */

function squared(cols: number, rows: number, cell: number, segs: Seg[], color: string, extra = '') {
  const w = cols * cell;
  const h = rows * cell;
  let g = `<rect x="0" y="0" width="${w}" height="${h}" fill="#fff"/>`;
  for (let x = 0; x <= cols; x++) g += `<line x1="${x * cell}" y1="0" x2="${x * cell}" y2="${h}" stroke="#C9CEDF" stroke-width="1"/>`;
  for (let y = 0; y <= rows; y++) g += `<line x1="0" y1="${y * cell}" x2="${w}" y2="${y * cell}" stroke="#C9CEDF" stroke-width="1"/>`;
  const lines = segs.map(([a, b, c2, d]) => `<line x1="${a * cell}" y1="${b * cell}" x2="${c2 * cell}" y2="${d * cell}" stroke="${color}" stroke-width="3.5" stroke-linecap="round"/>`).join('');
  return `<svg width="${w + 4}" height="${h + 4}" viewBox="-2 -2 ${w + 4} ${h + 4}">${g}${lines}${extra}</svg>`;
}
function mirrorDraw(level: number, r: R, c: string, cfg: C) {
  const boards = Array.from({ length: 4 }, () => {
    const half = 4;
    const rows = 8;
    const segs: Seg[] = [];
    let x = ri(0, half, r);
    let y = ri(0, rows, r);
    for (let k = 0; k < (cfg.lines ?? [5, 8, 11][level - 1]); k++) {
      const diag = !!cfg.diagonals && r() < 0.45;
      const nx = Math.max(0, Math.min(half, x + (diag || r() < 0.5 ? ri(-2, 2, r) : 0)));
      const ny = Math.max(0, Math.min(rows, y + (diag || nx === x ? ri(-3, 3, r) : 0)));
      if (nx !== x || ny !== y) segs.push([x, y, nx, ny]);
      x = nx;
      y = ny;
    }
    return squared(half * 2, rows, 26, segs, c, `<line x1="${half * 26}" y1="-2" x2="${half * 26}" y2="${rows * 26 + 2}" stroke="${PAL.pink}" stroke-width="3" stroke-dasharray="7 5"/>`);
  });
  return `<p class="hint">The pink dashed line is a mirror. Draw the other half so both sides match.</p><div class="grid2">${boards.map((b2) => `<div class="cell">${b2}</div>`).join('')}</div>`;
}
function gridPatterns(level: number, _r: R, c: string, cfg: C) {
  const units: Seg[][] = [
    [[0, 0, 2, 0], [2, 0, 2, 2], [2, 2, 0, 2], [0, 2, 0, 0], [2, 2, 3, 2], [3, 2, 3, 1], [3, 1, 2, 1]],
    [[0, 0, 2, 0], [2, 0, 2, 2], [2, 2, 0, 2], [0, 2, 0, 0], [3, 0, 4, 1], [4, 1, 3, 2], [3, 2, 2, 1], [2, 1, 3, 0]],
    [[0, 2, 1, 0], [1, 0, 2, 2], [2, 2, 2.5, 1], [2.5, 1, 3, 2]],
    [[0, 1, 1, 0], [1, 0, 2, 1], [0, 2, 1, 1], [1, 1, 2, 2]],
    [[0, 0, 0, 2], [0, 0, 2, 1], [2, 1, 0, 2]],
    [[0, 2, 1, 0], [1, 0, 2, 2], [2, 2, 3, 1], [3, 1, 4, 2]],
  ];
  const style: number = cfg.style ?? level;
  const pool = style === 1 ? [units[0]] : style === 2 ? [units[0], units[1], units[4]] : units;
  const colours = [c, PAL.blue, PAL.orange, PAL.green, PAL.purple, PAL.red];
  return pool
    .concat(pool)
    .slice(0, 6)
    .map((u, i) => {
      const width = Math.ceil(Math.max(...u.flatMap((s) => [s[0], s[2]])));
      const segs = [0, 1].flatMap((k) => u.map(([a, b, c2, d]) => [a + k * width, b, c2 + k * width, d] as Seg));
      return `<div class="row">${squared(20, 2, 30, segs, colours[i % colours.length])}</div>`;
    })
    .join('');
}
function numberTree(level: number, r: R, c: string, cfg: C) {
  const pyramids = Array.from({ length: 3 }, (_, pi) => {
    const base: number = cfg.base ?? (level === 1 ? 3 : 4);
    const max: number = cfg.max ?? 5;
    const rows: number[][] = [Array.from({ length: base }, () => ri(0, max, r))];
    while (rows[0].length > 1) rows.unshift(rows[0].slice(1).map((v, i) => v + rows[0][i]));
    const show = (y: number, x: number) => (y === rows.length - 1 ? !(cfg.missing && x === 1) : y === 0 && !!cfg.missing);
    const box = 48;
    const W = base * box + 20;
    const fills = [c, PAL.blue, PAL.orange];
    let s = '';
    rows.forEach((row, y) => {
      const off = (W - row.length * box) / 2;
      row.forEach((v, x) => {
        s += `<rect x="${off + x * box}" y="${y * box}" width="${box}" height="${box}" rx="6" fill="${show(y, x) ? fills[pi] + '33' : '#fff'}" stroke="${fills[pi]}" stroke-width="2.5"/>`;
        if (show(y, x)) s += `<text x="${off + x * box + box / 2}" y="${y * box + box / 2 + 8}" font-size="22" font-weight="800" text-anchor="middle" fill="${INK}">${v}</text>`;
      });
    });
    return svg(W, rows.length * box + 4, s);
  });
  return `<p class="hint">Each box is the sum of the two boxes under it. Start at the bottom and climb up${cfg.missing ? '; use take-away to find the missing bottom number' : ''}.</p><div class="three">${pyramids.join('')}</div>`;
}
const BRAILLE: Record<string, number[]> = {
  A: [1], B: [1, 2], C: [1, 4], D: [1, 4, 5], E: [1, 5], F: [1, 2, 4], G: [1, 2, 4, 5], H: [1, 2, 5], I: [2, 4], J: [2, 4, 5],
  K: [1, 3], L: [1, 2, 3], M: [1, 3, 4], N: [1, 3, 4, 5], O: [1, 3, 5], P: [1, 2, 3, 4], R: [1, 2, 3, 5], S: [2, 3, 4], T: [2, 3, 4, 5],
  U: [1, 3, 6], V: [1, 2, 3, 6], W: [2, 4, 5, 6], Y: [1, 3, 4, 5, 6],
};
function brailleCell(letter: string, c: string) {
  const on = BRAILLE[letter] ?? [];
  const pos = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]];
  return svg(26, 36, pos.map(([x, y], i) => (on.includes(i + 1) ? `<circle cx="${7 + x * 12}" cy="${7 + y * 11}" r="4" fill="${c}"/>` : `<circle cx="${7 + x * 12}" cy="${7 + y * 11}" r="1.6" fill="#C9CEDF"/>`)).join(''));
}
function secretCode(level: number, r: R, c: string, cfg: C) {
  const own: string[] = (cfg.words ?? []).map((w: string) => w.toUpperCase().replace(/[^A-Z ]/g, '').split('').filter((ch) => ch === ' ' || BRAILLE[ch]).join('')).filter((w: string) => w.trim());
  const words = own.length ? own : level === 1 ? ['SUN', 'DOG', 'HAT', 'CAT', 'BOOK', 'MILK'] : level === 2 ? ['MONDAY', 'TUESDAY', 'FRIDAY', 'SUNDAY', 'SATURDAY', 'WEDNESDAY'] : ['I LOVE SUNNY DAYS', 'READ A BOOK', 'PLAY WITH MY DOG'];
  const letters = [...new Set(words.join('').replace(/ /g, '').split(''))].sort();
  const key = `<table class="chart"><tr>${letters.map((l) => `<th>${l}</th>`).join('')}</tr><tr>${letters.map((l) => `<td>${brailleCell(l, c)}</td>`).join('')}</tr></table>`;
  const list = shuffle(words, r)
    .map((w, i) => `<div class="word"><b>${i + 1}.</b> ${w.split('').map((ch) => (ch === ' ' ? '<span class="gapw"></span>' : `<span class="slot"><span class="line"></span>${brailleCell(ch, INK)}</span>`)).join('')}</div>`)
    .join('');
  return key + list;
}
function figure(kind: number, rot: number, x: number, y: number, s: number, c: string) {
  const shapes = [
    `<rect x="-20" y="-20" width="40" height="40" fill="#fff" stroke="${INK}" stroke-width="2"/><line x1="-20" y1="-20" x2="20" y2="20" stroke="${INK}"/><polygon points="-20,-20 20,-20 20,20" fill="${c}"/><circle cx="-8" cy="8" r="3.5" fill="${INK}"/>`,
    `<circle r="21" fill="#fff" stroke="${INK}" stroke-width="2"/><line x1="0" y1="-21" x2="0" y2="21" stroke="${INK}"/><line x1="-21" y1="0" x2="21" y2="0" stroke="${INK}"/><path d="M0 0 L21 0 A21 21 0 0 1 0 21 Z" fill="${c}"/><circle cx="-9" cy="-9" r="3.5" fill="${INK}"/>`,
    `<polygon points="0,-22 22,18 -22,18" fill="#fff" stroke="${INK}" stroke-width="2"/><polygon points="0,-22 0,18 -22,18" fill="${c}"/><circle cx="8" cy="8" r="3" fill="${INK}"/>`,
    `<rect x="-20" y="-14" width="40" height="28" fill="#fff" stroke="${INK}" stroke-width="2"/><polygon points="-20,-14 0,0 -20,14" fill="${c}"/><line x1="0" y1="-14" x2="0" y2="14" stroke="${INK}"/><circle cx="12" cy="6" r="3" fill="${INK}"/>`,
    `<circle r="21" fill="#fff" stroke="${INK}" stroke-width="2"/><line x1="-21" y1="0" x2="21" y2="0" stroke="${INK}"/><line x1="-14" y1="6" x2="-14" y2="18" stroke="${INK}"/><line x1="-8" y1="6" x2="-8" y2="20" stroke="${INK}"/><path d="M0 0 L0 -21 A21 21 0 0 1 21 0 Z" fill="${c}"/><circle cx="8" cy="10" r="3" fill="${INK}"/>`,
    `<rect x="-20" y="-20" width="40" height="40" fill="#fff" stroke="${INK}" stroke-width="2"/><line x1="-20" y1="-20" x2="20" y2="20" stroke="${INK}"/><line x1="20" y1="-20" x2="-20" y2="20" stroke="${INK}"/><polygon points="-20,20 0,0 20,20" fill="${c}"/><circle cx="0" cy="-10" r="3.5" fill="${INK}"/>`,
  ];
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${shapes[kind]}</g>`;
}
function findFigure(level: number, r: R, c: string, cfg: C) {
  const targets: number = cfg.targets ?? (level === 1 ? 3 : 6);
  const n: number = cfg.count ?? [24, 36, 44][level - 1];
  const cols = 6;
  const items: string[] = [];
  for (let k = 0; k < n; k++) {
    const x = 46 + (k % cols) * 92 + ri(-10, 10, r);
    const y = 40 + Math.floor(k / cols) * 82 + ri(-8, 8, r);
    items.push(figure(ri(0, 5, r), cfg.rotate ? ri(0, 359, r) : ri(0, 3, r) * 90, x, y, 0.95, c));
  }
  const key = Array.from({ length: targets }, (_, k) => `<div class="target2">${svg(56, 56, figure(k, 0, 28, 28, 1, c))} = ${ansBox(44, 36)}</div>`).join('');
  return svg(570, Math.ceil(n / cols) * 82 + 20, items.join('')) + `<div class="targets">${key}</div>`;
}


/* ——— Speech & language sheets (words in the app language) ——— */

const card = (emoji: string, label = '', extra = '') =>
  `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:2.5px solid #D9DCE6;border-radius:18px;padding:10px 6px;min-height:110px;background:#fff">` +
  `<div style="font-size:52px;line-height:1.1">${emoji}</div>${label ? `<div style="font-size:16px;font-weight:700">${esc(label)}</div>` : ''}${extra}</div>`;
const gridOf = (cols: number, cells: string[]) => `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px;width:100%">${cells.join('')}</div>`;
const tick = (c: string) => `<div style="font-size:20px;color:${c};letter-spacing:4px">☆ ☆ ☆</div>`;
const sRand = (r: R) => () => r();

function sayIt(_level: number, r: R, c: string, cfg: C) {
  const lang = getLang();
  const deck = sayItDeck({ words: cfg.own?.length ? 'own' : cfg.words, count: cfg.count, own: cfg.own }, lang, sRand(r));
  return `<p class="hint">Say each picture out loud. Colour a star each time you say it well.</p>${gridOf(3, deck.map((d) => card(d.emoji, cfg.showWord || cfg.own?.length ? d.word : '', tick(c))))}`;
}

function soundDetective(_level: number, r: R, c: string, cfg: C) {
  const lang = getLang();
  const rounds = soundRounds({ rounds: Math.min(cfg.rounds ?? 6, 6), choices: cfg.choices, tricky: cfg.tricky }, lang, sRand(r));
  const rows = rounds.map(
    (rd) =>
      `<div style="display:flex;align-items:center;gap:12px;width:100%"><div class="target" style="border-color:${c};color:${c};flex:none">${esc(rd.letter)}</div>` +
      `<div style="flex:1">${gridOf(rd.options.length, rd.options.map((o) => card(o.emoji)))}</div></div>`,
  );
  return `<p class="hint">Say the sound. Circle the picture that starts with it.</p>${rows.join('')}`;
}

function oddOneOut(_level: number, r: R, _c: string, cfg: C) {
  const rows = oddRounds({ rounds: Math.min(cfg.rounds ?? 6, 6), kind: cfg.kind }, sRand(r)).map((rd) => gridOf(4, rd.items.map((x) => card(x.emoji, x[getLang()]))));
  return `<p class="hint">Three pictures go together. Cross out the one that doesn’t belong and say why.</p>${rows.join('<hr style="width:100%;border:0;border-top:1.5px dashed #D9DCE6;margin:2px 0">')}`;
}

function listenDo(_level: number, r: R, c: string, cfg: C) {
  const lang = getLang();
  const rounds = listenRounds({ rounds: cfg.rounds, keyWords: cfg.keyWords, containers: cfg.containers }, sRand(r));
  const all = rounds[0]?.objects ?? [];
  const pics = all.map((o) => `<div style="display:flex;align-items:center;justify-content:center;border:2px solid #D9DCE6;border-radius:16px;height:110px">${svg(100, 100, shape(OBJ_SHAPE[o.kind], 50, 50, o.size === 'big' ? 80 : 44, COLOUR_HEX[o.colour]))}</div>`);
  const conts = rounds[0]?.containers.map((k) => card(CONTAINER_EMOJI[k])) ?? [];
  const list = rounds.map((rd, i) => `<li style="margin:6px 0;font-size:16px"><b>${i + 1}.</b> ${esc(instructionText(rd.ins, lang))}</li>`).join('');
  return `<p class="hint">Grown-up: read one instruction at a time, once. The child points (or colours) the right one.</p>` +
    `${gridOf(3, pics)}${conts.length ? `<div style="width:100%;margin-top:6px">${gridOf(3, conts)}</div>` : ''}` +
    `<div style="width:100%;border:2px dashed ${c};border-radius:16px;padding:10px 16px"><b>Instructions for the grown-up</b><ul style="list-style:none;padding:0;margin:6px 0 0">${list}</ul></div>`;
}

function questionTime(_level: number, r: R, _c: string, cfg: C) {
  const lang = getLang();
  const rows = questionRounds({ rounds: Math.min(cfg.rounds ?? 6, 6), kind: cfg.kind, choices: cfg.choices }, sRand(r)).map((rd) => {
    const q = 'word' in rd.question ? whichIs[lang].replace('{{x}}', rd.question.word[lang]) : rd.question[lang];
    return `<div style="width:100%"><div style="font-size:17px;font-weight:800;margin-bottom:6px">${esc(q)}</div>${gridOf(rd.options.length, rd.options.map((o) => card(o.emoji)))}</div>`;
  });
  return `<p class="hint">Listen to the question. Circle the right picture.</p>${rows.join('')}`;
}

function storySteps(_level: number, r: R, c: string, cfg: C) {
  const lang = getLang();
  const box = `<div style="width:34px;height:34px;border:2.5px solid ${c};border-radius:10px;margin-top:4px"></div>`;
  return storyRounds({ steps: cfg.steps, stories: cfg.stories }, sRand(r))
    .map((rd) => {
      const links = linksFor(rd.order.length, lang).map((l) => `<div style="display:flex;gap:8px;align-items:flex-end;margin:6px 0"><b style="min-width:90px">${esc(l)}…</b><span style="flex:1;border-bottom:1.5px solid #9AA0B8;height:18px"></span></div>`).join('');
      return `<div style="width:100%"><h3 class="theme" style="color:${c}">${esc(rd.story.title[lang])}</h3>` +
        `${gridOf(rd.order.length, rd.shuffled.map((s) => card(rd.story.steps[s].emoji, '', box)))}` +
        `<p class="hint" style="text-align:left;margin-top:8px">Write 1, 2, 3… in the order they happen. Then tell the story:</p>${links}</div>`;
    })
    .join('');
}

const GENERATORS: Record<LibraryFamilyId, (level: number, r: R, c: string, cfg: C) => string> = {
  symbolMatch, colourConnect, dotCopy, shapeCode, shapeSums, continuePattern, compareNumbers, numberSearch, mathSearch,
  numberSnake, stackSquares, colourSymbol, spotDifference, rainbow, wordSearch, followLines, diceMatch, dotToDot, countShapes,
  mirrorDraw, gridPatterns, numberTree, secretCode, findFigure,
  sayIt, soundDetective, oddOneOut, listenDo, questionTime, storySteps,
};

/** Every Skill Builder has a printable colour sheet. */
export function hasPrintable(_family: LibraryFamilyId): boolean {
  return true;
}

/** A full colour printable page: header band, name/date, steps, the generated sheet and a star tracker. */
export type PrintHero = { name: string; emoji: string; uri?: string };

export function printableHtml(
  family: LibraryFamilyId,
  level: number,
  childName = '',
  seed = Date.now(),
  artUri?: string,
  opts: { custom?: LibraryCustom; hero?: PrintHero; title?: string } = {},
): string {
  const f = FAMILY[family];
  const r = rng(seed);
  const c = f.color;
  const body = GENERATORS[family](level, r, c, configFor(family, level, opts.custom));
  const hero = opts.hero
    ? `<div class="hero">${opts.hero.uri ? `<img src="${esc(opts.hero.uri)}" alt=""/>` : `<span>${opts.hero.emoji}</span>`}<div><b>${esc(opts.hero.name)}</b> says:<br/>“You can do it${childName ? `, ${esc(childName.split(' ')[0])}` : ''}!”</div></div>`
    : '';
  const art = artUri ? `<img src="${esc(artUri)}" alt="" class="art"/>` : `<span class="art emoji">${f.emoji}</span>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(f.name)}</title><style>
    :root{color-scheme:light}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    html,body{background:#fff}
    body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:${INK};margin:0;padding:22px}
    @page{margin:12mm}
    .head{display:flex;align-items:center;gap:16px;padding:16px 20px;border-radius:22px;background:linear-gradient(120deg,${c},${c}CC 55%,${f.tint});color:#fff}
    .art{width:70px;height:70px;border-radius:50%;background:#ffffffE6;padding:8px;object-fit:contain;flex:none}
    .art.emoji{display:flex;align-items:center;justify-content:center;font-size:40px}
    .head h1{margin:0;font-size:28px;letter-spacing:-.5px}
    .head .sub{font-size:13.5px;opacity:.95;margin-top:3px}
    .lvl{margin-left:auto;background:#fff;color:${c};font-weight:800;border-radius:14px;padding:6px 14px;font-size:14px}
    .lines{display:flex;gap:14px;margin:14px 0 10px}
    .lines span{flex:1;border:2px solid ${c}55;border-radius:12px;padding:8px 12px;font-size:14px;font-weight:600}
    .steps{display:flex;flex-wrap:wrap;gap:8px 18px;margin:6px 0 14px;padding:0;list-style:none}
    .steps li{display:flex;align-items:center;gap:8px;font-size:13.5px}
    .steps b{width:24px;height:24px;border-radius:50%;background:${f.tint};color:${c};display:inline-flex;align-items:center;justify-content:center;font-size:13px;flex:none}
    .sheet{border:3px solid ${c}44;border-radius:22px;padding:18px;display:flex;flex-direction:column;align-items:center;gap:12px;background:#fff}
    .hint{font-size:14px;margin:0;text-align:center}
    table{border-collapse:collapse}
    .chart th,.chart td{border:1.5px solid ${INK};padding:4px 8px;text-align:center;min-width:34px;font-size:16px}
    .chart th{background:${f.tint}}
    .chart.wide td{height:44px}
    .sw{display:inline-block;width:24px;height:24px}
    .match td{padding:3px 8px;font-size:26px}.match .dot{font-size:9px;color:${INK}}.match .gap{width:280px}
    .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px 28px}
    .cell{display:flex;flex-direction:column;align-items:center}
    .code{border:2px solid ${c};border-radius:16px;padding:3px 14px;font-weight:800;font-size:17px;margin-top:-6px;background:#fff}
    .pairs{display:grid;grid-template-columns:repeat(2,1fr);gap:16px 26px}.pair{display:flex;align-items:center;gap:8px}.arrow{font-size:22px}
    .keyrow{display:flex;gap:16px;padding:10px 16px;border-radius:18px;background:${f.tint}}.keyitem{display:flex;flex-direction:column;align-items:center;font-size:18px}
    .shapes5{display:grid;grid-template-columns:repeat(5,1fr);gap:8px 22px}.si{display:flex;flex-direction:column;align-items:center;gap:2px}
    .ans{display:inline-block;border:2px solid ${c}88;border-radius:8px;background:#fff}
    .coderow,.sumrow,.stackrow{display:flex;align-items:center;gap:6px}.eq,.op{font-size:22px;font-weight:800;margin:0 4px}
    .pattern td{border:1.3px solid ${INK};width:38px;height:38px;text-align:center;font-size:22px;font-weight:700}
    .example{font-size:16px;background:${f.tint};border-radius:14px;padding:8px 14px}
    .cmprow{display:flex;align-items:center;gap:6px;font-size:20px}.cmp{display:inline-flex;width:30px;height:30px;border:2px solid ${c};border-radius:6px;align-items:center;justify-content:center;font-weight:800;color:${c}}
    .lgrid td{border:1px solid #8A90AE;width:34px;height:34px;text-align:center;font-size:18px;font-weight:600}
    .lgrid tr:nth-child(odd) td:nth-child(even),.lgrid tr:nth-child(even) td:nth-child(odd){background:${f.tint}55}
    .wordlist{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 18px;border:2px dashed;border-radius:14px;padding:10px 14px;font-weight:700;font-size:15px;max-width:600px}
    .target{width:80px;height:80px;border:4px solid;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:46px;font-weight:900}
    .dots{display:grid;gap:10px}.cdot{width:40px;height:40px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:20px}
    .scene{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;border:3px dashed;border-radius:16px;padding:10px;font-size:34px;text-align:center}
    .theme{margin:0;font-size:24px}
    .dicetable td{padding:4px}.dicetable .box{border:1.5px solid ${INK};border-radius:8px;min-width:76px;height:38px;text-align:center;font-size:18px;font-weight:700}.gapcol{width:90px}.dice{white-space:nowrap}.dice svg{margin-right:3px}
    .three{display:flex;gap:26px;flex-wrap:wrap;justify-content:center}.row{margin:4px 0}
    .word{display:flex;align-items:flex-end;gap:6px;margin:6px 0;font-size:16px}.slot{display:flex;flex-direction:column;align-items:center}.line{display:block;width:28px;border-bottom:2px solid ${c};height:24px}.gapw{width:18px}
    .targets{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%}.target2{display:flex;align-items:center;gap:8px;border:2px solid ${c}55;border-radius:12px;padding:6px 10px;font-size:20px}
    .foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;font-size:12px;color:#6B7290}
    .stars{font-size:22px;letter-spacing:4px;color:${c}}
    .hero{display:flex;align-items:center;gap:8px;font-size:12.5px;line-height:1.3;background:${f.tint};border-radius:14px;padding:4px 12px 4px 4px;flex:none}
    .hero img{width:44px;height:44px;object-fit:contain}.hero span{font-size:30px}
  </style></head><body>
    <div class="head">${art}<div><h1>${esc(opts.title || f.name)}</h1><div class="sub">${esc(f.skill)} · about ${f.minutes} minutes</div></div><span class="lvl">${LEVEL_NAMES[level - 1]}</span></div>
    <div class="lines"><span>Name: ${esc(childName)}</span><span>Date:</span>${hero}</div>
    <ul class="steps">${f.steps.map((s, i) => `<li><b>${i + 1}</b>${esc(s)}</li>`).join('')}</ul>
    <div class="sheet">${body}</div>
    <div class="foot"><span>How did I do? <span class="stars">☆☆☆</span></span><span>Bloom Focus · Skill Builders</span></div>
  </body></html>`;
}
