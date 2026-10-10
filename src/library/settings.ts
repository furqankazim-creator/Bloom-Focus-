/**
 * What a therapist can change in each Skill Builder, per level (Easy, Medium, Hard).
 * Each activity has two or three settings that matter; the defaults are the built-in levels.
 * Games and printable sheets read the resolved config instead of fixed level numbers.
 */
import type { LibraryFamilyId } from './catalog';
import type { Seg } from './patterns';

export type LevelConfig = Record<string, any>;
/** A therapist's changes, per level (1–3). Only changed keys are stored. */
export type LibraryCustom = Partial<Record<1 | 2 | 3, LevelConfig>>;

type Opt = { value: string | number | boolean; label: string };
export type Field =
  | { key: string; label: string; kind: 'choice'; options: Opt[] }
  | { key: string; label: string; kind: 'words'; placeholder: string; hint?: string; upper?: boolean; digits?: boolean }
  | { key: string; label: string; kind: 'patterns'; gridKey: string };

const nums = (xs: number[], suffix = '') => xs.map((n) => ({ value: n, label: `${n}${suffix}` }));
const yesNo: Opt[] = [{ value: false, label: 'No' }, { value: true, label: 'Yes' }];

type Spec = { fields: Field[]; defaults: [LevelConfig, LevelConfig, LevelConfig] };

