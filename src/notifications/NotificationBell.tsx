import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from '../components/ui';
import { colors, font } from '../theme';
import { useNotifications } from './useNotifications';

/** Bell with an unread count; opens the Notifications screen. */
export function NotificationBell({ size = 56, bg = colors.card }: { size?: number; bg?: string }) {
  const nav = useNavigation<any>();
  const { unread } = useNotifications();
  return (
    <View>
      <IconButton
        icon="bell"
        size={size}
        bg={bg}
        label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        onPress={() => nav.navigate('Notifications')}
      />
      {unread > 0 && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: font.bold, fontSize: 11, color: colors.white },
});
