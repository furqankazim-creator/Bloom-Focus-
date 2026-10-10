/**
 * Activities grouped by problem area, so a therapist can go from "what I see in this child"
 * to the right practice in one tap. Each area lists the Focus games, Skill Builder worksheets,
 * create-your-own types and Fun Zone games that cover it (the clinic's own grouping).
 * Practice suggestions only — not a diagnosis.
 */
import type { LibraryFamilyId } from '../library/catalog';
import type { FunGameId } from '../navigation/types';
import type { Child, Domain, StudioTemplate as TemplateId } from '../types';
import type { TrainTaskId } from './trainTasks';

export type NeedId =
  | 'attention'
  | 'memory'
  | 'impulse'
  | 'speed'
  | 'flexibility'
  | 'reasoning'
  | 'instructions'
  | 'maths'
  | 'reading'
  | 'handwriting'
  | 'speech'
  | 'calm';

export type Need = {
  id: NeedId;
  emoji: string;
  /** The problem area, as the clinic names it. */
  title: string;
  /** What it looks like day to day. */
  signs: string;
  color: string;
  tint: string;
  /** Child focus areas that point to this area (used to suggest it). */
  domains: Domain[];
  /** Support-profile labels (e.g. “Speech & language”) that also point to it. */
  tags?: string[];
  focus: TrainTaskId[];
  worksheets: LibraryFamilyId[];
  create: TemplateId[];
  fun: FunGameId[];
};

export const NEEDS: Need[] = [
  {
    id: 'attention',
    emoji: '🎯',
    title: 'Focus and attention (ADHD-type)',
    signs: 'Drifts off, easily distracted, leaves tasks unfinished',
    color: '#2F5D46',
    tint: '#DDEEDA',
    domains: ['sustained', 'selective'],
    focus: ['starWatch', 'findTarget', 'flankerTask', 'dualTask'],
    worksheets: ['spotDifference', 'countShapes', 'symbolMatch', 'numberSearch'],
    create: ['findit'],
    fun: [],
  },
  {
    id: 'memory',
    emoji: '🧠',
    title: 'Memory',
    signs: 'Forgets what was just shown or said, loses track halfway',
    color: '#C2416B',
    tint: '#FBE3EC',
    domains: ['workingMemory'],
    focus: ['memoryEcho', 'memoryMatrix', 'blockBuilder', 'mazePath'],
    worksheets: ['stackSquares', 'colourConnect', 'numberSnake'],
    create: ['sequence'],
    fun: [],
  },
  {
    id: 'impulse',
    emoji: '🛑',
    title: 'Impulse control and hyperactivity',
    signs: 'Acts or answers without thinking, hard to wait',
    color: '#C2412D',
    tint: '#FCE3DD',
    domains: ['inhibition'],
    focus: ['goNoGo', 'colorClash'],
    worksheets: [],
    create: [],
    fun: [],
  },
  {
    id: 'speed',
    emoji: '⚡',
    title: 'Processing speed',
    signs: 'Knows the answer but takes a long time',
    color: '#D97706',
    tint: '#FFEBCC',
    domains: [],
    focus: ['speedMatch'],
    worksheets: ['colourSymbol'],
    create: [],
    fun: [],
  },
  {
    id: 'flexibility',
    emoji: '🔀',
    title: 'Flexibility (switching tasks, rigid thinking)',
    signs: 'Gets stuck when rules or routines change',
    color: '#0F8B8D',
    tint: '#D7F1F0',
    domains: ['flexibility'],
    focus: ['switchSort', 'colorClash'],
    worksheets: [],
    create: [],
    fun: [],
  },
  {
    id: 'reasoning',
    emoji: '🧩',
    title: 'IQ and reasoning',
    signs: 'Finds patterns, codes and puzzles hard',
    color: '#6D4BC2',
    tint: '#EAE3FB',
    domains: [],
    focus: ['puzzleMatch'],
    worksheets: ['continuePattern', 'shapeCode', 'findFigure', 'secretCode', 'numberTree'],
    create: ['puzzle'],
    fun: [],
  },
  {
    id: 'instructions',
    emoji: '📋',
    title: 'Following instructions',
    signs: 'Does step one, then gets lost',
    color: '#B7791F',
    tint: '#FFF1D2',
    domains: ['instructions'],
    focus: ['followSteps'],
    worksheets: ['rainbow'],
    create: [],
    fun: [],
  },
  {
    id: 'maths',
    emoji: '➕',
    title: 'Maths difficulty',
    signs: 'Counting, comparing and sums feel tricky',
    color: '#1E7A4F',
    tint: '#DDF3E6',
    domains: [],
    focus: [],
    worksheets: ['shapeSums', 'compareNumbers', 'mathSearch', 'numberSnake', 'diceMatch', 'numberTree'],
    create: [],
    fun: [],
  },
  {
    id: 'reading',
    emoji: '📖',
    title: 'Reading and eye tracking',
    signs: 'Skips lines, loses place on the page',
    color: '#3A4A96',
    tint: '#E1E5FA',
    domains: [],
    focus: [],
    worksheets: ['wordSearch', 'followLines'],
    create: ['wordsearch'],
    fun: [],
  },
  {
    id: 'handwriting',
    emoji: '✏️',
    title: 'Handwriting and fine motor',
    signs: 'Messy copying, trouble with lines and shapes',
    color: '#8A4B2A',
    tint: '#F5E6DC',
    domains: [],
    focus: [],
    worksheets: ['dotCopy', 'dotToDot', 'mirrorDraw', 'gridPatterns'],
    create: ['worksheet'],
    fun: ['dots'],
  },
  {
    id: 'speech',
    emoji: '🗣️',
    title: 'Speech, language & listening',
    signs: 'Few words, unclear speech, mishears or needs things repeated, trouble understanding or answering',
    color: '#D9480F',
    tint: '#FFE8DC',
    domains: ['auditory'],
    tags: ['Speech & language'],
    focus: ['listenFor', 'dualTask', 'followSteps'],
    worksheets: ['sayIt', 'soundDetective', 'listenDo', 'questionTime', 'oddOneOut', 'storySteps'],
    create: ['listen', 'puzzle', 'findit', 'sequence'],
    fun: [],
  },
  {
    id: 'calm',
    emoji: '💛',
    title: 'Calm and emotional regulation',
    signs: 'Big feelings, gives up or gets upset quickly',
    color: '#B58A00',
    tint: '#FFF5CC',
    domains: ['emotional'],
    focus: [],
    worksheets: [],
    create: [],
    fun: ['breathe'],
  },
];

export const NEED: Record<NeedId, Need> = Object.fromEntries(NEEDS.map((n) => [n.id, n])) as Record<NeedId, Need>;

/** Problem areas that match the child's focus area, most relevant first. */
export function suggestedNeeds(child: Child | undefined): Need[] {
  if (!child) return [];
  return NEEDS.filter((n) => n.domains.includes(child.focus) || n.tags?.some((tag) => child.diagnosis?.includes(tag)));
}

/** Every problem area an activity covers (for "Helps with" labels). */
export function needsFor(kind: 'focus' | 'worksheets' | 'create' | 'fun', id: string): Need[] {
  return NEEDS.filter((n) => (n[kind] as string[]).includes(id));
}

export const needTotal = (n: Need) => n.focus.length + n.worksheets.length + n.create.length + n.fun.length;