export const SETTINGS: Record<LibraryFamilyId, Spec> = {
  symbolMatch: {
    fields: [
      { key: 'count', label: 'Pairs to join', kind: 'choice', options: nums([4, 6, 8, 12, 16, 20]) },
      { key: 'theme', label: 'Pictures', kind: 'choice', options: [{ value: 'symbols', label: 'Symbols' }, { value: 'lookalike', label: 'Look-alike symbols' }, { value: 'animals', label: 'Animals' }, { value: 'fruit', label: 'Fruit' }] },
    ],
    defaults: [{ count: 6, theme: 'symbols' }, { count: 12, theme: 'symbols' }, { count: 20, theme: 'lookalike' }],
  },
  colourConnect: {
    fields: [
      { key: 'dots', label: 'Dots in each circle', kind: 'choice', options: nums([4, 5, 6, 8]) },
      { key: 'codeLength', label: 'Code length', kind: 'choice', options: nums([3, 4, 5, 6]) },
      { key: 'puzzles', label: 'Puzzles', kind: 'choice', options: nums([2, 3, 4, 5, 6]) },
      { key: 'labels', label: 'Code uses', kind: 'choice', options: [{ value: 'letters', label: 'Letters' }, { value: 'numbers', label: 'Numbers' }] },
    ],
    defaults: [{ dots: 5, codeLength: 5, puzzles: 3, labels: 'letters' }, { dots: 6, codeLength: 6, puzzles: 3, labels: 'numbers' }, { dots: 8, codeLength: 6, puzzles: 5, labels: 'numbers' }],
  },
  dotCopy: {
    fields: [
      { key: 'grid', label: 'Dot grid', kind: 'choice', options: [{ value: 3, label: '3×3' }, { value: 4, label: '4×4' }, { value: 5, label: '5×5' }] },
      { key: 'count', label: 'Drawings to copy', kind: 'choice', options: nums([2, 3, 4, 5]) },
      { key: 'patterns', label: 'Your own drawings', kind: 'patterns', gridKey: 'grid' },
    ],
    defaults: [{ grid: 3, count: 3, patterns: [] }, { grid: 4, count: 3, patterns: [] }, { grid: 5, count: 3, patterns: [] }],
  },
  shapeCode: {
    fields: [
      { key: 'key', label: 'Code key', kind: 'choice', options: [{ value: 1, label: 'Shape → number' }, { value: 2, label: 'Shape + colour' }, { value: 3, label: 'Look-alike letters' }] },
      { key: 'rows', label: 'Rows of shapes', kind: 'choice', options: nums([2, 3, 4, 5]) },
    ],
    defaults: [{ key: 1, rows: 3 }, { key: 2, rows: 4 }, { key: 3, rows: 4 }],
  },
  shapeSums: {
    fields: [
      { key: 'terms', label: 'Shapes in each sum', kind: 'choice', options: nums([2, 3, 4]) },
      { key: 'minus', label: 'Include take-away', kind: 'choice', options: yesNo },
      { key: 'questions', label: 'Sums', kind: 'choice', options: nums([4, 6, 8, 10]) },
    ],
    defaults: [{ terms: 2, minus: false, questions: 6 }, { terms: 3, minus: false, questions: 6 }, { terms: 3, minus: true, questions: 6 }],
  },
  continuePattern: {
    fields: [
      { key: 'period', label: 'Pattern repeats every', kind: 'choice', options: nums([2, 3, 4, 5]) },
      { key: 'rows', label: 'Rows', kind: 'choice', options: nums([2, 3, 4, 6]) },
    ],
    defaults: [{ period: 2, rows: 4 }, { period: 3, rows: 4 }, { period: 4, rows: 4 }],
  },
  compareNumbers: {
    fields: [
      { key: 'max', label: 'Numbers up to', kind: 'choice', options: nums([5, 9, 20, 50, 99]) },
      { key: 'length', label: 'Numbers in a row', kind: 'choice', options: nums([4, 5, 6, 8]) },
      { key: 'rows', label: 'Rows', kind: 'choice', options: nums([3, 4, 5, 6]) },
    ],
    defaults: [{ max: 9, length: 5, rows: 4 }, { max: 9, length: 8, rows: 5 }, { max: 99, length: 8, rows: 5 }],
  },
  numberSearch: {
    fields: [
      { key: 'digits', label: 'Number length', kind: 'choice', options: [{ value: 2, label: '2 digits' }, { value: 3, label: '3 digits' }, { value: 34, label: '3–4 digits' }, { value: 4, label: '4 digits' }] },
      { key: 'count', label: 'Numbers to find', kind: 'choice', options: nums([4, 5, 7, 9, 12]) },
      { key: 'size', label: 'Grid size', kind: 'choice', options: [{ value: 6, label: '6×6' }, { value: 8, label: '8×8' }, { value: 10, label: '10×10' }] },
    ],
    defaults: [{ digits: 3, count: 5, size: 8 }, { digits: 34, count: 7, size: 10 }, { digits: 4, count: 9, size: 10 }],
  },
  mathSearch: {
    fields: [
      { key: 'target', label: 'Big number', kind: 'choice', options: nums([5, 6, 7, 8, 9, 10, 12, 15, 20]) },
      { key: 'op', label: 'Pairs that', kind: 'choice', options: [{ value: '+', label: 'Add up' }, { value: '-', label: 'Take away' }] },
      { key: 'find', label: 'Pairs to find', kind: 'choice', options: nums([3, 5, 7, 9]) },
    ],
    defaults: [{ target: 10, op: '+', find: 5, size: 6 }, { target: 8, op: '+', find: 7, size: 8 }, { target: 6, op: '-', find: 7, size: 8 }],
  },
  numberSnake: {
    fields: [
      { key: 'steps', label: 'Steps', kind: 'choice', options: nums([4, 6, 8, 12, 16, 20]) },
      { key: 'maxStep', label: 'Biggest + or −', kind: 'choice', options: nums([2, 3, 5, 6, 7, 9]) },
    ],
    defaults: [{ steps: 6, maxStep: 3 }, { steps: 12, maxStep: 6 }, { steps: 20, maxStep: 7 }],
  },
  stackSquares: {
    fields: [
      { key: 'grid', label: 'Card size', kind: 'choice', options: [{ value: 2, label: '2×2' }, { value: 3, label: '3×3' }, { value: 4, label: '4×4' }] },
      { key: 'cards', label: 'Cards to stack', kind: 'choice', options: nums([2, 3]) },
    ],
    defaults: [{ grid: 2, cards: 2 }, { grid: 3, cards: 2 }, { grid: 3, cards: 3 }],
  },
  colourSymbol: {
    fields: [
      { key: 'style', label: 'Marks', kind: 'choice', options: [{ value: 'faces', label: 'Faces' }, { value: 'marks', label: 'Lines & shapes' }] },
      { key: 'colours', label: 'Colours', kind: 'choice', options: nums([3, 4, 5]) },
      { key: 'dots', label: 'Dots', kind: 'choice', options: nums([12, 20, 24, 30, 40]) },
    ],
    defaults: [{ style: 'faces', colours: 4, dots: 20 }, { style: 'marks', colours: 4, dots: 24 }, { style: 'marks', colours: 5, dots: 40 }],
  },
  spotDifference: {
    fields: [
      { key: 'theme', label: 'Picture', kind: 'choice', options: [{ value: 'random', label: 'Surprise me' }, { value: 'town', label: 'Town' }, { value: 'camping', label: 'Camping' }, { value: 'sea', label: 'Under the sea' }, { value: 'heroes', label: 'Child’s heroes' }] },
      { key: 'diffs', label: 'Differences', kind: 'choice', options: nums([2, 3, 5, 8, 10]) },
    ],
    defaults: [{ theme: 'random', diffs: 3 }, { theme: 'random', diffs: 5 }, { theme: 'random', diffs: 8 }],
  },
  rainbow: {
    fields: [
      { key: 'bands', label: 'Bands', kind: 'choice', options: nums([3, 4, 5, 7]) },
      { key: 'repeats', label: 'Colours repeat', kind: 'choice', options: yesNo },
      { key: 'rainbows', label: 'Rainbows', kind: 'choice', options: nums([2, 3, 4, 6]) },
    ],
    defaults: [{ bands: 4, repeats: false, rainbows: 2 }, { bands: 7, repeats: false, rainbows: 3 }, { bands: 7, repeats: true, rainbows: 4 }],
  },
  wordSearch: {
    fields: [
      { key: 'theme', label: 'Theme', kind: 'choice', options: [{ value: 'Spring', label: 'Spring' }, { value: 'Space', label: 'Space' }, { value: 'Museum', label: 'Museum' }, { value: 'Vacation', label: 'Vacation' }] },
      { key: 'words', label: 'Your own words', kind: 'words', placeholder: 'e.g. ALI, MUM, CAT, SCHOOL', hint: 'Leave empty to use the theme’s words.', upper: true },
      { key: 'grid', label: 'Grid', kind: 'choice', options: [{ value: 1, label: 'Small · across' }, { value: 2, label: 'Small · across & down' }, { value: 3, label: 'Medium' }, { value: 4, label: 'Large' }, { value: 5, label: 'Large · all ways' }] },
    ],
    defaults: [{ theme: 'Spring', words: [], grid: 2 }, { theme: 'Space', words: [], grid: 3 }, { theme: 'Museum', words: [], grid: 4 }],
  },
  followLines: {
    fields: [
      { key: 'fruits', label: 'Fruits', kind: 'choice', options: nums([3, 4, 5, 6]) },
      { key: 'rows', label: 'Rows of numbers', kind: 'choice', options: nums([1, 2, 3, 4]) },
    ],
    defaults: [{ fruits: 4, rows: 2 }, { fruits: 5, rows: 3 }, { fruits: 6, rows: 4 }],
  },
  diceMatch: {
    fields: [
      { key: 'max', label: 'Numbers up to', kind: 'choice', options: [{ value: 6, label: '6 (count the dots)' }, { value: 12, label: '12 (two dice)' }, { value: 18, label: '18 (three dice)' }] },
      { key: 'questions', label: 'Questions', kind: 'choice', options: nums([5, 8, 10]) },
    ],
    defaults: [{ max: 6, questions: 8 }, { max: 12, questions: 8 }, { max: 18, questions: 8 }],
  },
  dotToDot: {
    fields: [
      { key: 'picture', label: 'Picture', kind: 'choice', options: [{ value: 'random', label: 'Surprise me' }, { value: 'star', label: 'Star' }, { value: 'house', label: 'House' }, { value: 'fish', label: 'Fish' }, { value: 'rocket', label: 'Rocket' }, { value: 'heart', label: 'Heart' }] },
      { key: 'dots', label: 'Dots', kind: 'choice', options: nums([8, 12, 20, 25, 35, 45]) },
    ],
    defaults: [{ picture: 'random', dots: 12 }, { picture: 'random', dots: 25 }, { picture: 'random', dots: 45 }],
  },
  countShapes: {
    fields: [
      { key: 'shapes', label: 'Shapes in the picture', kind: 'choice', options: nums([6, 9, 11, 14, 16, 20]) },
      { key: 'overlap', label: 'Shapes overlap', kind: 'choice', options: yesNo },
      { key: 'colourful', label: 'Mixed colours', kind: 'choice', options: yesNo },
    ],
    defaults: [{ shapes: 6, overlap: false, colourful: false }, { shapes: 11, overlap: true, colourful: false }, { shapes: 16, overlap: true, colourful: true }],
  },
  mirrorDraw: {
    fields: [
      { key: 'lines', label: 'Lines in each half', kind: 'choice', options: nums([3, 5, 8, 11]) },
      { key: 'diagonals', label: 'Diagonal lines', kind: 'choice', options: yesNo },
    ],
    defaults: [{ lines: 5, diagonals: false }, { lines: 8, diagonals: true }, { lines: 11, diagonals: true }],
  },
  gridPatterns: {
    fields: [{ key: 'style', label: 'Patterns', kind: 'choice', options: [{ value: 1, label: 'Squares' }, { value: 2, label: 'Squares & diamonds' }, { value: 3, label: 'Zigzags & triangles' }] }],
    defaults: [{ style: 1 }, { style: 2 }, { style: 3 }],
  },
  numberTree: {
    fields: [
      { key: 'base', label: 'Bottom row', kind: 'choice', options: nums([3, 4, 5], ' boxes') },
      { key: 'max', label: 'Bottom numbers up to', kind: 'choice', options: nums([3, 5, 6, 9]) },
      { key: 'missing', label: 'Hide a bottom number', kind: 'choice', options: yesNo },
    ],
    defaults: [{ base: 3, max: 3, missing: false }, { base: 4, max: 5, missing: false }, { base: 4, max: 6, missing: true }],
  },
  secretCode: {
    fields: [{ key: 'words', label: 'Words to decode', kind: 'words', placeholder: 'e.g. ALI, SCHOOL, PLAY', hint: 'Leave empty for the built-in words.', upper: true }],
    defaults: [{ words: [] }, { words: [] }, { words: [] }],
  },
  findFigure: {
    fields: [
      { key: 'targets', label: 'Figures to count', kind: 'choice', options: nums([2, 3, 4, 6]) },
      { key: 'count', label: 'Figures on the page', kind: 'choice', options: nums([18, 24, 36, 44]) },
      { key: 'rotate', label: 'Turned any way', kind: 'choice', options: yesNo },
    ],
    defaults: [{ targets: 3, count: 24, rotate: false }, { targets: 6, count: 36, rotate: true }, { targets: 6, count: 44, rotate: true }],
  },
  sayIt: {
    fields: [
      { key: 'words', label: 'Pictures', kind: 'choice', options: [{ value: 'easy', label: 'Everyday words' }, { value: 'nouns', label: 'All picture words' }, { value: 'actions', label: 'Action words' }] },
      { key: 'own', label: 'Your own words (target sounds)', kind: 'words', placeholder: 'e.g. sun, sock, seven', hint: 'Leave empty to use the pictures. Own words are shown as text.' },
      { key: 'count', label: 'Cards', kind: 'choice', options: nums([4, 6, 8, 10, 12]) },
      { key: 'showWord', label: 'Show the written word', kind: 'choice', options: yesNo },
      { key: 'record', label: 'Record & hear yourself', kind: 'choice', options: yesNo },
    ],
    defaults: [{ words: 'easy', own: [], count: 6, showWord: true, record: true }, { words: 'nouns', own: [], count: 8, showWord: false, record: true }, { words: 'actions', own: [], count: 8, showWord: false, record: true }],
  },
  soundDetective: {
    fields: [
      { key: 'choices', label: 'Pictures to choose from', kind: 'choice', options: nums([2, 3, 4]) },
      { key: 'rounds', label: 'Sounds', kind: 'choice', options: nums([4, 6, 8, 10]) },
      { key: 'tricky', label: 'Include sounds that are easy to mix up', kind: 'choice', options: yesNo },
    ],
    defaults: [{ choices: 2, rounds: 6, tricky: false }, { choices: 3, rounds: 8, tricky: false }, { choices: 4, rounds: 8, tricky: true }],
  },
  oddOneOut: {
    fields: [
      { key: 'kind', label: 'Groups', kind: 'choice', options: [{ value: 'far', label: 'Very different' }, { value: 'close', label: 'Close (fruit vs vegetables)' }, { value: 'think', label: 'Think harder (what things do)' }] },
      { key: 'rounds', label: 'Rounds', kind: 'choice', options: nums([4, 6, 8]) },
    ],
    defaults: [{ kind: 'far', rounds: 6 }, { kind: 'close', rounds: 6 }, { kind: 'think', rounds: 6 }],
  },
  listenDo: {
    fields: [
      { key: 'keyWords', label: 'Key words to listen for', kind: 'choice', options: [{ value: 1, label: '1 · “the star”' }, { value: 2, label: '2 · “the red star”' }, { value: 3, label: '3 · “the small red star”' }] },
      { key: 'containers', label: 'Add “put it in the …”', kind: 'choice', options: yesNo },
      { key: 'showText', label: 'Show the instruction as text', kind: 'choice', options: yesNo },
      { key: 'rounds', label: 'Instructions', kind: 'choice', options: nums([4, 5, 6, 8]) },
    ],
    defaults: [{ keyWords: 1, containers: false, showText: true, rounds: 5 }, { keyWords: 2, containers: false, showText: true, rounds: 6 }, { keyWords: 3, containers: true, showText: false, rounds: 6 }],
  },
  questionTime: {
    fields: [
      { key: 'kind', label: 'Questions', kind: 'choice', options: [{ value: 'which', label: '“Which one is the …?”' }, { value: 'what', label: '“What do we … with?”' }, { value: 'think', label: 'Who / where / which' }] },
      { key: 'choices', label: 'Pictures to choose from', kind: 'choice', options: nums([2, 3, 4]) },
      { key: 'showText', label: 'Show the question as text', kind: 'choice', options: yesNo },
      { key: 'rounds', label: 'Questions', kind: 'choice', options: nums([4, 6, 8, 10]) },
    ],
    defaults: [{ kind: 'which', choices: 3, showText: true, rounds: 6 }, { kind: 'what', choices: 3, showText: true, rounds: 8 }, { kind: 'think', choices: 4, showText: false, rounds: 8 }],
  },
  storySteps: {
    fields: [
      { key: 'steps', label: 'Pictures in each story', kind: 'choice', options: nums([3, 4, 5]) },
      { key: 'stories', label: 'Stories', kind: 'choice', options: nums([1, 2, 3]) },
      { key: 'tell', label: 'Record the child telling it', kind: 'choice', options: yesNo },
    ],
    defaults: [{ steps: 3, stories: 1, tell: true }, { steps: 4, stories: 2, tell: true }, { steps: 5, stories: 2, tell: true }],
  },
};

/** The settings for one level: built-in defaults with the therapist's changes on top. */
export function configFor(family: LibraryFamilyId, level: number, custom?: LibraryCustom): LevelConfig {
  const lv = Math.min(3, Math.max(1, level)) as 1 | 2 | 3;
  return { ...SETTINGS[family].defaults[lv - 1], ...(custom?.[lv] ?? {}) };
}

/** Short summary of a level's settings, e.g. "12 pairs · Animals". */
export function describeConfig(family: LibraryFamilyId, cfg: LevelConfig): string {
  return SETTINGS[family].fields
    .map((f) => {
      const v = cfg[f.key];
      if (f.kind === 'choice') return f.options.find((o) => o.value === v)?.label ? `${f.label}: ${f.options.find((o) => o.value === v)!.label}` : null;
      if (f.kind === 'words') return Array.isArray(v) && v.length ? `${v.length} own words` : null;
      if (f.kind === 'patterns') return Array.isArray(v) && v.length ? `${v.length} own drawings` : null;
      return null;
    })
    .filter(Boolean)
    .join(' · ');
}

export type PatternList = Seg[][];
