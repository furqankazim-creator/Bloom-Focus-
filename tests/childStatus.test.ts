import { describe, expect, it } from 'vitest';
import { childPulse } from '../src/engine/childStatus';
import type { Session } from '../src/types';

const now = new Date(2026, 9, 7, 15); // Wednesday
const s = (id: string, daysAgo: number, acc: number) =>
  ({ id, childId: 'c', startedAt: new Date(2026, 9, 7 - daysAgo, 10).toISOString(), blocks: [{ taskId: 'starWatch', accuracy: acc }] }) as unknown as Session;

describe('child pulse', () => {
  it('reports never for a child with no sessions', () => {
    const p = childPulse([], 'c', 4, now);
    expect(p.status).toBe('never');
    expect(p.daysSince).toBeNull();
    expect(p.streak).toBe(0);
  });
  it('knows today, recent and needs-a-nudge', () => {
    expect(childPulse([s('a', 0, 0.8)], 'c', 4, now).status).toBe('today');
    expect(childPulse([s('a', 2, 0.8)], 'c', 4, now).status).toBe('recent');
    expect(childPulse([s('a', 5, 0.8)], 'c', 4, now).status).toBe('gap');
  });
  it('counts the streak and this week’s days', () => {
    const p = childPulse([s('a', 0, 0.8), s('b', 1, 0.7), s('c', 2, 0.9), s('d', 4, 0.6)], 'c', 4, now);
    expect(p.streak).toBe(3);
    expect(p.weekDays).toEqual([0, 1, 2]); // Mon, Tue, Wed
  });
  it('compares the last five sessions with the five before', () => {
    const list = [...Array(10)].map((_, i) => s(String(i), i, i < 5 ? 0.9 : 0.7));
    expect(childPulse(list, 'c', 4, now).trend).toBe(20);
  });
});
