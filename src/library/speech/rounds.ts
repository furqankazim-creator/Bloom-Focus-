/**
 * Builds the rounds for each Speech & language activity from a seed and the level settings.
 * Pure TypeScript (no React) so tests can check every level makes sensible, solvable rounds.
 */
import {
  CAT_NAME,
  CONFUSABLE,
  NOUNS,
  ODD_HARD,
  ODD_MEDIUM,
  OBJ_SHAPE,
  Q_FUNCTION,
  Q_REASON,
  STORIES,
  WORD,
  WORDS,
  firstSound,
  soundFriendly,
  soundKey,
  storyIndexes,
  type Cat,
  type Container,
  type Instruction,
  type Lang,
  type Obj,
  type ObjColour,
  type ObjKind,
  type Story,
  type Tr,
  type Word,
} from './data';

type Rand = () => number;
export function rng(seed: number): Rand {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const shuffle = <T,>(xs: T[], r: Rand) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = <T,>(xs: T[], r: Rand) => xs[Math.floor(r() * xs.length)];
const take = <T,>(xs: T[], n: number, r: Rand) => shuffle(xs, r).slice(0, n);

/* ——— Say It! ——— */

export type SayCard = { emoji: string; word: string; isAction: boolean };

export function sayItDeck(cfg: { words?: string; count?: number; own?: string[] }, lang: Lang, r: Rand): SayCard[] {
  const count = cfg.count ?? 6;
  if (cfg.words === 'own' && cfg.own?.length) return take(cfg.own, Math.min(count, cfg.own.length), r).map((word) => ({ emoji: '🗣️', word, isAction: false }));
  const pool = cfg.words === 'actions' ? WORDS.filter((x) => x.cat === 'actions') : cfg.words === 'easy' ? NOUNS.filter((x) => x.easy) : NOUNS;
  return take(pool, Math.min(count, pool.length), r).map((x) => ({ emoji: x.emoji, word: x[lang], isAction: x.cat === 'actions' }));
}

/* ——— Sound Detective ——— */

export type SoundRound = { letter: string; answer: Word; options: Word[] };

export function soundRounds(cfg: { rounds?: number; choices?: number; tricky?: boolean }, lang: Lang, r: Rand): SoundRound[] {
  const pool = NOUNS.filter((x) => soundFriendly(x, lang));
  const key = (x: Word) => soundKey(firstSound(x[lang], lang), lang);
  const choices = cfg.choices ?? 3;
  const out: SoundRound[] = [];
  const used = new Set<string>();
  for (const answer of shuffle(pool, r)) {
    if (out.length >= (cfg.rounds ?? 6)) break;
    const k = key(answer);
    if (used.has(k) && used.size < 8) continue; // vary the sounds
    const others = pool.filter((x) => key(x) !== k);
    let options: Word[] = [];
    if (cfg.tricky) {
      const pair = CONFUSABLE[lang].find((p) => p.includes(firstSound(answer[lang], lang)));
      const near = pair ? others.filter((x) => pair.includes(firstSound(x[lang], lang))) : [];
      if (near.length) options.push(pick(near, r));
    }
    // Distractors with different first sounds from the answer and from each other.
    for (const x of shuffle(others, r)) {
      if (options.length >= choices - 1) break;
      if (!options.some((o) => key(o) === key(x))) options.push(x);
    }
    if (options.length < choices - 1) continue;
    used.add(k);
    out.push({ letter: firstSound(answer[lang], lang), answer, options: shuffle([answer, ...options], r) });
  }
  return out;
}

/* ——— Odd One Out ——— */

export type OddRound = { items: Word[]; odd: Word; group: Tr };

const FOOD_GROUP: Cat[] = ['fruit', 'vegetables', 'food'];
const NOUN_CATS: Cat[] = ['animals', 'fruit', 'vegetables', 'food', 'clothes', 'vehicles', 'home', 'nature', 'body'];

export function oddRounds(cfg: { rounds?: number; kind?: 'far' | 'close' | 'think' }, r: Rand): OddRound[] {
  const n = cfg.rounds ?? 6;
  const byCat = (c: Cat) => NOUNS.filter((x) => x.cat === c);
  const out: OddRound[] = [];
  if (cfg.kind === 'think') {
    for (const set of take(ODD_HARD, n, r)) {
      out.push({ items: [], odd: WORD[pick(set.odd, r)], group: set.group });
      const last = out[out.length - 1];
      last.items = shuffle([...take(set.members, 3, r).map((id) => WORD[id]), last.odd], r);
    }
    return out;
  }
  for (let i = 0; i < n; i++) {
    let a: Cat;
    let b: Cat;
    if (cfg.kind === 'close') [a, b] = pick(ODD_MEDIUM, r);
    else {
      a = pick(NOUN_CATS, r);
      const far = NOUN_CATS.filter((c) => c !== a && !(FOOD_GROUP.includes(a) && FOOD_GROUP.includes(c)));
      b = pick(far, r);
    }
    const odd = pick(byCat(b), r);
    out.push({ items: shuffle([...take(byCat(a), 3, r), odd], r), odd, group: CAT_NAME[a] });
  }
  return out;
}

/* ——— Question Time ——— */

export type QRound = { question: Tr | { word: Word }; answer: Word; options: Word[] };

export function questionRounds(cfg: { rounds?: number; kind?: 'which' | 'what' | 'think'; choices?: number }, r: Rand): QRound[] {
  const n = cfg.rounds ?? 6;
  const choices = cfg.choices ?? 3;
  const optionsFor = (answer: Word, also: string[] = []) => {
    const bad = new Set([answer.id, ...also]);
    // Distractors from other categories so only one answer is right.
    const pool = NOUNS.filter((x) => !bad.has(x.id) && x.cat !== answer.cat);
    return shuffle([answer, ...take(pool, choices - 1, r)], r);
  };
  if (cfg.kind === 'which' || !cfg.kind) {
    return take(NOUNS.filter((x) => x.easy), n, r).map((answer) => ({ question: { word: answer }, answer, options: optionsFor(answer) }));
  }
  const bank = cfg.kind === 'what' ? Q_FUNCTION : Q_REASON;
  return take(bank, n, r).map((q) => {
    const answer = WORD[q.answer];
    return { question: q.q, answer, options: optionsFor(answer, q.also) };
  });
}

/* ——— Listen & Do ——— */

const KINDS: ObjKind[] = ['ball', 'star', 'heart', 'block'];
const COLOURS: ObjColour[] = ['red', 'blue', 'yellow', 'green'];
const CONTAINERS: Container[] = ['box', 'bag', 'basket'];
const same = (a: Obj, b: Obj) => a.kind === b.kind && a.colour === b.colour && a.size === b.size;

export type ListenRound = { objects: Obj[]; ins: Instruction; containers: Container[] };

/** 1 key word: which object. 2: object + colour (or size). 3: size + colour + object, then where to put it. */
export function listenRounds(cfg: { rounds?: number; keyWords?: number; containers?: boolean }, r: Rand): ListenRound[] {
  const kw = cfg.keyWords ?? 1;
  const out: ListenRound[] = [];
  for (let i = 0; i < (cfg.rounds ?? 5); i++) {
    const target: Obj = { kind: pick(KINDS, r), colour: pick(COLOURS, r), size: r() < 0.5 ? 'big' : 'small' };
    let objects: Obj[] = [target];
    let use = { colour: false, size: false };
    if (kw <= 1) {
      // Different objects, same colour and size: only the object word matters.
      objects = take(KINDS, 4, r).map((kind) => ({ kind, colour: target.colour, size: target.size }));
      objects = objects.map((o) => (o.kind === target.kind ? target : o));
      if (!objects.some((o) => same(o, target))) objects[0] = target;
    } else if (kw === 2) {
      const bySize = r() < 0.35;
      use = { colour: !bySize, size: bySize };
      const otherKind = pick(KINDS.filter((k) => k !== target.kind), r);
      if (bySize) {
        const flip = target.size === 'big' ? 'small' : 'big';
        objects.push({ ...target, size: flip }, { kind: otherKind, colour: target.colour, size: target.size }, { kind: otherKind, colour: target.colour, size: flip });
      } else {
        const otherColour = pick(COLOURS.filter((c) => c !== target.colour), r);
        objects.push({ ...target, colour: otherColour }, { kind: otherKind, colour: target.colour, size: target.size }, { kind: otherKind, colour: otherColour, size: target.size });
      }
    } else {
      use = { colour: true, size: true };
      const otherColour = pick(COLOURS.filter((c) => c !== target.colour), r);
      const otherKind = pick(KINDS.filter((k) => k !== target.kind), r);
      const flip = target.size === 'big' ? 'small' : 'big';
      objects.push({ ...target, size: flip }, { ...target, colour: otherColour }, { ...target, kind: otherKind }, { kind: otherKind, colour: otherColour, size: flip }, { ...target, colour: otherColour, size: flip });
    }
    objects = shuffle(objects.filter((o, j, a) => a.findIndex((x) => same(x, o)) === j), r);
    const containers = kw >= 3 && cfg.containers !== false ? take(CONTAINERS, 3, r) : [];
    out.push({ objects, ins: { target, use, container: containers.length ? pick(containers, r) : undefined }, containers });
  }
  return out;
}

/** Does tapping `o` satisfy the instruction? (Only the words said count.) */
export function matches(o: Obj, ins: Instruction): boolean {
  return o.kind === ins.target.kind && (!ins.use.colour || o.colour === ins.target.colour) && (!ins.use.size || o.size === ins.target.size);
}
export { OBJ_SHAPE };

/* ——— Story Steps ——— */

export type StoryRound = { story: Story; order: number[]; shuffled: number[] };

export function storyRounds(cfg: { steps?: number; stories?: number }, r: Rand): StoryRound[] {
  const order = storyIndexes(cfg.steps ?? 3);
  return take(STORIES, cfg.stories ?? 1, r).map((story) => {
    let shuffled = shuffle(order, r);
    // Never start already in order.
    if (shuffled.every((v, i) => v === order[i])) shuffled = [...shuffled.slice(1), shuffled[0]];
    return { story, order, shuffled };
  });
}
