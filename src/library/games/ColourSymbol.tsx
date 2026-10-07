import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, SHEET, Sheet, pick, rng, secondsSince , useCheer } from './shared';

type KeyItem = { colour: string; mark: string; name: string };

const FACES: KeyItem[] = [
  { colour: '#3FA34D', mark: '🙂', name: 'smile' },
  { colour: '#E03C31', mark: '😣', name: 'cross face' },
  { colour: '#3D6FD8', mark: '🙁', name: 'sad' },
  { colour: '#F2B33D', mark: '😀', name: 'big smile' },
];
const MARKS: KeyItem[] = [
  { colour: '#1E88D9', mark: '—', name: 'flat line' },
  { colour: '#4CAF50', mark: '|', name: 'up line' },
  { colour: '#FBC02D', mark: '✕', name: 'cross' },
  { colour: '#EF6C00', mark: '□', name: 'square' },
  { colour: '#E53935', mark: '◯', name: 'ring' },
];

/** Days 10, 11, 13: every colour has its own mark — give each dot the right one. */
export default function ColourSymbol({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const faces = cfg.style === 'faces';
  const key = (faces ? FACES : MARKS).slice(0, Math.min(faces ? 4 : 5, cfg.colours ?? 4));
  const total: number = cfg.dots ?? 20;
  const cols = total >= 40 ? 8 : total >= 24 ? 6 : total >= 20 ? 5 : 4;
  const rows = Math.ceil(total / cols);
  const dots = useMemo(() => {
    const rand = rng(seed);
    return Array.from({ length: total }, () => pick(key.map((_, i) => i), rand));
  }, [seed, level, cfg.style, cfg.colours, cfg.dots]); // eslint-disable-line react-hooks/exhaustive-deps
  const { width } = useWindowDimensions();
  const size = Math.min(48, Math.floor((Math.min(width, 520) - 70) / cols) - 6);
  const start = useRef(Date.now());
  const [tool, setTool] = useState(0);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<number | null>(null);

  const tap = (i: number) => {
    if (marked.has(i)) return;
    if (dots[i] !== tool) {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(i);
      return setTimeout(() => setBad(null), 400);
    }
    const next = new Set(marked).add(i);
    setMarked(next);
    cheer(true);
    if (next.size === dots.length) setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong / dots.length), activeSec: secondsSince(start.current) }), 500);
    // Move to the next colour once this one is finished.
    else if (!dots.some((d, k) => d === tool && !next.has(k))) setTool(key.findIndex((_, t) => dots.some((d, k) => d === t && !next.has(k))));
  };

  return (
    <View>
      <GameBar left={t(`${marked.size}/${dots.length} marked`)} right={`Mark every ${faces ? 'circle' : 'dot'} of this colour`} />
      <Sheet style={{ alignItems: 'center' }}>
        <View style={styles.key}>
          {key.map((k, i) => (
            <View key={k.name} style={styles.keyItem}>
              <Dot colour={k.colour} mark={k.mark} ring={faces} size={46} />
            </View>
          ))}
        </View>
        <View style={[styles.grid, { width: cols * (size + 6) }]}>
          {dots.map((d, i) => (
            <Pressable key={i} onPress={() => tap(i)} style={[styles.cell, { width: size + 6, height: size + 6 }, bad === i && styles.bad]} accessibilityLabel={`Dot ${i + 1}`}>
              <Dot colour={key[d].colour} mark={marked.has(i) ? key[d].mark : ''} ring={faces} size={size} />
            </Pressable>
          ))}
        </View>
      </Sheet>
      <View style={styles.tools}>
        {key.map((k, i) => (
          <Pressable key={k.name} onPress={() => setTool(i)} style={[styles.tool, tool === i && styles.toolOn]} accessibilityLabel={`Use ${k.name}`}>
            <Dot colour={k.colour} mark={k.mark} ring={faces} size={40} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Dot({ colour, mark, ring, size }: { colour: string; mark: string; ring: boolean; size: number }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, ring ? { borderWidth: 2.5, borderColor: colour } : { backgroundColor: colour }]}>
      {!!mark && <Text style={{ fontSize: size * (ring ? 0.62 : 0.7), lineHeight: size * 0.95, fontFamily: font.heavy, color: ring ? undefined : SHEET.ink }}>{mark}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  key: { flexDirection: 'row', gap: 12, borderWidth: 1.5, borderColor: '#9CC3E6', borderRadius: 14, padding: 8, marginBottom: 14 },
  keyItem: { alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center', borderRadius: 30 },
  bad: { backgroundColor: '#F6C9BD' },
  tools: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14 },
  tool: { padding: 6, borderRadius: 16, borderWidth: 2, borderColor: 'transparent', backgroundColor: colors.white },
  toolOn: { borderColor: colors.forest, backgroundColor: colors.lime },
});
