import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { t } from '../../i18n';
import { useSheetTheme } from '../games/shared';
import { HearButton } from './voice';

export type TileState = 'idle' | 'right' | 'wrong' | 'picked' | 'faded';

/** A big picture card the child taps. Shakes when wrong, glows green when right. */
export function PictureTile({
  emoji,
  label,
  state = 'idle',
  onPress,
  size = 132,
  children,
  a11y,
}: {
  emoji?: string;
  label?: string;
  state?: TileState;
  onPress?: () => void;
  size?: number;
  children?: React.ReactNode;
  a11y?: string;
}) {
  const theme = useSheetTheme();
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (state === 'wrong') {
      Animated.sequence([10, -10, 7, -7, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 55, useNativeDriver: true }))).start();
    }
    if (state === 'right') {
      Animated.sequence([Animated.timing(pop, { toValue: 1.08, duration: 120, useNativeDriver: true }), Animated.timing(pop, { toValue: 1, duration: 160, useNativeDriver: true })]).start();
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const border = state === 'right' ? '#2E9E6B' : state === 'wrong' ? '#E5383B' : state === 'picked' ? theme.color : '#E3E6EE';
  const bg = state === 'right' ? '#E6F6EC' : state === 'wrong' ? '#FDECEC' : state === 'picked' ? theme.tint : '#FFFFFF';
  return (
    <Animated.View style={{ transform: [{ translateX: shake }, { scale: pop }], opacity: state === 'faded' ? 0.35 : 1 }}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        style={({ pressed }) => [styles.tile, { width: size, minHeight: size, borderColor: border, backgroundColor: bg }, pressed && { transform: [{ scale: 0.97 }] }]}
        accessibilityRole="button"
        accessibilityLabel={a11y ?? label ?? emoji}
      >
        {children ?? <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>{emoji}</Text>}
        {!!label && (
          <Text style={styles.tileLabel} numberOfLines={2}>
            {label}
          </Text>
        )}
        {state === 'right' && (
          <View style={styles.tick}>
            <Feather name="check" size={16} color="#FFFFFF" />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** The question or instruction, with a button to hear it again. */
export function Prompt({ text, speak, big, children }: { text?: string; speak: string; big?: string; children?: React.ReactNode }) {
  const theme = useSheetTheme();
  return (
    <View style={[styles.prompt, { backgroundColor: theme.tint, borderColor: theme.color + '40' }]}>
      {!!big && (
        <View style={[styles.bigBadge, { borderColor: theme.color }]}>
          <Text style={[styles.bigText, { color: theme.color }]}>{big}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        {text ? (
          <Text style={styles.promptText}>{text}</Text>
        ) : (
          <>
            <Text style={styles.promptText}>{t('Listen…')} 👂</Text>
            <Text style={styles.listenHint}>{t('Tap the speaker to hear it again')}</Text>
          </>
        )}
        {children}
      </View>
      <HearButton text={speak} color={theme.color} size={52} />
    </View>
  );
}

/** Dots showing how far through the activity the child is. */
export function Dots({ total, done, current }: { total: number; done: number; current?: number }) {
  const theme = useSheetTheme();
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i < done && { backgroundColor: theme.color }, i === (current ?? done) && { width: 20, backgroundColor: theme.color + '80' }]} />
      ))}
    </View>
  );
}

/** Short celebration line under the cards after a right answer. */
export function Praise({ text }: { text: string }) {
  return (
    <View style={styles.praise}>
      <Text style={styles.praiseText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center', padding: 10, shadowColor: '#2E3352', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  tileLabel: { fontFamily: font.bold, fontSize: 15, color: '#2E3352', textAlign: 'center', marginTop: 4 },
  tick: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: '#2E9E6B', alignItems: 'center', justifyContent: 'center' },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 24, borderWidth: 2, marginBottom: 16 },
  promptText: { fontFamily: font.heavy, fontSize: 20, lineHeight: 26, color: '#2E3352' },
  listenHint: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  bigBadge: { width: 64, height: 64, borderRadius: 20, borderWidth: 3, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  bigText: { fontFamily: font.heavy, fontSize: 34 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DDE1EA' },
  praise: { alignSelf: 'center', marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: '#E6F6EC' },
  praiseText: { fontFamily: font.bold, fontSize: 15, color: '#1F7A4A', textAlign: 'center' },
});
