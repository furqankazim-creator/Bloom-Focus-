/**
 * Builds the rounds for each Calm & feelings activity from a seed and the level settings.
 * Pure TypeScript so tests can check every level is fair and solvable.
 */
import { FEELINGS, PROBLEMS, SITUATIONS, STRATEGIES, TOOLBOX_FEELINGS, type FeelingId, type Problem, type Situation, type Strategy } from './data';
import type { Tr } from '../speech/data';

type Rand = () => number;
const shuffle = <T,>(xs: T[], r: Rand) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const take = <T,>(xs: T[], n: number, r: Rand) => shuffle(xs, r).slice(0, n);

/* ——— Feelings Faces ——— */

export type FeelingRound = { face?: string; situation?: Situation; answer: FeelingId; options: FeelingId[] };

/** `faces`: name the feeling on a face. `stories`: how would you feel if…? */
export function feelingRounds(cfg: { kind?: 'basic' | 'faces' | 'stories'; rounds?: number; choices?: number }, r: Rand): FeelingRound[] {
  const n = cfg.rounds ?? 6;
  const choices = cfg.choices ?? 2;
  if (cfg.kind === 'stories') {
    return take(SITUATIONS, n, r).map((s) => {
      const bad = new Set<FeelingId>([s.feeling, ...(s.also ?? [])]);
      const others = take(FEELINGS.filter((f) => !bad.has(f.id)), choices - 1, r).map((f) => f.id);
      return { situation: s, answer: s.feeling, options: shuffle([s.feeling, ...others], r) };
    });
  }
  const pool = cfg.kind === 'basic' ? FEELINGS.filter((f) => f.basic) : FEELINGS;
  const out: FeelingRound[] = [];
  let prev = '';
  for (let i = 0; i < n; i++) {
    let f = pool[Math.floor(r() * pool.length)];
    if (f.id === prev) f = pool[(pool.indexOf(f) + 1) % pool.length];
    prev = f.id;
    const others = take(pool.filter((x) => x.id !== f.id), Math.min(choices - 1, pool.length - 1), r).map((x) => x.id);
    out.push({ face: f.emoji, answer: f.id, options: shuffle([f.id, ...others], r) });
  }
  return out;
}

/* ——— Big or Small Problem ——— */

export type ProblemRound = { problem: Problem; strategies?: Strategy[] };

export function problemRounds(cfg: { rounds?: number; tricky?: boolean; strategy?: boolean }, r: Rand): ProblemRound[] {
  const pool = cfg.tricky ? PROBLEMS : PROBLEMS.filter((p) => !p.tricky);
  // Mix the sizes so every size comes up.
  const bySize = (s: string) => shuffle(pool.filter((p) => p.size === s), r);
  const mixed: Problem[] = [];
  const lists = [bySize('small'), bySize('medium'), bySize('big')];
  for (let i = 0; mixed.length < (cfg.rounds ?? 6) && i < 20; i++) {
    const list = lists[i % 3];
    const p = list.shift();
    if (p) mixed.push(p);
  }
  return shuffle(mixed, r).map((problem) => ({
    problem,
    strategies: cfg.strategy ? shuffle([...take(STRATEGIES.filter((s) => s.helpful), 1, r), ...take(STRATEGIES.filter((s) => !s.helpful), 2, r)], r) : undefined,
  }));
}

/* ——— Calm-Down Toolbox ——— */

export type ToolboxRound = { ask: Tr; feeling: FeelingId; options: Strategy[]; need: number };

/** `helpful` = how many good choices are on the card (the child finds them all). */
export function toolboxRounds(cfg: { rounds?: number; choices?: number; helpful?: number }, r: Rand): ToolboxRound[] {
  const choices = cfg.choices ?? 2;
  const helpful = Math.min(cfg.helpful ?? 1, choices - 1);
  const rounds: ToolboxRound[] = [];
  const feelings = shuffle(TOOLBOX_FEELINGS, r);
  for (let i = 0; i < (cfg.rounds ?? 5); i++) {
    const f = feelings[i % feelings.length];
    const good = take(STRATEGIES.filter((s) => s.helpful), helpful, r);
    const bad = take(STRATEGIES.filter((s) => !s.helpful), choices - helpful, r);
    rounds.push({ ask: f.ask, feeling: f.feeling, options: shuffle([...good, ...bad], r), need: helpful });
  }
  return rounds;
}
