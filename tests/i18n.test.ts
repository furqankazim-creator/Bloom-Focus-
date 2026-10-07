import { afterEach, describe, expect, it } from 'vitest';
import { AR } from '../src/i18n/ar';
import { UR } from '../src/i18n/ur';
import { setLanguage, t } from '../src/i18n';

afterEach(() => setLanguage('en'));
const holes = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort().join();

describe('translations', () => {
  it('returns English unchanged and fills placeholders', () => {
    expect(t('Hello')).toBe('Hello');
    expect(t('Hi {{name}}', { name: 'Ali' })).toBe('Hi Ali');
  });
  it('translates to Arabic and Urdu', () => {
    setLanguage('ar');
    expect(t('Settings')).toBe('الإعدادات');
    setLanguage('ur');
    expect(t('Settings')).toBe('ترتیبات');
  });
  it('matches sentences that contain numbers', () => {
    setLanguage('ar');
    expect(t('Round 2 of 5')).toBe('الجولة 2 من 5');
  });
  it('keeps the same {{placeholders}} in every translation', () => {
    for (const dict of [AR, UR]) {
      for (const [en, out] of Object.entries(dict)) {
        // Arabic singular phrases ("one profile") say the number in words, so {{n}} may be dropped.
        const singular = /^\{\{n\}\} (child|profile)\b/.test(en);
        const want = singular ? holes(en.replace('{{n}}', '')) : holes(en);
        const got = singular ? holes(out.replace('{{n}}', '')) : holes(out);
        expect(got, en).toBe(want);
      }
    }
  });
});
