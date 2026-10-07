/**
 * Translations. English text is the key, so anything not yet translated simply shows in English.
 * `t('Hi {{name}}!', { name })` fills in values. Arabic and Urdu read right-to-left.
 */
import { I18nManager, Platform } from 'react-native';
import { AR } from './ar';
import { UR } from './ur';

export type Lang = 'en' | 'ar' | 'ur';

export const LANGUAGES: { id: Lang; name: string; native: string; rtl: boolean }[] = [
  { id: 'en', name: 'English', native: 'English', rtl: false },
  { id: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { id: 'ur', name: 'Urdu', native: 'اردو', rtl: true },
];

const DICTS: Record<Lang, Record<string, string>> = { en: {}, ar: AR, ur: UR };
let current: Lang = 'en';

export const getLang = () => current;
export const isRTL = (lang: Lang = current) => !!LANGUAGES.find((l) => l.id === lang)?.rtl;

/** Translate an English string, filling in {{placeholders}}. */
export function t(text: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[current];
  let out = dict[text];
  if (out === undefined) {
    // Sentences with numbers ("3/6 joined") match one entry written with {{0}}, {{1}}…
    const nums: string[] = [];
    const key = text.replace(/\d+(?:\.\d+)?/g, (n) => `{{${nums.push(n) - 1}}}`);
    const hit = nums.length ? dict[key] : undefined;
    out = hit ? hit.replace(/\{\{(\d+)\}\}/g, (_, i) => nums[Number(i)] ?? '') : text;
  }
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{{${k}}}`).join(String(v));
  return out;
}

/**
 * Switch language. On the web the page direction flips at once; on phones the right-to-left
 * layout needs an app restart (returns true when one is needed).
 */
export function setLanguage(lang: Lang): boolean {
  current = lang;
  const rtl = isRTL(lang);
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
    return false;
  }
  // Always set it (not only when it looks different): phones keep the last forced value.
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return I18nManager.isRTL !== rtl;
}

/** Locale for dates and times: Arabic and Urdu month/day names, with Western digits to match the rest of the app. */
export const dateLocale = () => (current === 'ar' ? 'ar-u-nu-latn' : current === 'ur' ? 'ur-PK-u-nu-latn' : 'en-GB');
