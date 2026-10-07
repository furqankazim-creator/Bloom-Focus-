import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, SHEET, Sheet, randInt, rng, secondsSince, shuffle , useCheer } from './shared';

const FRUITS = ['🍎', '🍐', '🎃', '🥦', '🍅', '🍆'];
const GAP = 64;
const BOX = 34;

/** Days 8 & 9: follow each fruit's line down the rows to build its number code. */
export default function FollowLines({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const cols: number = Math.min(6, cfg.fruits ?? 4);
  const rowsN: number = cfg.rows ?? 2;
  const { rows, links } = useMemo(() => {
    const rand = rng(seed);
    const rows = Array.from({ length: rowsN }, () => Array.from({ length: cols }, () => randInt(0, 9, rand)));
    // links[r][i] = which box in the next row column i joins to.
    const links = Array.from({ length: rowsN }, () => shuffle(Array.from({ length: cols }, (_, i) => i), rand));
    return { rows, links };
  }, [cols, rowsN, seed]);
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520) - 64;
  const colW = W / cols;
  const x = (c: number) => c * colW + colW / 2;
  const y = (r: number) => r * GAP;
  const start = useRef(Date.now());
  const [fruit, setFruit] = useState(0);
  const [depth, setDepth] = useState(0);
  const [pos, setPos] = useState(0);
  const [codes, setCodes] = useState<string[]>(Array(cols).fill(''));
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<string | null>(null);

  // Where the current fruit's line is (column) at each level of the tree.
  const columnAt = (f: number, d: number) => {
    let c = f;
    for (let k = 0; k <= d; k++) c = links[k][c];
    return c;
  };

  const tap = (r: number, c: number) => {
    if (r !== depth) return;
    if (c !== columnAt(fruit, depth)) {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(`${r}-${c}`);
      return setTimeout(() => setBad(null), 400);
    }
    cheer(true);
    const code = codes.map((s, i) => (i === fruit ? s + rows[r][c] : s));
    setCodes(code);
    setPos(c);
    if (depth + 1 < rowsN) return setDepth(depth + 1);
    if (fruit + 1 < cols) {
      setFruit(fruit + 1);
      setDepth(0);
      return;
    }
    setDepth(rowsN);
    setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong / (cols * rowsN)), activeSec: secondsSince(start.current) }), 600);
  };

  const H = (rowsN + 1) * GAP;
  return (
    <View>
      <GameBar left={t(`${FRUITS[fruit]} ${Math.min(fruit + 1, cols)} of ${cols}`)} right={t('Follow the line, tap where it lands')} />
      <Sheet>
        <View style={{ height: H + BOX }}>
          <Svg width={W} height={H + BOX} style={StyleSheet.absoluteFill} pointerEvents="none">
            {links.map((l, r) =>
              l.map((to, from) => {
                const active = from === (r === 0 ? fruit : columnAt(fruit, r - 1)) && r <= depth && fruit < cols;
                return <Line key={`${r}-${from}`} x1={x(from)} y1={y(r) + BOX} x2={x(to)} y2={y(r + 1)} stroke={active && r < depth ? colors.forest : '#5A6180'} strokeWidth={active && r < depth ? 3 : 1.3} />;
              }),
            )}
          </Svg>
          <View style={[styles.row, { top: 0 }]}>
            {FRUITS.slice(0, cols).map((f, c) => (
              <View key={c} style={[styles.box, { left: x(c) - BOX / 2 }, c === fruit && styles.boxNow]}>
                <Text style={{ fontSize: 20 }}>{f}</Text>
              </View>
            ))}
          </View>
          {rows.map((row, r) => (
            <View key={r} style={[styles.row, { top: y(r + 1) }]}>
              {row.map((n, c) => (
                <Pressable key={c} onPress={() => tap(r, c)} style={[styles.box, { left: x(c) - BOX / 2 }, bad === `${r}-${c}` && styles.bad, r < depth && c === columnAt(fruit, r) && styles.boxDone]} accessibilityLabel={`Number ${n}`}>
                  <Text style={styles.num}>{n}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
        <View style={styles.table}>
          {FRUITS.slice(0, cols).map((f, c) => (
            <View key={c} style={styles.tcell}>
              <Text style={{ fontSize: 18 }}>{f}</Text>
              <Text style={styles.code}>{codes[c] || '····'}</Text>
            </View>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0, height: BOX },
  box: { position: 'absolute', width: BOX, height: BOX, borderWidth: 1.2, borderColor: '#5A6180', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  boxNow: { backgroundColor: colors.lime },
  boxDone: { backgroundColor: '#E9F3D6' },
  bad: { backgroundColor: '#F6C9BD' },
  num: { fontFamily: font.semibold, fontSize: 16, color: SHEET.ink },
  table: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: '#5A6180', marginTop: 10 },
  tcell: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderWidth: 0.5, borderColor: '#AAA' },
  code: { fontFamily: font.bold, fontSize: 16, letterSpacing: 2, color: colors.forest },
});
