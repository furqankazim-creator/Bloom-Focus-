import { describe, expect, it } from 'vitest';
import { FEELING, FEELINGS, PROBLEMS, SITUATIONS, STRATEGIES, groundingSteps } from '../src/library/calm/data';
import { feelingRounds, problemRounds, toolboxRounds } from '../src/library/calm/rounds';
import { rng } from '../src/library/speech/rounds';

const SEEDS = [1, 7, 42, 99, 1234, 2026];
const LANGS = ['en', 'ar', 'ur'] as const;

describe('calm content', () => {
  it('is written in all three languages', () => {
    for (const f of FEELINGS) for (const l of LANGS) expect(f.name[l].length).toBeGreaterThan(0);
    for (const x of [...SITUATIONS, ...PROBLEMS, ...STRATEGIES]) for (const l of LANGS) expect(x.text[l].length, x.id).toBeGreaterThan(0);
  });
  it('grounding counts down 5-4-3-2-1', () => {
    expect(groundingSteps(5).map((s) => s.count)).toEqual([5, 4, 3, 2, 1]);
    expect(groundingSteps(3).map((s) => `${s.sense.id}${s.count}`)).toEqual(['see3', 'touch2', 'hear1']);
  });
});

describe('Feelings Faces', () => {
  it('has one fair answer per round', () => {
    for (const kind of ['basic', 'faces', 'stories'] as const)
      for (const seed of SEEDS)
        for (const rd of feelingRounds({ kind, rounds: 8, choices: kind === 'basic' ? 2 : 4 }, rng(seed))) {
          expect(rd.options.filter((o) => o === rd.answer)).toHaveLength(1);
          expect(new Set(rd.options).size).toBe(rd.options.length);
          if (rd.situation) for (const o of rd.options) if (o !== rd.answer) expect(rd.situation.also ?? []).not.toContain(o);
          if (kind === 'basic') for (const o of rd.options) expect(FEELING[o].basic).toBe(true);
        }
  });
});

describe('Big or Small Problem', () => {
  it('mixes sizes and offers one helpful choice', () => {
    for (const seed of SEEDS) {
      const rounds = problemRounds({ rounds: 6, strategy: true }, rng(seed));
      expect(rounds).toHaveLength(6);
      expect(new Set(rounds.map((x) => x.problem.size)).size).toBe(3);
      for (const rd of rounds) expect(rd.strategies!.filter((s) => s.helpful)).toHaveLength(1);
      expect(problemRounds({ rounds: 6 }, rng(seed)).every((x) => !x.problem.tricky)).toBe(true);
    }
  });
});

describe('Calm-Down Toolbox', () => {
  it('has exactly the asked number of helpful ideas', () => {
    for (const [choices, helpful] of [[2, 1], [4, 1], [5, 2]])
      for (const seed of SEEDS)
        for (const rd of toolboxRounds({ rounds: 5, choices, helpful }, rng(seed))) {
          expect(rd.options).toHaveLength(choices);
          expect(rd.options.filter((s) => s.helpful)).toHaveLength(helpful);
          expect(rd.need).toBe(helpful);
        }
  });
});
