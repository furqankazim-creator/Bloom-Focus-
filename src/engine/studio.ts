/**
 * Game Studio: simple game templates a therapist fills with their own words and pictures.
 * Pure TypeScript (no React) so the generators and level rules can be tested on their own.
 */
import type { StudioContent, StudioGame, StudioPicture, StudioTemplate } from '../types';

export type TemplateInfo = {
  id: StudioTemplate;
  icon: string;
  name: string;
  /** One line for the therapist: what they provide → what the child does. */
  pitch: string;
  /** A content idea shown while editing. */
  tip: string;
  skill: string;
  color: string;
  tint: string;
  /** Default instructions shown to the family. */
  instructions: string;
  /** Has difficulty levels (the worksheet doesn't). */
  levelled: boolean;
};

export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'puzzle',
    icon: '🧩',
    name: 'Picture puzzle',
    pitch: 'Add any photo → the child puts the pieces back together',
    tip: 'A photo of the child’s pet, family or favourite toy works best.',
    skill: 'Visual attention',
    color: '#7B61FF',
    tint: '#EEEAFE',
    instructions: 'Tap two pieces to swap them. Peek at the picture if you get stuck.',
    levelled: true,
  },
  {
    id: 'wordsearch',
    icon: '🔤',
    name: 'Word search',
    pitch: 'Type a word list → the app builds the grid',
    tip: 'Use spelling words, family names or the current school topic.',
    skill: 'Selective attention',
    color: '#E0791F',
    tint: '#FCEBDC',
    instructions: 'Tap the first letter of a word, then its last letter.',
    levelled: true,
  },
  {
    id: 'worksheet',
    icon: '📝',
    name: 'Worksheet',
    pitch: 'Photo of any worksheet → the child draws on it and it comes back to you',
    tip: 'Mazes, colouring pages, matching sheets and printed puzzles all work.',
    skill: 'Following instructions',
    color: '#2F7FD0',
    tint: '#E1EEFB',
    instructions: 'Use your finger to circle or draw your answers, then tap “I’m finished”.',
    levelled: false,
  },
  {
    id: 'findit',
    icon: '👀',
    name: 'Find it',
    pitch: 'Pick a target picture and others → the child taps every target',
    tip: 'Use favourite characters or foods as the target.',
    skill: 'Visual attention',
    color: '#1DB988',
    tint: '#E3F6EE',
    instructions: 'Find and tap every target picture. Leave the others!',
    levelled: true,
  },
  {
    id: 'sequence',
    icon: '🧠',
    name: 'Remember the order',
    pitch: 'Enter steps or items → the child repeats them in order',
    tip: 'Perfect for routines: brush teeth → get dressed → breakfast.',
    skill: 'Working memory',
    color: '#D9467A',
    tint: '#FBE4EC',
    instructions: 'Watch the pictures light up, then tap them in the same order.',
    levelled: true,
  },
  {
    id: 'listen',
    icon: '👂',
    name: 'Listen for it',
    pitch: 'Choose a word to listen for → the child taps when they hear it',
    tip: 'Try the child’s name or a classroom keyword.',
    skill: 'Auditory attention',
    color: '#C28B00',
    tint: '#FBF1D3',
    instructions: 'Listen carefully and tap the big button only when you hear the word.',
    levelled: true,
  },
];

export const TEMPLATE = Object.fromEntries(TEMPLATES.map((t) => [t.id, t])) as Record<StudioTemplate, TemplateInfo>;

export const LEVELS = [
  { value: 1, label: 'Easy' },
  { value: 3, label: 'Medium' },
  { value: 5, label: 'Hard' },
] as const;

export const levelName = (level: number) => (level <= 2 ? 'Easy' : level <= 3 ? 'Medium' : 'Hard');

