import { t } from '../../i18n';
import React, { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { HERO_ART } from '../../components/hero/heroArt';
import { presetFor } from '../../engine/heroes';
import { playSound } from '../../services/sounds';
import { lightColors as colors, font } from '../../theme';
import type { Character } from '../../types';
import { useTicker } from '../common';
import type { FunGameProps } from './shared';

const COLORS = ['#8EC5FF', '#FFB3D1', '#A8E6CF', '#FFD98E', '#C9B6FF', '#9EE7F0'];
const MAX = 9;

type Bubble = { id: number; x: number; size: number; color: string; born: number; rise: number; hero?: Character; popped?: number };

/** Relaxing bubble popping. Hero bubbles are worth 3. Endless — stop any time. */
export default function BubblePop({ heroes, calm }: FunGameProps) {
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [score, setScore] = useState(0);
  const [, force] = useState(0);
  const s = useRef({ t: 0, next: 0, id: 0, list: [] as Bubble[] });

  useTicker(false, (dt) => {
    const r = s.current;
    r.t += dt;
    // Gone once off the top, or a moment after popping.
    r.list = r.list.filter((b) => (b.popped ? r.t - b.popped < 260 : r.t - b.born < b.rise));
    if (area.h && r.t >= r.next && r.list.filter((b) => !b.popped).length < MAX) {
      const size = 56 + Math.random() * 46;
      const heroPick = heroes.length && Math.random() < 0.14 ? heroes[Math.floor(Math.random() * heroes.length)] : undefined;
      r.list.push({
        id: r.id++,
        x: Math.random() * Math.max(1, area.w - size),
        size: heroPick ? 96 : size,
        color: COLORS[r.id % COLORS.length],
        born: r.t,
        rise: (calm ? 11000 : 8000) + Math.random() * 3000,
        hero: heroPick,
      });
      r.next = r.t + (calm ? 1100 : 700) + Math.random() * 500;
    }
    force((n) => n + 1);
  }, 40);

  const pop = (b: Bubble) => {
    if (b.popped) return;
    b.popped = s.current.t;
    playSound('pop');
    setScore((n) => n + (b.hero ? 3 : 1));
  };

  const now = s.current.t;
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.score}>
        <Text style={styles.scoreText}>🫧 {t(`${score} popped`)}</Text>
      </View>
      <View style={styles.area} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        {s.current.list.map((b) => {
          const age = now - b.born;
          const y = area.h - (age / b.rise) * (area.h + b.size);
          const wobble = Math.sin(age / 500 + b.id) * 10;
          const k = b.popped ? (now - b.popped) / 260 : 0;
          const preset = b.hero ? presetFor(b.hero) : undefined;
          return (
            <Pressable
              key={b.id}
              onPressIn={() => pop(b)}
              style={[
                styles.bubble,
                {
                  left: b.x + wobble,
                  top: y,
                  width: b.size,
                  height: b.size,
                  borderRadius: b.size / 2,
                  backgroundColor: `${b.color}66`,
                  borderColor: b.color,
                  opacity: 1 - k,
                  transform: [{ scale: 1 + k * 0.6 }],
                },
              ]}
              accessibilityLabel="Bubble"
            >
              <View style={[styles.shine, { width: b.size * 0.26, height: b.size * 0.16, borderRadius: b.size }]} />
              {b.hero &&
                (b.hero.image ? (
                  <Image source={{ uri: b.hero.image }} style={{ width: b.size * 0.62, height: b.size * 0.62, borderRadius: b.size }} />
                ) : preset?.id && HERO_ART[preset.id] ? (
                  <Image source={HERO_ART[preset.id]} style={{ width: b.size * 0.66, height: b.size * 0.66 }} resizeMode="contain" />
                ) : (
                  <Text style={{ fontSize: b.size * 0.45 }}>{b.hero.emoji}</Text>
                ))}
              {!!b.popped && <Text style={styles.plus}>{b.hero ? '+3 ⭐' : '+1'}</Text>}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{t('Pop the bubbles! Hero bubbles are worth 3 ⭐')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  score: { alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)' },
  scoreText: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  area: { flex: 1, overflow: 'hidden' },
  bubble: { position: 'absolute', borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  shine: { position: 'absolute', top: '16%', left: '20%', backgroundColor: 'rgba(255,255,255,0.85)', transform: [{ rotate: '-30deg' }] },
  plus: { position: 'absolute', top: -22, fontFamily: font.heavy, fontSize: 16, color: colors.forest },
  hint: { textAlign: 'center', fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, paddingVertical: 10 },
});
