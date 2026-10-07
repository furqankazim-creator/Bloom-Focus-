import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, SHEET, ShapeGlyph, ShapeKind, Sheet, pick, rng, secondsSince , useCheer } from './shared';

type Entry = { shape: ShapeKind; colour: string; code: string };
type Setup = { entries: Entry[]; shapes: ShapeKind[]; colours: string[]; matrix: boolean; perRow: number; rows: number };

function setupFor(level: number): Setup {
  if (level === 1) {
    // Day 3: five outlined shapes, each with its own colour and number.
    const list: [ShapeKind, string][] = [['square', SHEET.red], ['circle', SHEET.green], ['diamond', '#3B3BD9'], ['pentagon', SHEET.yellow], ['triangle', SHEET.purple]];
    return { entries: list.map(([shape, colour], i) => ({ shape, colour, code: String(i + 1) })), shapes: list.map((l) => l[0]), colours: list.map((l) => l[1]), matrix: false, perRow: 5, rows: 3 };
  }
  if (level === 2) {
    // Days 7, 10, 11: shape rows × colour columns give numbers and letters.
    const shapes: ShapeKind[] = ['circle', 'square', 'triangle', 'heart'];
    const colours = [SHEET.red, SHEET.yellow, SHEET.blue, SHEET.green];
    const codes = [['1', '2', '3', '4'], ['A', 'C', 'D', 'E'], ['F', 'G', 'H', 'I'], ['5', '6', '7', '8']];
    return { entries: shapes.flatMap((shape, r) => colours.map((colour, c) => ({ shape, colour, code: codes[r][c] }))), shapes, colours, matrix: true, perRow: 4, rows: 4 };
  }
  // Day 13: 4 shapes × 8 colours, with look-alike letters b d p q.
  const shapes: ShapeKind[] = ['triangle', 'star', 'circle', 'square'];
  const colours = [SHEET.yellow, SHEET.red, SHEET.lime, SHEET.blue, SHEET.orange, SHEET.teal, '#7B3FA0', '#F6C7D3'];
  const codes = [
    ['0', '2', '4', '6', '8', '10', '12', '14'],
    ['B', 'D', 'P', 'Q', 'F', 'T', 'M', 'N'],
    ['1', '3', '5', '7', '9', '11', '13', '15'],
    ['b', 'd', 'p', 'q', 'f', 't', 'm', 'n'],
  ];
  return { entries: shapes.flatMap((shape, r) => colours.map((colour, c) => ({ shape, colour, code: codes[r][c] }))), shapes, colours, matrix: true, perRow: 6, rows: 4 };
}

/** Days 3, 7, 10, 11, 13: find each shape in the key and give it its code. */
export default function ShapeCode({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const keyKind: number = cfg.key ?? level;
  const setup = useMemo(() => ({ ...setupFor(keyKind), rows: cfg.rows ?? setupFor(keyKind).rows }), [keyKind, cfg.rows]);
  const items = useMemo(() => {
    const rand = rng(seed);
    return Array.from({ length: setup.perRow * setup.rows }, () => pick(setup.entries, rand));
  }, [setup, seed]);
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<string | null>(null);

  const answer = (e: Entry) => {
    if (i >= items.length) return;
    if (e.code === items[i].code) {
      const next = i + 1;
      setI(next);
      cheer(true);
      if (next === items.length) setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong / items.length), activeSec: secondsSince(start.current) }), 500);
    } else {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(e.code);
      setTimeout(() => setBad(null), 400);
    }
  };

  const filled = keyKind > 1;
  return (
    <View>
      <GameBar left={t(`${Math.min(i, items.length)}/${items.length} coded`)} right={t('Tap its code in the key')} />
      <Sheet style={{ alignItems: 'center' }}>
        {setup.matrix ? (
          <View style={styles.table}>
            <View style={styles.tr}>
              <View style={[styles.th, { width: 40 }]} />
              {setup.colours.map((c) => (
                <View key={c} style={[styles.th, { backgroundColor: c }]} />
              ))}
            </View>
            {setup.shapes.map((shape, r) => (
              <View key={shape} style={styles.tr}>
                <View style={[styles.td, { width: 40 }]}>
                  <ShapeGlyph kind={shape} size={24} fill={keyKind === 2} stroke={8} />
                </View>
                {setup.colours.map((c, ci) => {
                  const e = setup.entries[r * setup.colours.length + ci];
                  return (
                    <Pressable key={c} onPress={() => answer(e)} style={[styles.td, bad === e.code && styles.bad]} accessibilityLabel={`Code ${e.code}`}>
                      <Text style={styles.code}>{e.code}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.keyRow}>
            {setup.entries.map((e) => (
              <Pressable key={e.code} onPress={() => answer(e)} style={[styles.keyItem, bad === e.code && styles.bad]} accessibilityLabel={`Code ${e.code}`}>
                <ShapeGlyph kind={e.shape} size={44} color={e.colour} stroke={8} />
                <Text style={styles.keyNum}>{e.code}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.divider} />
        <View style={{ gap: 8 }}>
          {Array.from({ length: setup.rows }, (_, r) => (
            <View key={r} style={styles.itemRow}>
              {items.slice(r * setup.perRow, (r + 1) * setup.perRow).map((it, k) => {
                const idx = r * setup.perRow + k;
                return (
                  <View key={k} style={[styles.item, idx === i && styles.current]}>
                    <ShapeGlyph kind={it.shape} size={setup.perRow > 5 ? 36 : 46} color={it.colour} fill={filled} stroke={9} />
                    <Text style={styles.ans}>{idx < i ? it.code : ' '}</Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  table: { borderWidth: 1.5, borderColor: '#4A5170' },
  tr: { flexDirection: 'row' },
  th: { width: 34, height: 26, borderWidth: 0.5, borderColor: '#4A5170' },
  td: { width: 34, height: 34, borderWidth: 0.5, borderColor: '#4A5170', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  code: { fontFamily: font.bold, fontSize: 15, color: SHEET.ink },
  bad: { backgroundColor: '#F6C9BD' },
  keyRow: { flexDirection: 'row', gap: 10 },
  keyItem: { alignItems: 'center', justifyContent: 'center', borderRadius: 10, padding: 4 },
  keyNum: { position: 'absolute', fontFamily: font.bold, fontSize: 17, color: SHEET.ink, top: 15 },
  divider: { alignSelf: 'stretch', height: 1, backgroundColor: '#CFCFCF', marginVertical: 14 },
  itemRow: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  item: { alignItems: 'center', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 4, borderWidth: 2, borderColor: 'transparent' },
  current: { borderColor: colors.forest, backgroundColor: '#F1F8E4' },
  ans: { fontFamily: font.bold, fontSize: 16, color: colors.forest, marginTop: 2, minHeight: 20 },
});
