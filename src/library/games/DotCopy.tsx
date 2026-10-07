import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, SHEET, Sheet, rng, secondsSince, shuffle, useSheetTheme , useCheer } from './shared';

import { P3, P4, P5, type Seg } from '../patterns';

type Pattern = { n: number; segs: Seg[] };

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** Break lines into dot-to-dot steps so a long line equals the same line drawn in pieces. */
function unitKeys(segs: Seg[]): Set<string> {
  const out = new Set<string>();
  for (const [x1, y1, x2, y2] of segs) {
    const g = gcd(x2 - x1, y2 - y1) || 1;
    const sx = (x2 - x1) / g;
    const sy = (y2 - y1) / g;
    for (let i = 0; i < g; i++) {
      const a = [x1 + sx * i, y1 + sy * i];
      const b = [x1 + sx * (i + 1), y1 + sy * (i + 1)];
      const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? [a, b] : [b, a];
      out.add(`${p[0]},${p[1]}-${q[0]},${q[1]}`);
    }
  }
  return out;
}
const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((k) => b.has(k));

/** Days 3, 4, 10, 14: copy the drawing onto the empty dot grid. */
export default function DotCopy({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const sheetTheme = useSheetTheme();
  const patterns = useMemo<Pattern[]>(() => {
    const rand = rng(seed);
    const n: number = cfg.grid ?? 3;
    const own: Seg[][] = (cfg.patterns ?? []).filter((p: Seg[]) => p.length && p.every((sg) => sg.every((v) => v < n)));
    const builtIn = n === 3 ? P3 : n === 4 ? P4 : P5;
    // The therapist's own drawings come first, then built-in ones.
    const pool = [...own, ...shuffle(builtIn, rand)];
    return pool.slice(0, Math.max(1, cfg.count ?? 3)).map((segs) => ({ n, segs }));
  }, [level, seed, cfg.grid, cfg.count, cfg.patterns]);
  const { width } = useWindowDimensions();
  const box = Math.min(170, Math.floor((Math.min(width, 520) - 76) / 2));
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [lines, setLines] = useState<Seg[]>([]);
  const [first, setFirst] = useState<[number, number] | null>(null);
  const [checks, setChecks] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const pattern = patterns[i];
  const target = useMemo(() => unitKeys(pattern.segs), [pattern]);

  const advance = () => {
    setTimeout(() => {
      if (i + 1 < patterns.length) {
        setI(i + 1);
        setLines([]);
        setHint(null);
      } else onDone({ accuracy: Math.max(0.3, 1 - checks * 0.15), activeSec: secondsSince(start.current) });
    }, 600);
  };

  const tapDot = (x: number, y: number) => {
    if (!first) return setFirst([x, y]);
    if (first[0] === x && first[1] === y) return setFirst(null);
    const seg: Seg = [first[0], first[1], x, y];
    setFirst(null);
    const key = [...unitKeys([seg])].join('|');
    const exists = lines.findIndex((l) => [...unitKeys([l])].join('|') === key);
    const next = exists >= 0 ? lines.filter((_, k) => k !== exists) : [...lines, seg];
    setLines(next);
    setHint(null);
    if (sameSet(unitKeys(next), target)) {
      cheer(true);
      advance();
    }
  };

  const check = () => {
    const mine = unitKeys(lines);
    if (sameSet(mine, target)) return advance();
    setChecks((c) => c + 1);
    cheer(false);
    const missing = [...target].filter((k) => !mine.has(k)).length;
    const extra = [...mine].filter((k) => !target.has(k)).length;
    setHint(missing && extra ? `${missing} missing, ${extra} extra` : missing ? `${missing} line part${missing === 1 ? '' : 's'} missing` : `${extra} extra line part${extra === 1 ? '' : 's'}`);
  };

  return (
    <View>
      <GameBar left={t(`Pattern ${i + 1} of ${patterns.length}`)} right={first ? 'Tap the end dot' : 'Tap a start dot'} />
      <Sheet>
        <View style={styles.row}>
          <Grid n={pattern.n} size={box} segs={pattern.segs} />
          <Grid n={pattern.n} size={box} segs={lines} active={first} onDot={tapDot} />
        </View>
        <View style={styles.labels}>
          <Text style={styles.label}>{t('Look')}</Text>
          <Text style={styles.label}>{t('Make it')}</Text>
        </View>
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
      </Sheet>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Pressable onPress={() => { setLines([]); setFirst(null); }} style={[styles.clear, { backgroundColor: sheetTheme.tint }]} accessibilityRole="button">
          <Text style={[styles.clearText, { color: sheetTheme.color }]}>{t('Clear')}</Text>
        </Pressable>
        <Pressable onPress={check} style={[styles.check, { backgroundColor: sheetTheme.color }]} accessibilityRole="button">
          <Text style={styles.checkText}>{t('Check')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Grid({ n, size, segs, active, onDot }: { n: number; size: number; segs: Seg[]; active?: [number, number] | null; onDot?: (x: number, y: number) => void }) {
  const theme = useSheetTheme();
  const pad = 16;
  const step = (size - pad * 2) / (n - 1);
  const at = (v: number) => pad + v * step;
  const dots: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) dots.push([x, y]);
  return (
    <View style={[styles.grid, { width: size, height: size, borderColor: theme.color + '88', backgroundColor: onDot ? '#FFFDF6' : theme.tint + '55' }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        {segs.map(([x1, y1, x2, y2], k) => (
          <Line key={k} x1={at(x1)} y1={at(y1)} x2={at(x2)} y2={at(y2)} stroke={onDot ? '#F28C28' : theme.color} strokeWidth={4} strokeLinecap="round" />
        ))}
        {dots.map(([x, y]) => (
          <Circle key={`${x}${y}`} cx={at(x)} cy={at(y)} r={active && active[0] === x && active[1] === y ? 8 : 4} fill={active && active[0] === x && active[1] === y ? colors.forest : SHEET.ink} />
        ))}
      </Svg>
      {onDot &&
        dots.map(([x, y]) => (
          <Pressable key={`p${x}${y}`} onPress={() => onDot(x, y)} accessibilityLabel={`Dot ${x + 1}, ${y + 1}`} style={[styles.hit, { left: at(x) - 18, top: at(y) - 18 }]} />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  grid: { borderWidth: 2.5, borderRadius: 14 },
  hit: { position: 'absolute', width: 36, height: 36, borderRadius: 18 },
  labels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  label: { fontFamily: font.bold, fontSize: 13, letterSpacing: 1, color: colors.inkSoft, textTransform: 'uppercase' },
  hint: { fontFamily: font.semibold, fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: 8 },
  clear: { flex: 1, height: 52, borderRadius: 16, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontFamily: font.bold, fontSize: 16, color: colors.forest },
  check: { flex: 2, height: 52, borderRadius: 16, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontFamily: font.bold, fontSize: 16, color: colors.white },
});
