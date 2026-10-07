import { describe, expect, it } from 'vitest';
import { formatDuration } from '../src/engine/clinic';
import { DEFAULT_SETTINGS, inQuietHours } from '../src/store/settings';

describe('quiet hours', () => {
  const at = (h: number) => new Date(2026, 9, 6, h);
  it('is off without times', () => expect(inQuietHours(DEFAULT_SETTINGS.notif, at(23))).toBe(false));
  it('crosses midnight', () => {
    const n = { ...DEFAULT_SETTINGS.notif, quietFrom: 21, quietTo: 7 };
    expect(inQuietHours(n, at(22))).toBe(true);
    expect(inQuietHours(n, at(3))).toBe(true);
    expect(inQuietHours(n, at(12))).toBe(false);
  });
});

describe('durations', () => {
  it('reads naturally', () => {
    expect(formatDuration(8)).toBe('8 sec');
    expect(formatDuration(180)).toBe('3 min');
    expect(formatDuration(3900)).toBe('1 h 5 min');
  });
});
