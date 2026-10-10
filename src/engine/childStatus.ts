/**
 * A child's practice status at a glance: how recently they practised, recent accuracy and its
 * trend, and which days they played this week. Pure TypeScript so it can be tested.
 */
import type { Session } from '../types';
import { sessionAccuracy } from './profile';

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export type PracticeStatus = 'today' | 'recent' | 'gap' | 'never';

export type ChildPulse = {
  status: PracticeStatus;
  /** Whole days since the last session (null = never played). */
  daysSince: number | null;
  /** Mean accuracy of the last 5 sessions, 0–1. */
  recent: number | null;
  /** Change against the 5 sessions before, in points (e.g. +4). */
  trend: number | null;
  /** Oldest → newest accuracies of the last 10 sessions, for a sparkline. */
  spark: number[];
  /** Days (0 = Monday) with practice this week. */
  weekDays: number[];
  /** Consecutive days with practice, ending today or yesterday. */
  streak: number;
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const accs = (list: Session[]) => list.map(sessionAccuracy).filter((v): v is number => v !== null);

export function childPulse(sessions: Session[], childId: string, gapDays = 4, now = new Date()): ChildPulse {
  const mine = sessions.filter((s) => s.childId === childId).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const today = startOfDay(now);
  const daysSince = mine[0] ? Math.round((today - startOfDay(new Date(mine[0].startedAt))) / DAY) : null;
  const status: PracticeStatus = daysSince === null ? 'never' : daysSince === 0 ? 'today' : daysSince < gapDays ? 'recent' : 'gap';
  const recent = mean(accs(mine.slice(0, 5)));
  const before = mean(accs(mine.slice(5, 10)));
  const monday = today - ((now.getDay() + 6) % 7) * DAY;
  const weekDays = [...new Set(mine.filter((s) => Date.parse(s.startedAt) >= monday).map((s) => Math.floor((startOfDay(new Date(s.startedAt)) - monday) / DAY)))].sort();
  const days = new Set(mine.map((s) => startOfDay(new Date(s.startedAt))));
  let streak = 0;
  for (let d = days.has(today) ? today : today - DAY; days.has(d); d -= DAY) streak++;
  return {
    status,
    daysSince,
    recent,
    trend: recent !== null && before !== null ? Math.round((recent - before) * 100) : null,
    spark: accs(mine.slice(0, 10)).reverse(),
    weekDays,
    streak,
  };
}

/** Colours and wording for each status (light tints that also read well on dark cards). */
export const STATUS = {
  today: { label: 'Practised today', color: '#2E9E6B', bg: '#E3F4E3' },
  recent: { label: 'Practised recently', color: '#B7791F', bg: '#FFF3D6' },
  gap: { label: 'Needs a nudge', color: '#C2412D', bg: '#FCE6E1' },
  never: { label: 'Not played yet', color: '#5E7268', bg: '#EEF0EA' },
} as const;
