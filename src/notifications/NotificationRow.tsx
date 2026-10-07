import { dateLocale, t } from '../i18n';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppNotification } from '../engine/notifications';
import { colors, font } from '../theme';

export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (m < 1) return t('now');
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
}

export function NotificationRow({ item, unread, onPress }: { item: AppNotification; unread?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}`}
      style={({ pressed }) => [styles.row, unread && styles.unread, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.icon, { backgroundColor: item.tint }]}>
        <Text style={styles.emoji}>{item.icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{timeAgo(item.at)}</Text>
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      {unread && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, backgroundColor: colors.card },
  unread: { backgroundColor: '#FBFDF6', borderWidth: 1, borderColor: '#DDE9C6' },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 21 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  time: { fontFamily: font.medium, fontSize: 12, color: colors.inkMuted },
  body: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 19, color: colors.inkSoft, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.forest },
});
