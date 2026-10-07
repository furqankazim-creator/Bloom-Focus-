import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, SHEET, Sheet, randInt, rng, secondsSince, shuffle , useCheer } from './shared';

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

/** Split a total into dice of 1–6. */
function diceFor(total: number, count: number, rand: () => number): number[] {
  for (;;) {
    const d = Array.from({ length: count }, () => randInt(1, 6, rand));
    const diff = total - d.reduce((a, b) => a + b, 0);
    d[0] += diff;
    if (d[0] >= 1 && d[0] <= 6) return d;
  }
}

/** Day 7: match each sum (or count) with the dice that show the same number. */
export default function DiceMatch({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const qs = useMemo(() => {
    const rand = rng(seed);
    const max: number = cfg.max ?? 6;
    return Array.from({ length: cfg.questions ?? 8 }, () => {
      if (max <= 6) {
        const n = randInt(1, 6, rand);
        const options = shuffle([...new Set([n, randInt(1, 6, rand), randInt(1, 6, rand), randInt(1, 6, rand)])], rand);
        return { prompt: null as null | [number, number], total: n, options: options.map((o) => [o]) };
      }
      const a = randInt(0, max <= 12 ? 6 : 10, rand);
      const b = randInt(1, Math.min(9, max - a), rand);
      const total = a + b;
      const count = total > 12 ? 3 : total > 6 ? 2 : 1;
      const totals = new Set([total]);
      while (totals.size < 3) totals.add(Math.max(1, Math.min(max, total + randInt(-3, 3, rand))));
      const options = shuffle([...totals], rand).map((t) => diceFor(t, t > 12 ? 3 : t > 6 ? 2 : Math.max(1, count - 1), rand));
      return { prompt: [a, b] as [number, number], total, options };
    });
  }, [level, seed, cfg.max, cfg.questions]);
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<number | null>(null);
  const q = qs[Math.min(i, qs.length - 1)];

  const choose = (k: number) => {
    const sum = q.options[k].reduce((a, b) => a + b, 0);
    if (sum !== q.total) {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(k);
      return setTimeout(() => setBad(null), 400);
    }
    const next = i + 1;
    setI(next);
    cheer(true);
    if (next === qs.length) setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong / qs.length), activeSec: secondsSince(start.current) }), 500);
  };

  return (
    <View>
      <GameBar left={t(`${Math.min(i + 1, qs.length)} of ${qs.length}`)} right={(cfg.max ?? 6) <= 6 ? 'Which dice shows the number?' : 'Which dice match the sum?'} />
      <Sheet style={{ alignItems: 'center' }}>
        <View style={styles.promptRow}>
          <View style={styles.sumBox}>
            <Text style={styles.sumText}>{q.prompt ? `${q.prompt[0]} + ${q.prompt[1]}` : q.total}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={[styles.sumBox, { backgroundColor: '#FFF7C2' }]}>
            <Text style={styles.sumText}>{i > 0 || q.prompt === null ? '?' : '?'}</Text>
          </View>
        </View>
        <View style={{ gap: 10, marginTop: 14 }}>
          {q.options.map((dice, k) => (
            <Pressable key={k} onPress={() => choose(k)} style={[styles.option, bad === k && styles.bad]} accessibilityLabel={`Dice showing ${dice.join(' and ')}`}>
              {dice.map((d, j) => (
                <Die key={j} n={d} />
              ))}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

function Die({ n }: { n: number }) {
  return (
    <View style={styles.die}>
      {PIPS[n].map(([x, y], k) => (
        <View key={k} style={[styles.pip, { left: 6 + x * 12, top: 6 + y * 12 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sumBox: { minWidth: 90, height: 50, borderWidth: 1.5, borderColor: '#5A6180', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  sumText: { fontFamily: font.bold, fontSize: 22, color: SHEET.ink },
  arrow: { fontFamily: font.heavy, fontSize: 26, color: '#1A237E' },
  option: { flexDirection: 'row', gap: 6, padding: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDD', backgroundColor: '#FFF', alignSelf: 'center' },
  bad: { backgroundColor: '#F6C9BD' },
  die: { width: 44, height: 44, borderRadius: 8, borderWidth: 1.5, borderColor: '#5A6180', backgroundColor: '#FFF' },
  pip: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: SHEET.ink },
});
