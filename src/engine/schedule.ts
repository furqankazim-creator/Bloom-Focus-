/**
 * Which days of the week an activity is for. Days use JavaScript's numbering (0 = Sunday … 6 = Saturday);
 * an empty list means "any days" and the activity just has a number of times per week.
 */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const DAY_LETTER: Record<number, string> = { 0: 'S', 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S' };
export const DAY_SHORT: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };
export const DAY_LONG: Record<number, string> = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };

export const DAY_PRESETS: { label: string; days: number[] }[] = [
  { label: 'Any days', days: [] },
  { label: 'Every day', days: [1, 2, 3, 4, 5, 6, 0] },
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Mon · Wed · Fri', days: [1, 3, 5] },
  { label: 'Tue · Thu', days: [2, 4] },
  { label: 'Weekend', days: [6, 0] },
];

const sorted = (days: number[]) => WEEK_ORDER.filter((d) => days.includes(d));
const same = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d));

/** "Every day", "Weekdays", "Mon · Wed · Fri", or "3× a week" when no days are fixed. */
export function scheduleLabel(days: number[] | undefined, timesPerWeek: number): string {
  if (days?.length) {
    const preset = DAY_PRESETS.find((p) => p.days.length && same(p.days, days));
    return preset ? preset.label : sorted(days).map((d) => DAY_SHORT[d]).join(' · ');
  }
  return timesPerWeek >= 7 ? 'Daily' : `${timesPerWeek}× a week`;
}

/** Is this activity set for this date? Activities without fixed days fit any day. */
export const isOnDay = (days: number[] | undefined, date = new Date()) => !days?.length || days.includes(date.getDay());
/** Set for exactly today (fixed days that include today). */
export const isDueToday = (days: number[] | undefined, date = new Date()) => !!days?.length && days.includes(date.getDay());

/** The next scheduled day after today: "Tomorrow" or "Wed". */
export function nextDayLabel(days: number[] | undefined, from = new Date()): string | null {
  if (!days?.length) return null;
  for (let k = 1; k <= 7; k++) {
    const d = (from.getDay() + k) % 7;
    if (days.includes(d)) return k === 1 ? 'Tomorrow' : DAY_SHORT[d];
  }
  return null;
}

/** Monday of this week (local time), for the week strip. */
export function weekStart(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}
