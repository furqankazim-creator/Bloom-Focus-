import { describe, expect, it } from 'vitest';
import { isDueToday, isOnDay, nextDayLabel, weekStart } from '../src/engine/schedule';

const tue = new Date(2026, 9, 6); // Tuesday 6 Oct 2026

describe('weekday schedule', () => {
  it('treats no days as "any day" but never "due today"', () => {
    expect(isOnDay(undefined, tue)).toBe(true);
    expect(isDueToday(undefined, tue)).toBe(false);
  });
  it('matches the chosen weekdays', () => {
    expect(isDueToday([2, 4], tue)).toBe(true);
    expect(isDueToday([1, 3, 5], tue)).toBe(false);
  });
  it('names the next practice day', () => {
    expect(nextDayLabel([4], tue)).toBeTruthy();
  });
  it('starts weeks on Monday', () => {
    expect(weekStart(tue).getDay()).toBe(1);
    expect(weekStart(tue).getDate()).toBe(5);
  });
});
