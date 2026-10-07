import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, SHEET, Sheet, rng, secondsSince , useSheetTheme , useCheer } from './shared';

const DARK = '#5A6180';

/** Day 3: stack see-through cards; a square is dark if it is dark on any card. */
export default function StackSquares({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const sheetTheme = useSheetTheme();
  const n: number = cfg.grid ?? 2;
  const cards: number = cfg.cards ?? 2;
  const qs = useMemo(() => {
    const rand = rng(seed);
    return Array.from({ length: 6 }, () => Array.from({ length: cards }, () => Array.from({ length: n * n }, () => rand() < (n === 2 ? 0.35 : 0.25))));
  }, [n, cards, seed]);
  const start = useRef(Date.now());
  const [q, setQ] = useState(0);
  const [mine, setMine] = useState<boolean[]>(Array(n * n).fill(false));
  const [wrong, setWrong] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const answer = qs[q][0].map((_, i) => qs[q].some((card) => card[i]));

  const check = () => {
    if (answer.every((v, i) => v === mine[i])) {
      setMsg(null);
      cheer(true);
      if (q + 1 < qs.length) {
        setQ(q + 1);
        setMine(Array(n * n).fill(false));
      } else onDone({ accuracy: Math.max(0, 1 - wrong / qs.length), activeSec: secondsSince(start.current) });
    } else {
      setWrong((w) => w + 1);
      cheer(false);
      setMsg(t('Not quite — look at each square on every card.'));
    }
  };

  const size = n === 2 ? 30 : 22;
  return (
    <View>
      <GameBar left={t(`Card ${q + 1} of ${qs.length}`)} right={t('Shade the answer card')} />
      <Sheet style={{ alignItems: 'center' }}>
        <View style={styles.row}>
          {qs[q].map((card, ci) => (
            <React.Fragment key={ci}>
              {ci > 0 && <Text style={styles.sign}>+</Text>}
              <Card cells={card} n={n} size={size} />
            </React.Fragment>
          ))}
          <Text style={styles.sign}>=</Text>
          <Card cells={mine} n={n} size={size + 8} onTap={(i) => setMine(mine.map((v, k) => (k === i ? !v : v)))} />
        </View>
        {!!msg && <Text style={styles.msg}>{msg}</Text>}
      </Sheet>
      <Pressable onPress={check} style={[styles.check, { backgroundColor: sheetTheme.color }]} accessibilityRole="button">
        <Text style={styles.checkText}>{t('Check')}</Text>
      </Pressable>
    </View>
  );
}

function Card({ cells, n, size, onTap }: { cells: boolean[]; n: number; size: number; onTap?: (i: number) => void }) {
  return (
    <View style={[styles.card, { width: size * n + 4 }]}>
      {cells.map((dark, i) =>
        onTap ? (
          <Pressable key={i} onPress={() => onTap(i)} style={[styles.cell, { width: size, height: size }, dark && { backgroundColor: DARK }]} accessibilityLabel={`Square ${i + 1}`} />
        ) : (
          <View key={i} style={[styles.cell, { width: size, height: size }, dark && { backgroundColor: DARK }]} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  sign: { fontFamily: font.heavy, fontSize: 26, color: SHEET.ink },
  card: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: '#4A5170' },
  cell: { borderWidth: 1, borderColor: '#4A5170', backgroundColor: '#FFF' },
  msg: { fontFamily: font.semibold, fontSize: 14, color: colors.danger, marginTop: 12, textAlign: 'center' },
  check: { height: 54, borderRadius: 18, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  checkText: { fontFamily: font.bold, fontSize: 17, color: colors.white },
});