/** Ready-made examples so a therapist can start in one tap. */
export const EXAMPLES = {
  wordsearch: [
    { title: 'Space', words: ['MOON', 'STAR', 'MARS', 'NOVA', 'AXIS', 'COMET', 'ORBIT', 'ASTER', 'BLACK', 'LIGHT', 'VOID', 'DUST', 'SUN', 'SKY', 'SHIP', 'ROCK'] },
    { title: 'Animals', words: ['CAT', 'DOG', 'LION', 'BEAR', 'FISH', 'DUCK', 'FROG', 'GOAT', 'HORSE', 'TIGER'] },
    { title: 'Food', words: ['APPLE', 'BREAD', 'RICE', 'MILK', 'EGG', 'PIZZA', 'SOUP', 'CAKE', 'PEAR', 'JAM'] },
  ],
  findit: [
    { targetName: 'apple', target: '🍎', others: ['🍌', '🍇', '🍊', '🍐', '🍓'] },
    { targetName: 'dinosaur', target: '🦖', others: ['🐢', '🐊', '🐍', '🦎', '🐸'] },
    { targetName: 'star', target: '⭐', others: ['🌙', '☀️', '☁️', '⚡', '🌈'] },
  ],
  sequence: [
    {
      title: 'Morning routine',
      items: [
        { label: 'Wake up', emoji: '⏰' },
        { label: 'Brush teeth', emoji: '🪥' },
        { label: 'Get dressed', emoji: '👕' },
        { label: 'Breakfast', emoji: '🥣' },
        { label: 'Shoes on', emoji: '👟' },
        { label: 'School bag', emoji: '🎒' },
      ],
    },
    {
      title: 'Bedtime routine',
      items: [
        { label: 'Bath', emoji: '🛁' },
        { label: 'Pyjamas', emoji: '🩳' },
        { label: 'Brush teeth', emoji: '🪥' },
        { label: 'Story', emoji: '📖' },
        { label: 'Lights off', emoji: '💡' },
      ],
    },
  ],
  listen: [
    { target: 'apple', others: ['dog', 'car', 'tree', 'ball', 'house', 'sun', 'cup'] },
    { target: 'jump', others: ['sit', 'run', 'clap', 'stop', 'walk', 'wave', 'sleep'] },
  ],
} as const;

export const emojiPic = (value: string): StudioPicture => ({ kind: 'emoji', value });

/** Basic check that a game has enough content to play. Returns a message or null. */
export function contentProblem(c: StudioContent | null): string | null {
  if (!c) return 'Choose an activity type.';
  switch (c.template) {
    case 'puzzle':
      return c.image ? null : 'Add a picture for the puzzle.';
    case 'worksheet':
      return c.image ? null : 'Add a photo of the worksheet.';
    case 'wordsearch':
      return c.words.length >= 3 ? null : 'Add at least 3 words.';
    case 'findit':
      return c.targetName.trim() && c.others.length >= 2 ? null : 'Name the target and pick at least 2 other pictures.';
    case 'sequence':
      return c.items.length >= 3 ? null : 'Add at least 3 items.';
    case 'listen':
      return c.target.trim() && c.others.length >= 3 ? null : 'Add the word to listen for and at least 3 other words.';
  }
}

// ---------- Level settings ----------

const at = <T,>(xs: readonly T[], level: number) => xs[Math.max(0, Math.min(xs.length - 1, level - 1))];

export const puzzleSize = (level: number) => at([2, 3, 3, 4, 4], level);
/** Number labels on pieces help at the easier levels. */
export const puzzleNumbers = (level: number) => level <= 3;

/** dx, dy: right, down, diagonal ↘, left, up, ↗, ↙, ↖ */
const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Easy: across only. Harder levels add down, diagonals, then backwards words. */
export const wordSearchSettings = (level: number) => ({
  size: at([7, 8, 10, 11, 12], level),
  maxWords: at([4, 6, 8, 10, 12], level),
  dirs: at([DIRS.slice(0, 1), DIRS.slice(0, 2), DIRS.slice(0, 3), DIRS.slice(0, 5), DIRS], level),
});

export const findItSettings = (level: number) => ({
  cells: at([6, 9, 12, 16, 20], level),
  roundSec: at([0, 25, 20, 15, 12], level),
  rounds: 5,
});

