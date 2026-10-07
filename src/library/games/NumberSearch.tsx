import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, SHEET, Sheet, randInt, rng, secondsSince , useCheer } from './shared';

type Placed = { word: string; cells: number[] };

/** Builds a digit grid with numbers hidden across (→) or down (↓), like the worksheets. */
function build(cfg: Record<string, any>, seed: number) {
  const rand = rng(seed);
  const size: number = cfg.size ?? 8;
  const count: number = cfg.count ?? 5;
  const cells: string[] = Array(size * size).fill('');
  const placed: Placed[] = [];
  let guard = 0;
  while (placed.length < count && guard++ < 500) {
    const len = cfg.digits === 34 ? randInt(3, 4, rand) : Math.min(size, cfg.digits ?? 3);
    const word = String(randInt(10 ** (len - 1), 10 ** len - 1, rand));
    if (placed.some((p) => p.word === word)) continue;
    const down = rand() < 0.5;
    const x0 = randInt(0, down ? size - 1 : size - len, rand);
    const y0 = randInt(0, down ? size - len : size - 1, rand);
    const idx = Array.from({ length: len }, (_, i) => (y0 + (down ? i : 0)) * size + x0 + (down ? 0 : i));
    if (idx.some((c, i) => cells[c] && cells[c] !== word[i])) continue;
    idx.forEach((c, i) => (cells[c] = word[i]));
    placed.push({ word, cells: idx });
  }
  for (let i = 0; i < cells.length; i++) if (!cells[i]) cells[i] = String(randInt(0, 9, rand));
  return { size, cells, placed: placed.sort((a, b) => Number(a.word) - Number(b.word)) };
}

/** Days 8, 9, 12: find the listed numbers in the digit grid. */
export default function NumberSearch({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const grid = useMemo(() => build(cfg, seed), [cfg, seed]);
  const { width } = useWindowDimensions();
  const cell = Math.min(40, Math.floor((Math.min(width, 520) - 64) / grid.size));
  const start = useRef(Date.now());
  const [first, setFirst] = useState<number | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<number[] | null>(null);

  const tap = (c: number) => {
    if (first === null) return setFirst(c);
    if (first === c) return setFirst(null);
    const hit = grid.placed.find((p) => !found.includes(p.word) && ((p.cells[0] === first && p.cells[p.cells.length - 1] === c) || (p.cells[0] === c && p.cells[p.cells.length - 1] === first)));
    setFirst(null);
    if (hit) {
      const next = [...found, hit.word];
      setFound(next);
      cheer(true);
      if (next.length === grid.placed.length) setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong * 0.05), activeSec: secondsSince(start.current) }), 600);
    } else {
      setWrong((w) => w + 1);
      cheer(false);
      setFlash([first, c]);
      setTimeout(() => setFlash(null), 450);
    }
  };

  const foundCells = new Set(grid.placed.filter((p) => found.includes(p.word)).flatMap((p) => p.cells));
  return (
    <View>
      <GameBar left={t(`${found.length}/${grid.placed.length} numbers found`)} right={first !== null ? 'Now tap the last digit' : 'Tap the first digit'} />
      <Sheet style={{ alignItems: 'center' }}>
        <View style={[styles.grid, { width: cell * grid.size + 2 }]}>
          {grid.cells.map((d, i) => (
            <Pressable
              key={i}
              onPress={() => tap(i)}
              accessibilityLabel={`Digit ${d}`}
              style={[styles.cell, { width: cell, height: cell }, foundCells.has(i) && styles.found, first === i && styles.first, flash?.includes(i) && styles.bad]}
            >
              <Text style={[styles.digit, { fontSize: cell * 0.5 }, foundCells.has(i) && styles.struck]}>{d}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.list}>
          {grid.placed.map((p) => (
            <Text key={p.word} style={[styles.word, found.includes(p.word) && styles.wordDone]}>
              {p.word}
            </Text>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1.5, borderColor: '#4A5170' },
  cell: { borderWidth: 0.5, borderColor: '#5A6180', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  digit: { fontFamily: font.semibold, color: SHEET.ink },
  found: { backgroundColor: '#E9F3D6' },
  struck: { textDecorationLine: 'line-through', color: colors.forest },
  first: { backgroundColor: colors.lime },
  bad: { backgroundColor: '#F6C9BD' },
  list: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 14, borderWidth: 1, borderColor: '#5A6180', padding: 10, alignSelf: 'stretch' },
  word: { fontFamily: font.semibold, fontSize: 16, color: SHEET.ink, width: '30%', textAlign: 'center' },
  wordDone: { textDecorationLine: 'line-through', color: '#9AA79F' },
});
