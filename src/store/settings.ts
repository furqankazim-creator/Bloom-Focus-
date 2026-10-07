/** Everything on the Settings page that isn't already its own store field. */
export type NotifPrefs = {
  messages: boolean;
  practice: boolean;
  moods: boolean;
  visits: boolean;
  activities: boolean;
  /** Quiet hours: no pop-up banners between these hours (null = off). */
  quietFrom: number | null;
  quietTo: number | null;
};

export type AppSettings = {
  /** App language: English, Arabic or Urdu. */
  language: 'en' | 'ar' | 'ur';
  /** Colour theme for the parent and therapist screens. Kid and game screens stay light. */
  theme: 'light' | 'dark' | 'system';
  email: string;
  photo: string | null;
  notif: NotifPrefs;
  /** 1 = normal, 1.15 = large, 1.3 = extra large. */
  textScale: number;
  reduceMotion: boolean;
  /** Hero speech bubbles during games. */
  heroTalk: boolean;
  /** Fun Zone minutes per day (0 = no limit). */
  funLimit: number;
  /** Therapist: shown to families and on reports. */
  title: string;
  clinicName: string;
  reportSignoff: string;
  /** Therapist defaults for new children and activities. */
  defaultSessionMinutes: number;
  defaultHomeDays: number;
  defaultAutoLevel: boolean;
  /** Clinic sessions. */
  clinicGames: number;
  nextVisitDays: 7 | 14 | 0;
  /** Insights "needs attention" rules. */
  alertGapDays: number;
  alertDropPct: number;
};

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'light',
  email: '',
  photo: null,
  notif: { messages: true, practice: true, moods: true, visits: true, activities: true, quietFrom: null, quietTo: null },
  textScale: 1,
  reduceMotion: false,
  heroTalk: true,
  funLimit: 0,
  title: 'Dr',
  clinicName: '',
  reportSignoff: '',
  defaultSessionMinutes: 15,
  defaultHomeDays: 3,
  defaultAutoLevel: true,
  clinicGames: 3,
  nextVisitDays: 7,
  alertGapDays: 4,
  alertDropPct: 10,
};

/** Is `hour` inside quiet hours (which may cross midnight)? */
export function inQuietHours(n: NotifPrefs, date = new Date()): boolean {
  if (n.quietFrom === null || n.quietTo === null || n.quietFrom === n.quietTo) return false;
  const h = date.getHours();
  return n.quietFrom < n.quietTo ? h >= n.quietFrom && h < n.quietTo : h >= n.quietFrom || h < n.quietTo;
}
