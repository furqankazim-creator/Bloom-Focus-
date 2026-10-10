import { describe, expect, it } from 'vitest';
import { NEEDS, needsFor, suggestedNeeds } from '../src/engine/needs';
import { TEMPLATES } from '../src/engine/studio';
import { TRAIN_BY_ID, TRAIN_IDS } from '../src/engine/trainTasks';
import { FAMILY, LIBRARY } from '../src/library/catalog';
import type { Child } from '../src/types';

const FUN = { dots: 'Connect the Dots', breathe: 'Calm Corner', bubbles: 'Bubble Pop', memory: 'Hero Match' } as const;
const TEMPLATE_NAME: Record<string, string> = Object.fromEntries(TEMPLATES.map((x) => [x.id, x.name]));

/** The clinic's grouping, exactly as agreed. */
const CLINIC: Record<string, string[]> = {
  'Focus and attention (ADHD-type)': ['Tap the Stars', 'Find the Blue', 'Flock Focus', 'Multi-Modal Focus', 'Spot the Change', 'Hidden Shapes', 'Symbol Twins', 'Number Hunt', 'Find it'],
  Memory: ['Memory Sequence', 'Spatial Grid', 'Block Builder', 'Maze Path', 'See-Through Squares', 'Colour Code Circles', 'Snake Sums', 'Remember the order'],
  'Impulse control and hyperactivity': ['Go / No-Go', 'Color Clash'],
  'Processing speed': ['Flash Match', 'Colour Signals'],
  'Flexibility (switching tasks, rigid thinking)': ['Switch Sort', 'Color Clash'],
  'IQ and reasoning': ['Pattern Train', 'Shape Code Breaker', 'Figure Finder', 'Puzzle Match', 'Dot Code Detective', 'Number Pyramid', 'Picture puzzle'],
  'Following instructions': ['Follow the Path', 'Rainbow Order'],
  'Maths difficulty': ['Shape Sum Puzzles', 'Crocodile Compare', 'Number Buddies', 'Snake Sums', 'Dice Detective', 'Number Pyramid'],
  'Reading and eye tracking': ['Word Explorer', 'Word search', 'Tangled Lines'],
  'Handwriting and fine motor': ['Dot Grid Copycat', 'Join the Dots', 'Mirror Magic', 'Pattern Paths', 'Connect the Dots', 'Worksheet'],
  'Speech, language & listening': ['Listen for Apple', 'Listen for it', 'Multi-Modal Focus', 'Follow the Path', 'Picture puzzle', 'Find it', 'Remember the order', 'Say It!', 'Sound Detective', 'Listen & Do', 'Question Time', 'Odd One Out', 'Story Steps'],
  'Calm and emotional regulation': ['Calm Corner'],
};

describe('activities by problem area', () => {
  it('matches the clinic’s table exactly', () => {
    expect(NEEDS.map((n) => n.title)).toEqual(Object.keys(CLINIC));
    for (const n of NEEDS) {
      const names = [
        ...n.focus.map((id) => TRAIN_BY_ID[id].title),
        ...n.worksheets.map((id) => FAMILY[id].name),
        ...n.create.map((id) => TEMPLATE_NAME[id]),
        ...n.fun.map((id) => FUN[id]),
      ];
      expect(names.sort(), n.title).toEqual([...CLINIC[n.title]].sort());
    }
  });
  it('puts every game and worksheet under at least one area', () => {
    for (const id of TRAIN_IDS) expect(needsFor('focus', id).length, id).toBeGreaterThan(0);
    for (const f of LIBRARY) expect(needsFor('worksheets', f.id).length, f.id).toBeGreaterThan(0);
  });
  it('suggests the area from the child’s focus', () => {
    expect(suggestedNeeds({ focus: 'inhibition' } as Child).map((n) => n.id)).toEqual(['impulse']);
    expect(suggestedNeeds({ focus: 'sustained' } as Child).map((n) => n.id)).toEqual(['attention']);
    expect(suggestedNeeds({ focus: 'emotional' } as Child).map((n) => n.id)).toEqual(['calm']);
    expect(suggestedNeeds({ focus: 'auditory', diagnosis: ['Speech & language'] } as Child).map((n) => n.id)).toEqual(['speech']);
    expect(suggestedNeeds({ focus: 'auditory' } as Child).map((n) => n.id)).toEqual(['speech']);
  });
});
