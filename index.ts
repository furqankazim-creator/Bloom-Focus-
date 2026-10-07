import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent, reloadAppAsync } from 'expo';
import React, { useEffect, useState } from 'react';
import { Appearance, I18nManager, Platform } from 'react-native';
import { applyScheme } from './src/theme';

type Saved = { theme: 'light' | 'dark' | 'system'; language: 'en' | 'ar' | 'ur' };
const RELOAD_KEY = 'bloom.directionReload';

/**
 * Screens build their styles when their modules load, so the colour theme (and on phones the
 * layout direction) is settled from the saved settings first, and only then is the app imported.
 */
async function saved(): Promise<Saved> {
  try {
    const raw = await AsyncStorage.getItem('bloom-focus-v1');
    const s = raw ? JSON.parse(raw)?.state?.settings : undefined;
    return {
      theme: s?.theme === 'dark' || s?.theme === 'system' ? s.theme : 'light',
      language: s?.language === 'ar' || s?.language === 'ur' ? s.language : 'en',
    };
  } catch {
    return { theme: 'light', language: 'en' };
  }
}

/**
 * Phones remember right-to-left between launches (Expo Go even across projects), so English
 * could open mirrored after Arabic or Urdu had been picked once. Set the direction the saved
 * language needs; if the running layout is wrong, restart once so it takes effect.
 */
async function settleDirection(language: Saved['language']): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const rtl = language !== 'en';
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  I18nManager.swapLeftAndRightInRTL(true);
  if (I18nManager.isRTL === rtl) {
    await AsyncStorage.removeItem(RELOAD_KEY).catch(() => {});
    return false;
  }
  // Guard against a restart loop if the phone ignores the change.
  const last = Number(await AsyncStorage.getItem(RELOAD_KEY).catch(() => null)) || 0;
  if (Date.now() - last < 15000) return false;
  await AsyncStorage.setItem(RELOAD_KEY, String(Date.now())).catch(() => {});
  await reloadAppAsync('Layout direction').catch(() => {});
  return true;
}

function Boot() {
  const [App, setApp] = useState<React.ComponentType | null>(null);
  useEffect(() => {
    void saved().then(async ({ theme, language }) => {
      if (await settleDirection(language)) return;
      applyScheme(theme === 'system' ? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light') : theme);
      setApp(() => require('./App').default);
    });
  }, []);
  return App ? React.createElement(App) : null;
}

registerRootComponent(Boot);
