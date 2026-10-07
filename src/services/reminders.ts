import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { t } from '../i18n';

const CHANNEL = 'practice';

export type ReminderResult = 'set' | 'denied' | 'unsupported';

/**
 * Daily reminders need the phone's notification system. The web has none, and Expo Go on
 * Android refuses to load expo-notifications (it throws on import since SDK 53), so those
 * report "unsupported" instead of failing. iPhone Expo Go and installed builds work.
 */
export const remindersSupported = () => Platform.OS !== 'web' && !(Platform.OS === 'android' && isRunningInExpoGo());

/** Schedules one daily reminder at `hour`:00, replacing any earlier one. */
export async function scheduleDailyReminder(hour: number, childName: string): Promise<ReminderResult> {
  if (!remindersSupported()) return 'unsupported';
  try {
    const Notifications = await import('expo-notifications');

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    let { granted } = await Notifications.getPermissionsAsync();
    if (!granted) ({ granted } = await Notifications.requestPermissionsAsync());
    if (!granted) return 'denied';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: t('Practice reminders'),
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('Time for a little practice'),
        body: t('A short Bloom Focus session with {{name}}. Stop while it’s still fun.', { name: childName }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: CHANNEL },
    });
    return 'set';
  } catch {
    return 'unsupported';
  }
}

export async function cancelReminders() {
  if (!remindersSupported()) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing scheduled, or notifications unavailable here.
  }
}
