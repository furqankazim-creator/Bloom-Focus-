import { describe, expect, it } from 'vitest';
import { STEP_DOWN_ACCURACY, STEP_UP_ACCURACY, adapt, blockAccuracy, taskLevel } from '../src/engine/adaptive';
import { BASE_PARAMS, TASKS } from '../src/engine/tasks';
import type { BlockMetrics, TaskState } from '../src/types';

const metrics = (acc: number, extra: Partial<BlockMetrics> = {}): BlockMetrics => ({
  trials: 20, hits: Math.round(acc * 20), misses: 20 - Math.round(acc * 20), falseTaps: 0, correctRejections: 0,
  meanRtMs: 600, earlyAccuracy: acc, lateAccuracy: acc, activeSec: 60, completed: true, ...extra,
});
const state = (): TaskState => ({ enabled: true, params: { ...BASE_PARAMS }, locked: [], streak: 0 });
const task = TASKS.starWatch;

describe('adaptive engine', () => {
  it('scores hits and correct rejections over trials', () => {
    expect(blockAccuracy(metrics(0.5))).toBe(0.5);
    expect(blockAccuracy({ ...metrics(1), trials: 0 })).toBeNull();
  });

  it('needs two strong blocks in a row before stepping up', () => {
    const one = adapt(task, state(), metrics(STEP_UP_ACCURACY));
    expect(one.next.streak).toBe(1);
    expect(taskLevel(task, one.next.params)).toBe(taskLevel(task, state().params));
    const two = adapt(task, one.next, metrics(0.95));
    expect(two.next.streak).toBe(0);
    expect(taskLevel(task, two.next.params)).toBeGreaterThanOrEqual(taskLevel(task, state().params));
    expect(two.changes.length).toBeGreaterThan(0);
  });

  it('keeps settings in the growth zone', () => {
    const r = adapt(task, state(), metrics((STEP_UP_ACCURACY + STEP_DOWN_ACCURACY) / 2));
    expect(r.changes).toHaveLength(0);
    expect(r.next.params).toEqual(state().params);
  });

  it('eases off after a hard block and resets the streak', () => {
    const s = { ...state(), streak: 1 };
    const r = adapt(task, s, metrics(0.3));
    expect(r.next.streak).toBe(0);
    expect(r.changes.some((c) => c.to <= c.from)).toBe(true);
  });

  it('never changes a locked setting', () => {
    const s = { ...state(), locked: [...task.dims] };
    const r = adapt(task, { ...s, streak: 1 }, metrics(1));
    expect(r.changes.filter((c) => c.dim !== 'reinforceEvery')).toHaveLength(0);
  });
});
