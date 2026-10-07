import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, OptionKey, SHEET, ShapeGlyph, ShapeKind, Sheet, rng, secondsSince, shuffle , useCheer } from './shared';

// Day 3: each filled shape is worth a number.
const KEY: { shape: ShapeKind; colour: string; value: number }[] = [
  { shape: 'triangle', colour: '#4A90D9', value: 1 },
  { shape: 'square', colour: '#6AA84F', value: 3 },
  { shape: 'circle', colour: SHEET.red, value: 4 },
  { shape: 'diamond', colour: '#F6B819', value: 5 },
  { shape: 'rightTriangle', colour: '#7B3FA0', value: 6 },
  { shape: 'trapezoid', colour: SHEET.orange, value: 7 },
  { shape: 'pentagon', colour: '#9E9E9E', value: 8 },
];

type Q = { terms: number[]; ops: ('+' | '-')[]; answer: number; options: number[] };

/** Day 3: swap each shape for its number and add them up. */
export default function ShapeSums({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const qs = useMemo<Q[]>(() => {
    const rand = rng(seed);
    const key = (cfg.terms ?? 2) <= 2 ? KEY.slice(0, 5) : KEY;
    return Array.from({ length: cfg.questions ?? 6 }, () => {
      const n = cfg.terms ?? 2;
      for (;;) {
        const terms = Array.from({ length: n }, () => Math.floor(rand() * key.length));
        const ops = terms.slice(1).map(() => (cfg.minus && rand() < 0.5 ? '-' : '+') as '+' | '-');
        const answer = terms.slice(1).reduce((t, k, i) => (ops[i] === '+' ? t + key[k].value : t - key[k].value), key[terms[0]].value);
        if (answer < 0) continue;
        const opts = new Set([answer]);
        while (opts.size < 4) opts.add(Math.max(0, answer + Math.floor(rand() * 7) - 3));
        return { terms, ops, answer, options: shuffle([...opts], rand) };
      }
    });
  }, [level, seed, cfg.terms, cfg.minus, cfg.questions]);
  const key = (cfg.terms ?? 2) <= 2 ? KEY.slice(0, 5) : KEY;
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const q = qs[Math.min(i, qs.length - 1)];

  const choose = (v: number) => {
    if (v !== q.answer) {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(v);
      return setTimeout(() => setBad(null), 400);
    }
    setAnswers([...answers, v]);
    cheer(true);
    const next = i + 1;
    setI(next);
    if (next === qs.length) setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong / qs.length), activeSec: secondsSince(start.current) }), 500);
  };

  return (
    <View>
      <GameBar left={t(`Sum ${Math.min(i + 1, qs.length)} of ${qs.length}`)} right={t('Pick the answer')} />
      <Sheet style={{ alignItems: 'center' }}>
        <View style={styles.key}>
          {key.map((k) => (
            <View key={k.shape} style={styles.keyCell}>
              <ShapeGlyph kind={k.shape} size={30} color={k.colour} fill />
              <Text style={styles.keyNum}>{k.value}</Text>
            </View>
          ))}
        </View>
        <View style={{ gap: 10, marginTop: 16, alignSelf: 'stretch' }}>
          {qs.map((qq, qi) => (
            <View key={qi} style={[styles.eq, qi === i && styles.eqNow]}>
              {qq.terms.map((t, k) => (
                <React.Fragment key={k}>
                  {k > 0 && <Text style={styles.op}>{qq.ops[k - 1]}</Text>}
                  <ShapeGlyph kind={key[t].shape} size={34} color={key[t].colour} fill />
                </React.Fragment>
              ))}
              <Text style={styles.op}>=</Text>
              <Text style={styles.answer}>{qi < i ? answers[qi] : ''}</Text>
            </View>
          ))}
        </View>
      </Sheet>
      {i < qs.length && (
        <View style={styles.options}>
          {q.options.map((o) => (
            <OptionKey key={o} label={String(o)} onPress={() => choose(o)} wrong={bad === o} size={64} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  key: { flexDirection: 'row', borderWidth: 1.5, borderColor: '#5A6180' },
  keyCell: { alignItems: 'center', paddingHorizontal: 4, paddingTop: 4, borderLeftWidth: 0.5, borderColor: '#5A6180' },
  keyNum: { fontFamily: font.bold, fontSize: 20, color: SHEET.ink, borderTopWidth: 1, borderColor: '#5A6180', alignSelf: 'stretch', textAlign: 'center', marginTop: 4 },
  eq: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  eqNow: { backgroundColor: '#F1F8E4' },
  op: { fontFamily: font.heavy, fontSize: 24, color: SHEET.ink },
  answer: { fontFamily: font.heavy, fontSize: 22, color: colors.forest, minWidth: 40, borderBottomWidth: 2, borderColor: '#BBB', textAlign: 'center' },
  options: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14 },
});
