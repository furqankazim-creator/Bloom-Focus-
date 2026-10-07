import React, { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Character } from '../../types';
import { presetFor } from '../../engine/heroes';
import { HERO_ART } from '../../components/hero/heroArt';
import { lightColors as colors, font } from '../../theme';
import { Tally, useTicker } from '../common';
import { FeedbackPill, TrainGameProps, easeOut, lerp, useFeedback, useGameEnv } from './shared';

/** Time between spawns at each speed step. */
const SPAWN_MS = [1700, 1400, 1150, 950, 800];
const EXIT_MS = 350;

type Item = {
  id: number;
  emoji: string;
  /** Set when a hero is the target; photo heroes draw their picture. */
  hero?: Character;
  target: boolean;
  x: number;
  y: number;
  born: number;
  life: number;
  end?: number;
  outcome?: 'hit' | 'wrong' | 'gone';
};

export default function TapStars({ params, durationSec, paused, onCorrect, onDone }: TrainGameProps) {
  const spawnMs = SPAWN_MS[params.speed - 1] ?? 1150;
  // Stars overlap a little more as the pace rises.
  const maxLive = params.speed >= 3 ? 2 : 1;
  const { fb, good, bad } = useFeedback();
  const { young, hero, heroes } = useGameEnv();
  const targetEmoji = hero?.emoji ?? '⭐';
  // Every chosen hero takes turns as the target.
  const targets = heroes.length ? heroes : hero ? [hero] : [];
  const size = young ? 1.45 : 1.2;
  const r = useRef({
    elapsed: 0,
    nextAt: 900,
    items: [] as Item[],
    tally: new Tally(),
    lastEmptyTap: -Infinity,
    nextId: 1,
    done: false,
  });
  const [, force] = useState(0);

  useTicker(
    paused,
    (dt) => {
      const s = r.current;
      if (s.done) return;
      s.elapsed += dt;
      const now = s.elapsed;

      for (const it of s.items) {
        if (!it.outcome && now - it.born >= it.life) {
          it.outcome = 'gone';
          it.end = now;
          if (it.target) s.tally.miss();
          else s.tally.reject();
        }
      }
      s.items = s.items.filter((it) => it.end === undefined || now - it.end < EXIT_MS);

      if (now >= durationSec * 1000) {
        s.done = true;
        onDone(s.tally.result(now));
        return;
      }

      const live = s.items.filter((it) => !it.outcome);
      if (now >= s.nextAt && live.length < maxLive) {
        let x = 50;
        let y = 50;
        for (let tries = 0; tries < 10; tries++) {
          x = 14 + Math.random() * 72;
          y = 10 + Math.random() * 72;
          if (live.every((o) => Math.hypot(o.x - x, o.y - y) > 26)) break;
        }
        s.items.push({
          id: s.nextId++,
          ...(() => {
            const h = targets.length ? targets[s.nextId % targets.length] : undefined;
            return { emoji: h?.emoji ?? targetEmoji, hero: h };
          })(),
          target: true,
          x,
          y,
          born: now,
          life: spawnMs * 1.5 + 300,
        });
        s.nextAt = now + spawnMs * (0.75 + Math.random() * 0.5);
      }
      force((n) => n + 1);
    },
    40,
  );

  const tapItem = (it: Item) => {
    const s = r.current;
    if (s.done || paused || it.outcome) return;
    it.outcome = it.target ? 'hit' : 'wrong';
    it.end = s.elapsed;
    if (it.target) {
      s.tally.hit(s.elapsed - it.born);
      onCorrect();
      good();
    } else {
      s.tally.falseTap();
      bad(hero ? `That’s not ${hero.name}!` : 'That’s not a star!');
    }
    force((n) => n + 1);
  };

  const tapEmpty = () => {
    const s = r.current;
    if (s.done || paused || s.elapsed < 900) return;
    // Rate-limited so one clumsy tap isn't punished several times.
    if (s.elapsed - s.lastEmptyTap < 1000) return;
    s.lastEmptyTap = s.elapsed;
    s.tally.falseTap();
    bad(`Wait for ${hero ? hero.name : 'a star'} ${targetEmoji}`);
  };

  const now = r.current.elapsed;

  return (
    <View style={styles.area}>
      <Pressable style={StyleSheet.absoluteFill} onPressIn={tapEmpty} accessibilityLabel="Play area" />
      {r.current.items.map((it) => {
        const age = now - it.born;
        let scale = lerp(0.3, 1, easeOut(age / 180));
        let opacity = 1;
        let dx = 0;
        let rise = 0;
        if (!it.outcome && age > it.life * 0.7) opacity = lerp(1, 0.45, (age - it.life * 0.7) / (it.life * 0.3));
        if (it.outcome && it.end !== undefined) {
          const k = (now - it.end) / EXIT_MS;
          opacity = lerp(1, 0, k);
          if (it.outcome === 'hit') {
            scale = lerp(1, 1.6, easeOut(k));
            rise = lerp(0, 34, easeOut(k));
          } else if (it.outcome === 'wrong') dx = Math.sin(k * Math.PI * 5) * 9;
          else scale = lerp(scale, 0.4, k);
        }
        return (
          <View key={it.id} style={[styles.itemWrap, { left: `${it.x}%`, top: `${it.y}%`, transform: [{ scale: size }] }]}>
            <Pressable
              onPressIn={() => tapItem(it)}
              hitSlop={young ? 24 : 16}
              disabled={!!it.outcome}
              accessibilityLabel={it.target ? 'Star' : 'Other shape'}
              style={{ opacity, transform: [{ translateX: dx }, { scale }] }}
            >
              {it.hero?.image ? (
                <Image source={{ uri: it.hero.image }} style={styles.heroPic} />
              ) : it.hero && presetFor(it.hero)?.id && HERO_ART[presetFor(it.hero)!.id!] ? (
                <Image source={HERO_ART[presetFor(it.hero)!.id!]} style={styles.heroArt} resizeMode="contain" />
              ) : (
                <Text style={styles.emoji}>{it.emoji}</Text>
              )}
            </Pressable>
            {it.outcome === 'hit' && (
              <Text pointerEvents="none" style={[styles.plus, { opacity, transform: [{ translateY: -rise }] }]}>
                +1
              </Text>
            )}
          </View>
        );
      })}
      <FeedbackPill fb={fb} />
      <Text pointerEvents="none" style={styles.hint}>
        Tap each {targetEmoji} the moment it appears
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    flex: 1,
    backgroundColor: '#FAF9F5',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemWrap: { position: 'absolute', width: 72, height: 72, marginLeft: -36, marginTop: -36, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 50, lineHeight: 62, textAlign: 'center' },
  heroArt: { width: 66, height: 66 },
  heroPic: { width: 60, height: 60, borderRadius: 18, borderWidth: 3, borderColor: '#FFFFFF' },
  plus: { position: 'absolute', top: -8, fontFamily: font.heavy, fontSize: 18, color: '#138A5E' },
  hint: { position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', fontFamily: font.semibold, fontSize: 16, color: colors.inkSoft },
});
