import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, SHEET, Sheet, rng, secondsSince, shuffle , useCheer } from './shared';

const NUM_COLOURS = [SHEET.red, SHEET.green, SHEET.yellow, SHEET.blue, SHEET.purple, SHEET.brown, SHEET.orange, SHEET.grey];
const LETTER_COLOURS = ['#E8418C', '#7BC043', '#2A7FD4', '#F6E21C', '#8C8C8C', '#6B2A12', '#F7A531'];
const SIZE = 250;

type Puzzle = { dots: number[]; code: number[] };

/** Days 3, 6, 14: a chart turns numbers (or letters) into colours; join the dots in code order. */
export default function ColourConnect({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const letters = cfg.labels === 'letters';
  const palette = letters ? LETTER_COLOURS : NUM_COLOURS;
  const labels = letters ? 'ABCDEFG'.split('') : palette.map((_, i) => String(i + 1));
  const puzzles = useMemo<Puzzle[]>(() => {
    const rand = rng(seed);
    const count = cfg.puzzles ?? 3;
    const dotsN = Math.min(palette.length, cfg.dots ?? 6);
    const codeN = Math.min(dotsN, cfg.codeLength ?? 5);
    return Array.from({ length: count }, () => {
      const dots = shuffle(palette.map((_, i) => i), rand).slice(0, dotsN);
      return { dots, code: shuffle(dots, rand).slice(0, codeN) };
    });
  }, [level, seed, cfg.puzzles, cfg.dots, cfg.codeLength, cfg.labels]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = useRef(Date.now());
  const [p, setP] = useState(0);
  const [step, setStep] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<number | null>(null);
  const puzzle = puzzles[p];

  const pos = (k: number, n: number) => {
    const a = -Math.PI / 2 + (k / n) * Math.PI * 2;
    const r = letters ? 98 : 100;
    return { x: SIZE / 2 + Math.cos(a) * r, y: SIZE / 2 + Math.sin(a) * r };
  };

  const tap = (colour: number) => {
    if (colour === puzzle.code[step]) {
      const next = step + 1;
      cheer(true);
      if (next < puzzle.code.length) return setStep(next);
      setTimeout(() => {
        if (p + 1 < puzzles.length) {
          setP(p + 1);
          setStep(0);
        } else {
          const total = puzzles.reduce((t, x) => t + x.code.length, 0);
          onDone({ accuracy: Math.max(0, 1 - wrong / total), activeSec: secondsSince(start.current) });
        }
      }, 650);
      setStep(next);
    } else {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(colour);
      setTimeout(() => setBad(null), 400);
    }
  };

  const n = puzzle.dots.length;
  const at = (colour: number) => pos(puzzle.dots.indexOf(colour), n);

  return (
    <View>
      <GameBar left={t(`Puzzle ${p + 1} of ${puzzles.length}`)} right={step < puzzle.code.length ? `Find ${labels[puzzle.code[step]]}` : 'Well done!'} />
      <Sheet style={{ alignItems: 'center' }}>
        <View style={styles.chart}>
          {palette.map((c, i) => (
            <View key={i} style={styles.chartCell}>
              <Text style={styles.chartLabel}>{labels[i]}</Text>
              <View style={[styles.chartSwatch, { backgroundColor: c, borderRadius: letters ? 12 : 3 }]} />
            </View>
          ))}
        </View>
        <View style={{ width: SIZE, height: SIZE, marginTop: 14 }}>
          <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill} pointerEvents="none">
            {letters ? (
              <Polygon points={puzzle.dots.map((_, k) => `${pos(k, n).x},${pos(k, n).y}`).join(' ')} stroke="#4A5170" strokeWidth={1.5} fill="none" />
            ) : (
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={118} stroke="#CFCFCF" strokeWidth={1.5} fill="none" />
            )}
            {puzzle.code.slice(0, step).map((c, i) =>
              i === 0 ? null : <Line key={i} x1={at(puzzle.code[i - 1]).x} y1={at(puzzle.code[i - 1]).y} x2={at(c).x} y2={at(c).y} stroke="#4A5170" strokeWidth={3} />,
            )}
          </Svg>
          {puzzle.dots.map((c, k) => {
            const { x, y } = pos(k, n);
            const used = puzzle.code.slice(0, step).includes(c);
            return (
              <Pressable
                key={c}
                onPress={() => tap(c)}
                accessibilityLabel={`Colour ${labels[c]}`}
                style={[styles.dot, { left: x - 22, top: y - 22 }, used && styles.dotUsed, bad === c && styles.dotBad]}
              >
                <View style={[styles.dotInner, { backgroundColor: palette[c] }]} />
              </Pressable>
            );
          })}
        </View>
        <View style={styles.codeBox}>
          {puzzle.code.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Text style={styles.codeDash}>-</Text>}
              <Text style={[styles.codeText, i < step && styles.codeDone, i === step && styles.codeNow]}>{labels[c]}</Text>
            </React.Fragment>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', borderWidth: 1.5, borderColor: '#4A5170', borderRadius: 10, overflow: 'hidden' },
  chartCell: { width: 34, alignItems: 'center', borderLeftWidth: 1, borderColor: '#4A5170', paddingVertical: 4, gap: 4 },
  chartLabel: { fontFamily: font.bold, fontSize: 15, color: SHEET.ink },
  chartSwatch: { width: 24, height: 24 },
  dot: { position: 'absolute', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 26, height: 26, borderRadius: 13 },
  dotUsed: { backgroundColor: '#E6ECE2' },
  dotBad: { backgroundColor: '#F6C9BD' },
  codeBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#4A5170', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 6, marginTop: 14 },
  codeText: { fontFamily: font.bold, fontSize: 20, color: SHEET.ink, minWidth: 16, textAlign: 'center' },
  codeDash: { fontFamily: font.bold, fontSize: 20, color: SHEET.ink, marginHorizontal: 4 },
  codeDone: { color: '#9AA79F', textDecorationLine: 'line-through' },
  codeNow: { color: colors.forest, textDecorationLine: 'underline' },
});