export const sequenceSettings = (level: number) => ({ length: at([2, 3, 4, 5, 6], level), showMs: at([1300, 1100, 950, 850, 750], level), rounds: 4 });

export const listenSettings = (level: number) => ({ gapMs: at([2400, 2100, 1800, 1550, 1300], level), words: at([12, 14, 16, 18, 20], level) });

// ---------- Word search generator ----------

export type PlacedWord = { word: string; cells: number[] };
export type WordGrid = { size: number; letters: string[]; placed: PlacedWord[] };

/** Small seeded PRNG so a grid can be rebuilt identically. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export const cleanWord = (w: string) => w.toUpperCase().replace(/[^A-Z]/g, '');

export function buildWordGrid(words: string[], level: number, seed = Date.now()): WordGrid {
  const { size, maxWords, dirs } = wordSearchSettings(level);
  const rand = rng(seed);
  const pool = [...new Set(words.map(cleanWord).filter((w) => w.length >= 2 && w.length <= size))]
    // Easy levels use the shortest words; harder ones place long words first (they are hardest to fit).
    .sort((a, b) => (level <= 2 ? a.length - b.length : b.length - a.length))
    .slice(0, maxWords * 2);
  const letters: string[] = Array(size * size).fill('');
  const placed: PlacedWord[] = [];

  for (const word of pool) {
    if (placed.length >= maxWords) break;
    for (let attempt = 0; attempt < 120; attempt++) {
      const [dx, dy] = dirs[Math.floor(rand() * dirs.length)];
      const x0 = Math.floor(rand() * size);
      const y0 = Math.floor(rand() * size);
      const x1 = x0 + dx * (word.length - 1);
      const y1 = y0 + dy * (word.length - 1);
      if (x1 < 0 || x1 >= size || y1 < 0 || y1 >= size) continue;
      const cells = Array.from({ length: word.length }, (_, i) => (y0 + dy * i) * size + (x0 + dx * i));
      if (cells.some((c, i) => letters[c] && letters[c] !== word[i])) continue;
      cells.forEach((c, i) => (letters[c] = word[i]));
      placed.push({ word, cells });
      break;
    }
  }
  const ABC = 'ABCDEFGHIJKLMNOPRSTUVWY';
  for (let i = 0; i < letters.length; i++) if (!letters[i]) letters[i] = ABC[Math.floor(rand() * ABC.length)];
  return { size, letters, placed };
}

/** Cells on the straight line between two taps, or null when they aren't in a line. */
export function lineBetween(a: number, b: number, size: number): number[] | null {
  const ax = a % size;
  const ay = Math.floor(a / size);
  const bx = b % size;
  const by = Math.floor(b / size);
  const dx = Math.sign(bx - ax);
  const dy = Math.sign(by - ay);
  const len = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  if (!(ax === bx || ay === by || Math.abs(bx - ax) === Math.abs(by - ay))) return null;
  return Array.from({ length: len + 1 }, (_, i) => (ay + dy * i) * size + (ax + dx * i));
}

// ---------- Scoring & auto level ----------

export const starsFromAccuracy = (acc: number | null) => (acc === null ? 3 : acc >= 0.85 ? 3 : acc >= 0.6 ? 2 : 1);

/** Applies one play to the game's level when auto-adjust is on. */
export function nextLevel(game: StudioGame, stars: number): Pick<StudioGame, 'level' | 'streak'> & { changed: -1 | 0 | 1 } {
  if (!game.autoLevel || !TEMPLATE[game.content.template].levelled) return { level: game.level, streak: 0, changed: 0 };
  if (stars >= 3) {
    const streak = (game.streak ?? 0) + 1;
    if (streak >= 2 && game.level < 5) return { level: game.level + 1, streak: 0, changed: 1 };
    return { level: game.level, streak, changed: 0 };
  }
  if (stars <= 1 && game.level > 1) return { level: game.level - 1, streak: 0, changed: -1 };
  return { level: game.level, streak: 0, changed: 0 };
}

export function shuffle<T>(xs: T[], rand: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
