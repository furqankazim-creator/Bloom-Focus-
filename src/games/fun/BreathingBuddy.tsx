import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { HeroSticker } from '../../components/hero/HeroSticker';
import { HERO_PRESETS } from '../../engine/heroes';
import { lightColors as colors, font } from '../../theme';
import type { FunGameProps } from './shared';

const IN_MS = 4000;
const HOLD_MS = 1500;
const OUT_MS = 5000;
const BREATHS = 5;
const native = Platform.OS !== 'web';

/** Calm corner: breathe in as the circle grows, out as it shrinks, five times. */
export default function BreathingBuddy({ heroes, onWin }: FunGameProps) {
  const hero = heroes[0] ?? HERO_PRESETS.find((h) => h.id === 'bamboo-bao')!;
  const size = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    let breaths = 0;
    const cycle = () => {
      if (!alive) return;
      setPhase('in');
      Animated.timing(size, { toValue: 1, duration: IN_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: native }).start(() => {
        if (!alive) return;
        setPhase('hold');
        setTimeout(() => {
          if (!alive) return;
          setPhase('out');
          Animated.timing(size, { toValue: 0, duration: OUT_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: native }).start(() => {
            if (!alive) return;
            breaths++;
            setCount(breaths);
            if (breaths >= BREATHS) onWin(`You took ${BREATHS} calm breaths with ${hero.name}. 💙`);
            else cycle();
          });
        }, HOLD_MS);
      });
    };
    cycle();
    return () => {
      alive = false;
      size.stopAnimation();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scale = size.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const glow = size.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.8] });
  return (
    <View style={styles.wrap}>
      <Text style={styles.phase}>{phase === 'in' ? 'Breathe in…' : phase === 'hold' ? 'Hold…' : 'Breathe out…'}</Text>
      <View style={styles.stage}>
        <Animated.View style={[styles.ring, { opacity: glow, transform: [{ scale }] }]} />
        <Animated.View style={[styles.circle, { transform: [{ scale }] }]} />
        <HeroSticker hero={hero} size={96} showName />
      </View>
      <View style={styles.dots}>
        {Array.from({ length: BREATHS }).map((_, i) => (
          <View key={i} style={[styles.dot, i < count && styles.dotOn]} />
        ))}
      </View>
      <Text style={styles.hint}>
        {count} of {BREATHS} breaths · follow the circle with {hero.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  phase: { fontFamily: font.heavy, fontSize: 30, color: '#4A5BA8' },
  stage: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#CFE0FF' },
  circle: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: '#E6EEFF', borderWidth: 4, borderColor: '#A9C2FF' },
  dots: { flexDirection: 'row', gap: 10 },
  dot: { width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 2, borderColor: '#A9C2FF' },
  dotOn: { backgroundColor: '#7C9BFF', borderColor: '#7C9BFF' },
  hint: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft },
});
