/**
 * The 4-week plan: one goal and a few focus games per week. The current week's games lead the
 * child's daily training; parents see "Week 2 of 4". Pure TypeScript so it can be tested.
 */
import { t } from '../i18n';
import type { Session } from '../types';
import { TRAIN_BY_ID, TRAIN_IDS, type TrainTaskId } from './trainTasks';

export type PlanWeek = {
  /** One short goal in plain words, e.g. "Stay with one game for 2 minutes". */
  goal: string;
  /** 1–3 Focus games that lead the training this week. */
  games: TrainTaskId[];
};

export type MonthPlan = {
  /** Monday of week 1 (local date, YYYY-MM-DD). */
  start: string;
  weeks: PlanWeek[];
  createdAt: string;
};

export const PLAN_WEEKS = 4;
const DAY = 86400000;

/** Local YYYY-MM-DD for a date. */
export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fromYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The Monday on or after `d` (today if it is a Monday). */
export function nextMonday(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const add = (8 - x.getDay()) % 7;
  x.setDate(x.getDate() + add);
  return ymd(x);
}

/** The Monday of the current week. */
export function thisMonday(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return ymd(x);
}

/** Which week (0-based) is running on `now`; -1 before the start, PLAN_WEEKS once it has finished. */
export function weekIndex(plan: MonthPlan, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((today - fromYmd(plan.start).getTime()) / DAY);
  if (diff < 0) return -1;
  return Math.min(PLAN_WEEKS, Math.floor(diff / 7));
}

/** The running week, or null before the start and after the end. */
export function currentWeek(plan: MonthPlan | undefined, now = new Date()): { index: number; week: PlanWeek } | null {
  if (!plan) return null;
  const i = weekIndex(plan, now);
  if (i < 0 || i >= plan.weeks.length) return null;
  return { index: i, week: plan.weeks[i] };
}

/** First and last day of week `i`. */
export function weekDates(plan: MonthPlan, i: number): { from: Date; to: Date } {
  const from = fromYmd(plan.start);
  from.setDate(from.getDate() + i * 7);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);
  return { from, to };
}

/** Recent accuracy per Focus game (last 4 rounds), null when never played. */
export function gameAccuracy(sessions: Session[], childId: string): Record<TrainTaskId, number | null> {
  const out = {} as Record<TrainTaskId, number | null>;
  const mine = sessions.filter((s) => s.childId === childId).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const id of TRAIN_IDS) {
    const acc = mine
      .flatMap((s) => s.blocks)
      .filter((b) => b.taskId === id && b.accuracy !== null)
      .slice(0, 4)
      .map((b) => b.accuracy as number);
    out[id] = acc.length ? acc.reduce((a, b) => a + b, 0) / acc.length : null;
  }
  return out;
}

/**
 * A starting 4-week plan from the child's recent games: the two weakest skills get the most
 * time, one strong game keeps it encouraging, and week 4 reviews everything.
 */
export function suggestMonth(sessions: Session[], childId: string): PlanWeek[] {
  const acc = gameAccuracy(sessions, childId);
  const played = TRAIN_IDS.filter((id) => acc[id] !== null).sort((a, b) => (acc[a] as number) - (acc[b] as number));
  const fresh = TRAIN_IDS.filter((id) => acc[id] === null);
  const weak = [...played.slice(0, 3), ...fresh].slice(0, 3);
  const strong = played.length ? played[played.length - 1] : TRAIN_IDS[0];
  const [a, b, c] = [weak[0] ?? TRAIN_IDS[0], weak[1] ?? TRAIN_IDS[1], weak[2] ?? TRAIN_IDS[2]];
  const skill = (id: TrainTaskId) => t(TRAIN_BY_ID[id].skill);
  const uniq = (ids: TrainTaskId[]) => [...new Set(ids)];
  return [
    { goal: t('Settle in: short daily practice of {{skill}}', { skill: skill(a) }), games: uniq([a, strong]) },
    { goal: t('Build {{a}} and {{b}}', { a: skill(a), b: skill(b) }), games: uniq([a, b]) },
    { goal: t('Stretch: add {{skill}}', { skill: skill(c) }), games: uniq([b, c, a]) },
    { goal: t('Review and celebrate progress'), games: uniq([a, b, c]) },
  ];
}

/** How many days in week `i` the child played at least one of that week's games. */
export function weekPracticeDays(plan: MonthPlan, i: number, sessions: Session[], childId: string): number {
  const { from, to } = weekDates(plan, i);
  const end = to.getTime() + DAY;
  const games = new Set<string>(plan.weeks[i]?.games ?? []);
  const days = new Set<string>();
  for (const s of sessions) {
    const t = Date.parse(s.startedAt);
    if (s.childId !== childId || t < from.getTime() || t >= end) continue;
    if (s.blocks.some((b) => games.has(b.taskId))) days.add(new Date(t).toDateString());
  }
  return days.size;
}
