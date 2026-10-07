import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import { HERO_ART } from '../components/hero/heroArt';
import { presetFor } from '../engine/heroes';
import type { Character } from '../types';
import { LIBRARY_ART } from './art';
import type { LibraryFamilyId } from './catalog';
import { printableHtml } from './printables';
import type { LibraryCustom } from './settings';

/** An absolute link to a bundled picture, so the print window can load it. */
function assetUri(mod: number | undefined): string | undefined {
  if (mod === undefined) return undefined;
  try {
    const uri = Asset.fromModule(mod).uri;
    return uri && Platform.OS === 'web' && typeof window !== 'undefined' ? new URL(uri, window.location.href).href : uri;
  } catch {
    return undefined;
  }
}

/** Opens a fresh colour sheet for printing (or saving as PDF), with the child's hero on it. */
export async function printSheet(family: LibraryFamilyId, level: number, childName: string, custom?: LibraryCustom, hero?: Character, title?: string) {
  const preset = presetFor(hero);
  const html = printableHtml(family, level, childName, Date.now(), assetUri(LIBRARY_ART[family]), {
    custom,
    title,
    hero: hero ? { name: hero.name, emoji: hero.emoji, uri: hero.image ?? assetUri(preset?.id ? HERO_ART[preset.id] : undefined) } : undefined,
  });
  await printHtml(html);
}

/** Opens HTML in a print dialog (its own tab on web, the system dialog on phones). */
export async function printHtml(html: string) {
  if (Platform.OS === 'web') {
    // Its own tab, so it prints cleanly; wait for the pictures before printing.
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    let printed = false;
    const go = () => {
      if (printed) return;
      printed = true;
      w.print();
    };
    w.onload = () => setTimeout(go, 200);
    setTimeout(go, 1500);
    return;
  }
  const Print = await import('expo-print');
  await Print.printAsync({ html });
}
