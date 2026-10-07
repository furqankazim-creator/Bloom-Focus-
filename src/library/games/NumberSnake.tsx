import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, OptionKey, SHEET, Sheet, randInt, rng, secondsSince, shuffle , useCheer } from './shared';

const PER_ROW = 4;

/** Day 11: start at the head and follow + and − along the snake. */
export default function NumberSnake({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const { startN, ops, values, options } = useMemo(() => {
    const rand = rng(seed);
    const steps: number = cfg.steps ?? 6;
    const maxOp: number = cfg.maxStep ?? 3;
    let v = randInt(3, 9, rand);
    const s = v;
    const ops: number[] = [];
    const values: number[] = [];
    for (let i = 0; i < steps; i++) {
      let d = randInt(1, maxOp, rand) * (rand() < 0.5 ? -1 : 1);
      if (v + d < 0 || v + d > 20) d = -d;
      v += d;
      ops.push(d);
      values.push(v);
    }
    const options = values.map((ans) => {
      const o = new Set([ans]);
      while (o.size < 4) o.add(Math.max(0, ans + randInt(-3, 3, rand)));
      return shuffle([...o], rand);
    });
    return { startN: s, ops, values, options };
  }, [level, seed, cfg.steps, cfg.maxStep]);
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 520) - 64;
  const gap = inner / PER_ROW;
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<number | null>(null);

  // Circles snake left→right, then right→left on the next row.
  const nodes = [startN, ...values];
  const rowH = 74;
  const pos = (k: number) => {
    const row = Math.floor(k / PER_ROW);
    const col = k % PER_ROW;
    const x = (row % 2 === 0 ? col : PER_ROW - 1 - col) * gap + gap / 2;
    return { x, y: row * rowH + 30 };
  };
  const height = Math.ceil(nodes.length / PER_ROW) * rowH;
  const d = nodes.map((_, k) => `${k === 0 ? 'M' : 'L'}${pos(k).x},${pos(k).y}`).join(' ');

  const choose = (v: number) => {
    if (v !== values[i]) {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(v);
      return setTimeout(() => setBad(null), 400);
    }
    const next = i + 1;
    setI(next);
    cheer(true);
    if (next === values.length) setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong / values.length), activeSec: secondsSince(start.current) }), 500);
  };

  return (
    <View>
      <GameBar left={t(`Step ${Math.min(i + 1, values.length)} of ${values.length}`)} right={i < values.length ? `${nodes[i]} ${ops[i] > 0 ? '+' : '−'} ${Math.abs(ops[i])} = ?` : 'Done!'} />
      <Sheet>
        <View style={{ height }}>
          <Svg width={inner} height={height} style={StyleSheet.absoluteFill}>
            <Path d={d} stroke="#4A5170" strokeWidth={2} fill="none" />
          </Svg>
          {nodes.map((n, k) => {
            const { x, y } = pos(k);
            const head = k === 0;
            const shown = head || k <= i;
            return (
              <View key={k} style={[head ? styles.head : styles.node, { left: x - (head ? 28 : 20), top: y - (head ? 20 : 20) }, k === i + 1 && styles.now]}>
                <Text style={[styles.val, head && { fontSize: 20 }]}>{shown ? n : ''}</Text>
              </View>
            );
          })}
          {ops.map((o, k) => {
            const a = pos(k);
            const b = pos(k + 1);
            return (
              <Text key={`o${k}`} style={[styles.op, { left: (a.x + b.x) / 2 - 16, top: (a.y + b.y) / 2 - (a.y === b.y ? 30 : 10) }]}>
                {o > 0 ? `+${o}` : `−${-o}`}
              </Text>
            );
          })}
        </View>
      </Sheet>
      {i < values.length && (
        <View style={styles.keys}>
          {options[i].map((o) => (
            <OptionKey key={o} label={String(o)} onPress={() => choose(o)} wrong={bad === o} size={64} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  node: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#4A5170', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  head: { position: 'absolute', width: 56, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#4A5170', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  now: { borderColor: colors.forest, borderWidth: 3, backgroundColor: colors.lime },
  val: { fontFamily: font.bold, fontSize: 16, color: SHEET.ink },
  op: { position: 'absolute', width: 32, textAlign: 'center', fontFamily: font.bold, fontSize: 13, color: SHEET.ink, backgroundColor: '#FFFFFFCC' },
  keys: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14 },
});
