import { describe, expect, it } from 'vitest';
import { PLAN_WEEKS, currentWeek, nextMonday, suggestMonth, thisMonday, weekIndex, weekPracticeDays, type MonthPlan } from '../src/engine/monthPlan';
import type { Session } from '../src/types';

const plan: MonthPlan = {
  start: '2026-09-28',
  weeks: [0, 1, 2, 3].map((i) => ({ goal: `Week ${i + 1}`, games: i === 1 ? ['flankerTask', 'switchSort'] : ['starWatch'] })),
  createdAt: '2026-09-27T10:00:00.000Z',
};

describe('4-week plan', () => {
  it('finds Monday dates', () => {
    expect(thisMonday(new Date(2026, 9, 6))).toBe('2026-10-05');
    expect(nextMonday(new Date(2026, 9, 6))).toBe('2026-10-12');
    expect(nextMonday(new Date(2026, 9, 5))).toBe('2026-10-05');
  });
  it('knows which week is running', () => {
    expect(weekIndex(plan, new Date(2026, 8, 27))).toBe(-1);
    expect(weekIndex(plan, new Date(2026, 8, 28))).toBe(0);
    expect(weekIndex(plan, new Date(2026, 9, 6))).toBe(1);
    expect(weekIndex(plan, new Date(2026, 10, 30))).toBe(PLAN_WEEKS);
    expect(currentWeek(plan, new Date(2026, 9, 6))?.week.games).toEqual(['flankerTask', 'switchSort']);
    expect(currentWeek(plan, new Date(2026, 10, 30))).toBeNull();
  });
  it('suggests four weeks of 1–3 games each', () => {
    const weeks = suggestMonth([], 'c1');
    expect(weeks).toHaveLength(4);
    for (const w of weeks) {
      expect(w.games.length).toBeGreaterThan(0);
      expect(w.games.length).toBeLessThanOrEqual(3);
      expect(w.goal.length).toBeGreaterThan(0);
    }
  });
  it('counts practice days that used the week’s games', () => {
    const s = (id: string, at: string, taskId: string) => ({ id, childId: 'c1', startedAt: at, blocks: [{ taskId, accuracy: 0.8 }] }) as unknown as Session;
    const sessions = [
      s('a', '2026-10-05T16:00:00', 'flankerTask'),
      s('b', '2026-10-05T18:00:00', 'switchSort'),
      s('c', '2026-10-06T16:00:00', 'starWatch'),
      s('d', '2026-10-07T16:00:00', 'switchSort'),
    ];
    expect(weekPracticeDays(plan, 1, sessions, 'c1')).toBe(2);
  });
});
