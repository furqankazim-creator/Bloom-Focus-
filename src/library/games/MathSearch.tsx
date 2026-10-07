import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, SHEET, Sheet, randInt, rng, secondsSince , useCheer } from './shared';

const RULES = [
  { target: 10, op: '+' as const, size: 6, find: 5 },
  { target: 8, op: '+' as const, size: 8, find: 7 },
  { target: 6, op: '-' as const, size: 8, find: 7 },
];

/** Days 11 & 12: circle two neighbouring numbers that make the big number. */
export default function MathSearch({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const base = RULES[level - 1] ?? RULES[0];
  const rule = useMemo(() => ({ ...base, target: cfg.target ?? base.target, op: (cfg.op ?? base.op) as '+' | '-', find: cfg.find ?? base.find, size: cfg.size ?? base.size }), [base, cfg.target, cfg.op, cfg.find, cfg.size]);
  const cells = useMemo(() => {
    const rand = rng(seed);
    const max = rule.op === '-' ? 15 : 9;
    const g = Array.from({ length: rule.size * rule.size }, () => randInt(0, max, rand));
    // Plant enough answers so the target is reachable.
    for (let k = 0; k < rule.find + 2; k++) {
      const i = randInt(0, g.length - 1, rand);
      const right = (i % rule.size) < rule.size - 1;
      const j = right ? i + 1 : i + rule.size < g.length ? i + rule.size : i - rule.size;
      const a = rule.op === '+' ? randInt(0, rule.target, rand) : randInt(rule.target, max, rand);
      g[i] = a;
      g[j] = rule.op === '+' ? rule.target - a : a - rule.target;
    }
    return g;
  }, [rule, seed]);
  const ok = (a: number, b: number) => (rule.op === '+' ? cells[a] + cells[b] === rule.target : Math.abs(cells[a] - cells[b]) === rule.target);
  const near = (a: number, b: number) => (Math.abs(a - b) === 1 && Math.floor(a / rule.size) === Math.floor(b / rule.size)) || Math.abs(a - b) === rule.size;
  // Ask for as many pairs as the grid really has (up to the level's number).
  const goal = useMemo(() => {
    let n = 0;
    for (let a = 0; a < cells.length; a++) for (const b of [a + 1, a + rule.size]) if (b < cells.length && near(a, b) && ok(a, b)) n++;
    return Math.min(rule.find, n);
  }, [cells]); // eslint-disable-line react-hooks/exhaustive-deps
  const { width } = useWindowDimensions();
  const cell = Math.min(44, Math.floor((Math.min(width, 520) - 64) / rule.size));
  const start = useRef(Date.now());
  const [first, setFirst] = useState<number | null>(null);
  const [pairs, setPairs] = useState<[number, number][]>([]);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<number[] | null>(null);

  const tap = (c: number) => {
    if (first === null) return setFirst(c);
    if (first === c) return setFirst(null);
    const a = first;
    setFirst(null);
    const used = pairs.some((p) => (p[0] === a && p[1] === c) || (p[0] === c && p[1] === a));
    if (near(a, c) && ok(a, c) && !used) {
      const next = [...pairs, [a, c] as [number, number]];
      setPairs(next);
      cheer(true);
      if (next.length === goal) setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong / (goal * 2)), activeSec: secondsSince(start.current) }), 600);
    } else {
      setWrong((w) => w + 1);
      cheer(false);
      setFlash([a, c]);
      setTimeout(() => setFlash(null), 450);
    }
  };

  const inPair = new Set(pairs.flat());
  return (
    <View>
      <GameBar left={t(`${pairs.length}/${goal} found`)} right={rule.op === '+' ? `Two that add to ${rule.target}` : `Two that differ by ${rule.target}`} />
      <Sheet style={{ alignItems: 'center' }}>
        <View style={styles.target}>
          <Text style={styles.targetText}>{rule.target}</Text>
        </View>
        <Text style={styles.rule}>{t(rule.op === '+' ? `Circle two numbers side by side that add up to ${rule.target}.` : `Circle two numbers side by side: big − small = ${rule.target}.`)}</Text>
        <View style={[styles.grid, { width: cell * rule.size + 2 }]}>
          {cells.map((n, i) => (
            <Pressable
              key={i}
              onPress={() => tap(i)}
              accessibilityLabel={`Number ${n}`}
              style={[styles.cell, { width: cell, height: cell }, inPair.has(i) && styles.found, first === i && styles.first, flash?.includes(i) && styles.bad]}
            >
              <Text style={[styles.num, { fontSize: cell * 0.46 }]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  target: { width: 76, height: 76, borderWidth: 2, borderColor: '#4A5170', alignItems: 'center', justifyContent: 'center' },
  targetText: { fontFamily: font.heavy, fontSize: 46, color: SHEET.ink },
  rule: { fontFamily: font.medium, fontSize: 13.5, color: colors.inkSoft, textAlign: 'center', marginVertical: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1.5, borderColor: '#4A5170' },
  cell: { borderWidth: 0.5, borderColor: '#5A6180', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  num: { fontFamily: font.bold, color: SHEET.ink },
  found: { backgroundColor: '#E9F3D6', borderRadius: 14 },
  first: { backgroundColor: colors.lime },
  bad: { backgroundColor: '#F6C9BD' },
});
