import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, Sheet, pick, rng, secondsSince, shuffle , useCheer } from './shared';

const HERO_SCENE = { name: 'Heroes', items: ['🦖', '🚀', '🦄', '🐬', '🦁', '🐶', '⚽', '🦸', '🐉', '🤖', '🐢', '🐼'] };
const SCENES = [
  { name: 'Town', items: ['🏠', '🏡', '🏢', '🚗', '🚌', '🚲', '🌳', '🚦', '🐕', '🎈', '☁️', '🏪'] },
  { name: 'Camping', items: ['⛺', '🔥', '🌲', '🍄', '🦋', '🐸', '🪵', '🌙', '⭐', '🎒', '🍫', '🐿️'] },
  { name: 'Sea', items: ['🐠', '🐙', '🐚', '⛵', '🦀', '🐬', '🌊', '🪸', '🐳', '🦑', '⚓', '🏝️'] },
];
const COLS = 5;
const ROWS = 4;

/** Day 5: two pictures with a few differences — find them all. */
export default function SpotDifference({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const { scene, top, bottom, diffs } = useMemo(() => {
    const rand = rng(seed);
    const byName: Record<string, (typeof SCENES)[number]> = { town: SCENES[0], camping: SCENES[1], sea: SCENES[2], heroes: HERO_SCENE };
    const scene = byName[cfg.theme] ?? pick(SCENES, rand);
    const top = Array.from({ length: COLS * ROWS }, () => pick(scene.items, rand));
    const n: number = Math.min(COLS * ROWS - 2, cfg.diffs ?? 3);
    const diffs = shuffle(top.map((_, i) => i), rand).slice(0, n);
    const bottom = [...top];
    for (const i of diffs) bottom[i] = rand() < 0.25 ? '' : pick(scene.items.filter((x) => x !== top[i]), rand);
    return { scene, top, bottom, diffs: new Set(diffs) };
  }, [level, seed, cfg.theme, cfg.diffs]);
  const { width } = useWindowDimensions();
  const cell = Math.floor((Math.min(width, 520) - 72) / COLS);
  const start = useRef(Date.now());
  const [found, setFound] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<number | null>(null);

  const tap = (i: number) => {
    if (found.has(i)) return;
    if (!diffs.has(i)) {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(i);
      return setTimeout(() => setBad(null), 400);
    }
    const next = new Set(found).add(i);
    setFound(next);
    cheer(true);
    if (next.size === diffs.size) setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong * 0.1), activeSec: secondsSince(start.current) }), 700);
  };

  const picture = (items: string[], label: string) => (
    <View style={[styles.frame, { width: cell * COLS + 12 }]}>
      {items.map((it, i) => (
        <Pressable key={i} onPress={() => tap(i)} style={[styles.cell, { width: cell, height: cell * 0.82 }, bad === i && styles.bad]} accessibilityLabel={`${label} ${i + 1}`}>
          <Text style={{ fontSize: cell * 0.5 }}>{it}</Text>
          {found.has(i) && <View style={styles.ring} />}
        </Pressable>
      ))}
    </View>
  );

  return (
    <View>
      <GameBar left={t(`${found.size}/${diffs.size} differences`)} right={`${scene.name} · tap what changed`} />
      <Sheet style={{ alignItems: 'center', gap: 10 }}>
        <Text style={styles.title}>{t(`Spot ${diffs.size} differences`)}</Text>
        {picture(top, 'Top picture')}
        {picture(bottom, 'Bottom picture')}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.bold, fontSize: 18, color: '#4A5170' },
  frame: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderStyle: 'dashed', borderColor: '#4A5170', padding: 4 },
  cell: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', top: 2, bottom: 2, left: 4, right: 4, borderRadius: 40, borderWidth: 3, borderColor: '#E53935' },
  bad: { backgroundColor: '#F6C9BD', borderRadius: 12 },
});
