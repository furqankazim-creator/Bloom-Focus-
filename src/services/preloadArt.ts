import { Asset } from 'expo-asset';
import { Image, Platform } from 'react-native';
import { HERO_ART } from '../components/hero/heroArt';
import { KID_ART } from '../components/kid/kidArt';
import { LIBRARY_ART } from '../library/art';

/**
 * Fetch every bundled 3D picture as soon as the app opens, so hero pickers, game headers and
 * activity cards never show an empty badge while a picture downloads (on web each image is
 * otherwise fetched the first time it appears).
 */
export function preloadArt() {
  if (Platform.OS !== 'web') return;
  const all = [...Object.values(HERO_ART), ...Object.values(LIBRARY_ART), ...Object.values(KID_ART)];
  for (const mod of all) {
    try {
      const uri = Asset.fromModule(mod as number).uri;
      if (uri) void Image.prefetch(uri).catch(() => {});
    } catch {
      // A missing picture just loads later.
    }
  }
}
