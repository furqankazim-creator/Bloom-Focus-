import { t as tr } from '../../i18n';
import React, { createContext, useContext } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { lightColors as colors, font } from '../../theme';
import type { LevelConfig } from '../settings';

/** The activity's colours, so every game sheet, button and highlight matches its card. */
export const SheetTheme = createContext<{ color: string; tint: string }>({ color: '#2F5D46', tint: '#E6ECE2' });
export const useSheetTheme = () => useContext(SheetTheme);

export type LibraryResult = { accuracy: number | null; activeSec: number };
export type LibraryGameProps = { level: number; seed: number; onDone: (r: LibraryResult) => void; config: LevelConfig };

/** Lets games tell the hero buddy about a right (true) or wrong (false) answer. */
export const GameCheer = createContext<(good: boolean) => void>(() => {});
export const useCheer = () => useContext(GameCheer);

export const secondsSince = (start: number) => Math.max(1, Math.round((Date.now() - start) / 1000));

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
export const shuffle = <T,>(xs: T[], rand: () => number) => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const pick = <T,>(xs: T[], rand: () => number) => xs[Math.floor(rand() * xs.length)];
export const randInt = (lo: number, hi: number, rand: () => number) => lo + Math.floor(rand() * (hi - lo + 1));

/** The worksheet colours used across the therapist's sheets. */
export const SHEET = {
  red: '#E5383B',
  green: '#1F9D3A',
  yellow: '#F6CF1C',
  blue: '#2A7FD4',
  purple: '#B05CD9',
  brown: '#8B5A2B',
  orange: '#F28C28',
  grey: '#8C8C8C',
  pink: '#E8418C',
  lime: '#7BC043',
  teal: '#5FD3C9',
  ink: '#2E3352',
  line: '#C9CEDF',
  frame: '#5A6180',
};

/** A white worksheet page, like the printed sheets. */
export function Sheet({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useSheetTheme();
  return (
    <View style={[styles.sheet, { borderColor: t.color + '55', shadowColor: t.color }]}>
      <View style={[styles.stripe, { backgroundColor: t.color }]} />
      <View style={[{ padding: 14, paddingTop: 18 }, style]}>{children}</View>
    </View>
  );
}

export function GameBar({ left, right }: { left: string; right?: string }) {
  const t = useSheetTheme();
  return (
    <View style={styles.bar}>
      <View style={[styles.pill, { backgroundColor: t.tint }]}>
        <Text style={[styles.barText, { color: t.color }]}>{tr(left)}</Text>
      </View>
      {!!right && <Text style={[styles.barText, { color: t.color, textAlign: 'right' }]}>{tr(right)}</Text>}
    </View>
  );
}

export function DoneButton({ label = 'Done', onPress, disabled }: { label?: string; onPress: () => void; disabled?: boolean }) {
  const t = useSheetTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.done, { backgroundColor: t.color }, disabled && { opacity: 0.4 }, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      <Text style={styles.doneText}>{tr(label)}</Text>
    </Pressable>
  );
}

export type ShapeKind = 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'heart' | 'pentagon' | 'trapezoid' | 'rightTriangle' | 'rectangle' | 'downTriangle';

/** A shape drawn in a 100×100 box. `fill` empty = outline only. */
export function ShapeGlyph({ kind, size, color = SHEET.ink, fill, stroke = 7 }: { kind: ShapeKind; size: number; color?: string; fill?: boolean; stroke?: number }) {
  const p = { stroke: color, strokeWidth: stroke, fill: fill ? color : 'none', strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {kind === 'circle' && <Circle cx={50} cy={50} r={40} {...p} />}
      {kind === 'square' && <Rect x={12} y={12} width={76} height={76} {...p} />}
      {kind === 'rectangle' && <Rect x={6} y={26} width={88} height={48} {...p} />}
      {kind === 'triangle' && <Polygon points="50,10 92,88 8,88" {...p} />}
      {kind === 'downTriangle' && <Polygon points="8,12 92,12 50,90" {...p} />}
      {kind === 'rightTriangle' && <Polygon points="12,10 12,90 90,90" {...p} />}
      {kind === 'diamond' && <Polygon points="50,6 94,50 50,94 6,50" {...p} />}
      {kind === 'pentagon' && <Polygon points="50,8 92,38 76,90 24,90 8,38" {...p} />}
      {kind === 'trapezoid' && <Polygon points="28,22 72,22 94,82 6,82" {...p} />}
      {kind === 'star' && <Polygon points="50,6 61,38 95,38 67,58 78,92 50,71 22,92 33,58 5,38 39,38" {...p} />}
      {kind === 'heart' && <Path d="M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C40 8 47 14 50 22 C53 14 60 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z" {...p} />}
    </Svg>
  );
}

/** A small option button used by many games (keypads, symbol pickers). */
export function OptionKey({ label, children, onPress, selected, wrong, size = 52 }: { label: string; children?: React.ReactNode; onPress: () => void; selected?: boolean; wrong?: boolean; size?: number }) {
  const t = useSheetTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.key, { minWidth: size, height: size, borderColor: t.color + '55' }, selected && { backgroundColor: t.color, borderColor: t.color }, wrong && styles.keyWrong, pressed && { opacity: 0.8 }]}
    >
      {typeof children === 'string' || typeof children === 'number' || children == null ? (
        <Text style={[styles.keyText, selected && { color: colors.white }]}>{children ?? label}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  stripe: { height: 6 },
  pill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  bar: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 4, marginBottom: 10 },
  barText: { fontFamily: font.semibold, fontSize: 14, color: colors.inkSoft, flexShrink: 1 },
  done: { alignSelf: 'stretch', height: 54, borderRadius: 18, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  doneText: { fontFamily: font.bold, fontSize: 17, color: colors.white },
  key: { borderRadius: 16, borderWidth: 2, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  keyOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  keyWrong: { backgroundColor: '#F6C9BD', borderColor: '#E5A091' },
  keyText: { fontFamily: font.bold, fontSize: 18, color: SHEET.ink },
});
