import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { WORLDS, worldOf, type WorldInfo } from '../../engine/heroes';
import type { Character, SceneStyle } from '../../types';
import { HeroSticker } from './HeroSticker';

// Decoration spots around the edges (x, y as fractions), kept away from the play area's centre.
const SPOTS: [number, number, number][] = [
  [0.05, 0.12, 30],
  [0.86, 0.09, 36],
  [0.03, 0.46, 26],
  [0.9, 0.42, 28],
  [0.12, 0.8, 32],
  [0.83, 0.78, 30],
];
const STARS = Array.from({ length: 22 }, (_, i) => [((i * 37) % 100) / 100, ((i * 53) % 70) / 100, 1 + (i % 3)] as const);

/**
 * Draws the heroes' world behind its children: sky, ground, decorations and the extra heroes.
 * `subtle` keeps decorations faint so they never compete with the game; `off` draws nothing.
 */
export function HeroScene({
  heroes,
  scene,
  children,
  style,
  compact = false,
}: {
  heroes: Character[];
  scene: SceneStyle;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Small previews: decorations only on the right edge, no companion heroes. */
  compact?: boolean;
}) {
  if (scene === 'off' || heroes.length === 0) return <View style={[styles.plain, style]}>{children}</View>;
  const world = WORLDS[worldOf(heroes[0])];
  const bold = scene === 'bold';
  return (
    <View style={[styles.fill, style]}>
      <LinearGradient colors={bold ? world.sky : [mix(world.sky[0]), '#FBFAF7']} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {world.dark && <Stars bold={bold} />}
        <Floor world={world} bold={bold} />
        {world.props.map((p, i) => {
          if (compact && i % 2 === 0) return null;
          const [x, y, size] = SPOTS[i % SPOTS.length];
          return (
            <Text key={i} style={[styles.prop, { left: `${x * 100}%`, top: `${y * 100}%`, fontSize: size, opacity: bold ? 0.9 : 0.32 }]}>
              {p}
            </Text>
          );
        })}
        {!compact && heroes.slice(1).map((h, i) => (
          <View key={i} style={[styles.companion, i === 0 ? { left: 10 } : { right: 10 }, { opacity: bold ? 1 : 0.85 }]}>
            <HeroSticker hero={h} size={bold ? 52 : 42} />
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}

/** Light version of a sky colour for subtle scenes (dark skies become a soft lavender). */
function mix(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * 0.25 + 255 * 0.75);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function Floor({ world, bold }: { world: WorldInfo; bold: boolean }) {
  if (world.floor === 'none') return null;
  const opacity = bold ? 1 : 0.35;
  const d =
    world.floor === 'waves'
      ? 'M0 30 Q 12.5 18 25 30 T 50 30 T 75 30 T 100 30 V 60 H 0 Z'
      : world.floor === 'skyline'
        ? 'M0 60 V 34 H 8 V 20 H 16 V 30 H 24 V 12 H 33 V 28 H 42 V 22 H 52 V 6 H 60 V 26 H 70 V 18 H 80 V 32 H 90 V 16 H 100 V 60 Z'
        : world.floor === 'pitch'
          ? 'M0 26 H 100 V 60 H 0 Z'
          : 'M0 34 Q 18 10 38 30 Q 56 46 74 24 Q 88 10 100 26 V 60 H 0 Z';
  return (
    <Svg width="100%" height="16%" viewBox="0 0 100 60" preserveAspectRatio="none" style={styles.floor}>
      <Path d={d} fill={world.ground} opacity={opacity} />
      {world.floor === 'pitch' && <Rect x="48" y="26" width="4" height="34" fill="#FFFFFF" opacity={opacity * 0.6} />}
    </Svg>
  );
}

/** Twinkling stars for night worlds (still in subtle mode). */
function Stars({ bold }: { bold: boolean }) {
  const twinkle = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    if (!bold) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(twinkle, { toValue: 1, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(twinkle, { toValue: 0.4, duration: 1400, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bold, twinkle]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: bold ? twinkle : 0.35 }]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {STARS.map(([x, y, r], i) => (
          <Circle key={i} cx={x * 100} cy={y * 100} r={r * 0.25} fill={bold ? '#FFFFFF' : '#7C6CF2'} />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  plain: { flex: 1, backgroundColor: '#FBFAF7' },
  fill: { flex: 1, backgroundColor: '#FBFAF7' },
  prop: { position: 'absolute' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  companion: { position: 'absolute', bottom: 12 },
});
