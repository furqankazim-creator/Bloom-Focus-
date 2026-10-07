import { reloadAppAsync } from 'expo';
import { Platform } from 'react-native';

/**
 * Restarts the app so start-up choices (theme colours, right-to-left layout) take effect.
 * Waits a moment so the saved settings reach storage first.
 */
export function restartApp(reason: string) {
  setTimeout(() => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.location.reload();
      return;
    }
    reloadAppAsync(reason).catch(() => {});
  }, 400);
}
