import { Feather } from '@expo/vector-icons';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppNotification } from '../engine/notifications';
import { subscribeIncoming } from '../services/api';
import { useStore } from '../store/useStore';
import { inQuietHours } from '../store/settings';
import { colors, font } from '../theme';
import { openTarget, useNotifications } from './useNotifications';

const SHOW_MS = 4500;

/**
 * A banner that slides down when a new notification arrives while the app is open
 * (e.g. a message sent from the other portal). Also collects live-server messages.
 */
export function NotificationToast({ navRef }: { navRef: NavigationContainerRefWithCurrent<any> }) {
  const role = useStore((s) => s.role);
  const addInboxNote = useStore((s) => s.addInboxNote);
  const { items } = useNotifications();
  const insets = useSafeAreaInsets();
  const known = useRef<Set<string> | null>(null);
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const slide = useRef(new Animated.Value(0)).current;

  // Live server: new messages for this user feed the notification list.
  useEffect(() => (role ? subscribeIncoming(addInboxNote) : undefined), [role, addInboxNote]);

  // Reset when someone signs in, so their existing items don't pop up.
  useEffect(() => {
    known.current = null;
  }, [role]);

  useEffect(() => {
    if (!role) return;
    if (!known.current) {
      known.current = new Set(items.map((n) => n.id));
      return;
    }
    const fresh = items.find((n) => !known.current!.has(n.id) && Date.now() - Date.parse(n.at) < 5 * 60_000);
    for (const n of items) known.current.add(n.id);
    // No pop-up banners during quiet hours (they still appear in the list).
    if (fresh && !inQuietHours(useStore.getState().settings.notif)) setCurrent(fresh);
  }, [items, role]);

  useEffect(() => {
    if (!current) return;
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 8 }).start();
    const t = setTimeout(() => hide(), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  const hide = () =>
    Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(() => setCurrent(null));

  if (!current) return null;
  return (
    <Animated.View
      style={[
        styles.wrap,
        { top: insets.top + 8, opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-90, 0] }) }] },
      ]}
    >
      <Pressable
        style={styles.toast}
        accessibilityRole="button"
        accessibilityLabel={`${current.title}. ${current.body}`}
        onPress={() => {
          if (navRef.isReady()) openTarget(navRef, current.target);
          hide();
        }}
      >
        <View style={[styles.icon, { backgroundColor: current.tint }]}>
          <Text style={{ fontSize: 20 }}>{current.icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>
            {current.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {current.body}
          </Text>
        </View>
        <Pressable onPress={hide} hitSlop={10} accessibilityLabel="Dismiss">
          <Feather name="x" size={18} color={colors.inkSoft} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center', zIndex: 1000 },
  toast: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  body: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.inkSoft, marginTop: 1 },
});
