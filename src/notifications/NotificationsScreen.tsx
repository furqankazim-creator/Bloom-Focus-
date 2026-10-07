import { t } from '../i18n';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, TopBar } from '../components/ui';
import { isUnread } from '../engine/notifications';
import type { RootProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { colors, font } from '../theme';
import { NotificationRow } from './NotificationRow';
import { openTarget, useNotifications } from './useNotifications';

export default function NotificationsScreen({ navigation }: RootProps<'Notifications'>) {
  const role = useStore((s) => s.role);
  const markSeen = useStore((s) => s.markNotificationsSeen);
  const { items, seenAt } = useNotifications();
  // Keep what was new when the screen opened highlighted, while the badge clears straight away.
  const openedSeenAt = useRef(seenAt);
  useEffect(() => {
    if (role) markSeen(role);
  }, [role, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const fresh = items.filter((n) => isUnread(n, openedSeenAt.current));
  const earlier = items.filter((n) => !isUnread(n, openedSeenAt.current));

  return (
    <Screen>
      <TopBar title={t('Notifications')} onBack={() => navigation.goBack()} />
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 44 }}>🔔</Text>
          <Text style={styles.emptyTitle}>{t('You’re all caught up')}</Text>
          <Text style={styles.emptyText}>{t('New messages and updates will show here.')}</Text>
        </View>
      ) : (
        <>
          {fresh.length > 0 && <Text style={styles.group}>{t('NEW')} · {fresh.length}</Text>}
          <View style={{ gap: 8 }}>
            {fresh.map((n) => (
              <NotificationRow key={n.id} item={n} unread onPress={() => openTarget(navigation, n.target)} />
            ))}
          </View>
          {earlier.length > 0 && <Text style={styles.group}>{t('EARLIER')}</Text>}
          <View style={{ gap: 8 }}>
            {earlier.map((n) => (
              <NotificationRow key={n.id} item={n} onPress={() => openTarget(navigation, n.target)} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 1.4, color: colors.inkSoft, marginTop: 18, marginBottom: 10 },
  empty: { alignItems: 'center', marginTop: 80, gap: 6 },
  emptyTitle: { fontFamily: font.bold, fontSize: 19, color: colors.ink, marginTop: 6 },
  emptyText: { fontFamily: font.regular, fontSize: 14, color: colors.inkSoft },
});
