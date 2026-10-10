import { describe, expect, it } from 'vitest';
import { firstSound, instructionText, soundKey, STORIES, WORDS, type Lang } from '../src/library/speech/data';
import { listenRounds, matches, oddRounds, questionRounds, rng, sayItDeck, soundRounds, storyRounds } from '../src/library/speech/rounds';

const LANGS: Lang[] = ['en', 'ar', 'ur'];
const SEEDS = [1, 7, 42, 99, 1234, 2026];

describe('speech word bank', () => {
  it('has every word in English, Arabic and Urdu, with unique ids', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    for (const w of WORDS) for (const l of LANGS) expect(w[l].trim().length, `${w.id} ${l}`).toBeGreaterThan(0);
  });
  it('stories have five steps in all languages', () => {
    for (const s of STORIES) {
      expect(s.steps).toHaveLength(5);
      for (const step of s.steps) for (const l of LANGS) expect(step.text[l].length).toBeGreaterThan(0);
    }
  });
});

describe('Say It!', () => {
  it('deals the asked number of cards', () => {
    for (const l of LANGS) {
      expect(sayItDeck({ words: 'easy', count: 6 }, l, rng(3))).toHaveLength(6);
      expect(sayItDeck({ words: 'actions', count: 8 }, l, rng(3)).every((c) => c.isAction)).toBe(true);
    }
    expect(sayItDeck({ words: 'own', count: 5, own: ['sun', 'moon'] }, 'en', rng(1)).map((c) => c.word).sort()).toEqual(['moon', 'sun']);
  });
});

describe('Sound Detective', () => {
  it('always has exactly one picture that starts with the sound', () => {
    for (const l of LANGS)
      for (const seed of SEEDS)
        for (const [choices, tricky] of [[2, false], [3, false], [4, true]] as const) {
          const rounds = soundRounds({ rounds: 8, choices, tricky }, l, rng(seed));
          expect(rounds.length).toBe(8);
          for (const rd of rounds) {
            expect(rd.options).toHaveLength(choices);
            const key = soundKey(rd.letter, l);
            const hits = rd.options.filter((o) => soundKey(firstSound(o[l], l), l) === key);
            expect(hits.map((h) => h.id), `${l} ${rd.letter}`).toEqual([rd.answer.id]);
          }
        }
  });
});

describe('Odd One Out', () => {
  it('has four pictures with one that does not belong', () => {
    for (const kind of ['far', 'close', 'think'] as const)
      for (const seed of SEEDS) {
        for (const rd of oddRounds({ rounds: 6, kind }, rng(seed))) {
          expect(rd.items).toHaveLength(4);
          expect(new Set(rd.items.map((x) => x.id)).size).toBe(4);
          expect(rd.items.filter((x) => x.id === rd.odd.id)).toHaveLength(1);
          if (kind !== 'think') expect(rd.items.filter((x) => x.cat === rd.odd.cat)).toHaveLength(1);
        }
      }
  });
});

describe('Question Time', () => {
  it('offers the right answer once, never another right one', () => {
    for (const kind of ['which', 'what', 'think'] as const)
      for (const seed of SEEDS)
        for (const rd of questionRounds({ rounds: 8, kind, choices: 4 }, rng(seed))) {
          expect(rd.options).toHaveLength(4);
          expect(rd.options.filter((o) => o.id === rd.answer.id)).toHaveLength(1);
        }
  });
});

describe('Listen & Do', () => {
  it('each instruction picks exactly one object', () => {
    for (const keyWords of [1, 2, 3])
      for (const seed of SEEDS)
        for (const rd of listenRounds({ rounds: 8, keyWords }, rng(seed))) {
          expect(rd.objects.filter((o) => matches(o, rd.ins)), `kw${keyWords}`).toHaveLength(1);
          if (keyWords === 3) expect(rd.ins.container).toBeDefined();
          for (const l of LANGS) expect(instructionText(rd.ins, l).length).toBeGreaterThan(5);
        }
  });
  it('reads naturally', () => {
    const ins = { target: { kind: 'ball', colour: 'red', size: 'big' }, use: { colour: true, size: true }, container: 'box' } as const;
    expect(instructionText(ins, 'en')).toBe('Put the big red ball in the box');
    expect(instructionText(ins, 'ar')).toBe('ضع الكرة الحمراء الكبيرة في الصندوق');
    expect(instructionText(ins, 'ur')).toBe('بڑی سرخ گیند کو ڈبے میں رکھیں');
    expect(instructionText({ target: { kind: 'star', colour: 'blue', size: 'small' }, use: { colour: true, size: false } }, 'ur')).toBe('نیلے ستارے کو چھوئیں');
  });
});

describe('Story Steps', () => {
  it('keeps first and last steps and never starts solved', () => {
    for (const steps of [3, 4, 5])
      for (const seed of SEEDS)
        for (const rd of storyRounds({ steps, stories: 2 }, rng(seed))) {
          expect(rd.order[0]).toBe(0);
          expect(rd.order.at(-1)).toBe(4);
          expect(rd.order).toHaveLength(steps);
          expect(rd.shuffled).not.toEqual(rd.order);
        }
  });
});

describe('printable sheets', () => {
  it('builds a sheet for every speech activity and level', async () => {
    const { printableHtml } = await import('../src/library/printables');
    for (const id of ['sayIt', 'soundDetective', 'oddOneOut', 'listenDo', 'questionTime', 'storySteps'] as const)
      for (const level of [1, 2, 3]) {
        const html = printableHtml(id, level, 'Ali', 42);
        expect(html, `${id} ${level}`).toContain('<div class="sheet">');
        expect(html.length, `${id} ${level}`).toBeGreaterThan(2000);
        expect(html).not.toContain('undefined');
      }
  });
});
