import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, SHEET, Sheet, pick, rng, secondsSince, shuffle , useCheer } from './shared';

const RAINBOW = ['#E53935', '#F28C28', '#F6CF1C', '#3FA34D', '#3AA8E0', '#1E5FB4', '#6A2C91'];
const EXTRA = ['#F4A6C8', '#9E9E9E', '#222222', '#8B5A2B'];

/** Day 3: colour each band in the order of the dots underneath (first dot = outside band). */
export default function Rainbow({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const bands: number = cfg.bands ?? 4;
  const repeats = !!cfg.repeats;
  const rainbows = useMemo(() => {
    const rand = rng(seed);
    const count: number = cfg.rainbows ?? 2;
    return Array.from({ length: count }, (_, k) => {
      if (k === 0 && !repeats) return RAINBOW.slice(0, bands).reverse();
      const pool = repeats ? [...RAINBOW, ...EXTRA] : RAINBOW;
      const few = shuffle(pool, rand).slice(0, repeats ? 3 : bands);
      return Array.from({ length: bands }, (_, i) => (repeats ? pick(few, rand) : few[i % few.length]));
    });
  }, [level, seed, bands, repeats, cfg.rainbows]);
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520) - 72;
  const H = W / 2 + 6;
  const start = useRef(Date.now());
  const [r, setR] = useState(0);
  const [fill, setFill] = useState<(string | null)[]>(Array(bands).fill(null));
  const [paint, setPaint] = useState<string | null>(null);
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<number | null>(null);
  const order = rainbows[r];
  const palette = [...new Set(order)];

  const tapBand = (k: number) => {
    if (!paint || fill[k]) return;
    if (paint !== order[k]) {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(k);
      return setTimeout(() => setBad(null), 400);
    }
    const next = fill.map((f, i) => (i === k ? paint : f));
    setFill(next);
    cheer(true);
    if (next.every(Boolean)) {
      setTimeout(() => {
        if (r + 1 < rainbows.length) {
          setR(r + 1);
          setFill(Array(bands).fill(null));
          setPaint(null);
        } else onDone({ accuracy: Math.max(0, 1 - wrong / (bands * rainbows.length)), activeSec: secondsSince(start.current) });
      }, 600);
    }
  };

  const cx = W / 2;
  const cy = H - 2;
  const outer = W / 2 - 4;
  const inner = outer * 0.38;
  const w = (outer - inner) / bands;
  const arc = (k: number) => {
    const ro = outer - k * w;
    const ri = ro - w;
    return `M ${cx - ro} ${cy} A ${ro} ${ro} 0 0 1 ${cx + ro} ${cy} L ${cx + ri} ${cy} A ${ri} ${ri} 0 0 0 ${cx - ri} ${cy} Z`;
  };

  return (
    <View>
      <GameBar left={t(`Rainbow ${r + 1} of ${rainbows.length}`)} right={paint ? 'Now tap its band' : 'Pick a colour'} />
      <Sheet style={{ alignItems: 'center' }}>
        <View
          style={{ width: W, height: H }}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(e) => {
            // Which band did the finger land on? Measure the distance from the rainbow's centre.
            const { locationX: x, locationY: y } = e.nativeEvent;
            const d = Math.hypot(x - cx, y - cy);
            if (y > cy + 4 || d > outer || d < inner) return;
            tapBand(Math.min(bands - 1, Math.floor((outer - d) / w)));
          }}
          accessibilityLabel="Rainbow bands"
        >
          <Svg width={W} height={H} pointerEvents="none">
            {order.map((_, k) => (
              <Path key={k} d={arc(k)} fill={bad === k ? '#F6C9BD' : fill[k] ?? '#FFFFFF'} stroke="#4A5170" strokeWidth={1.5} />
            ))}
          </Svg>
        </View>
        <View style={styles.dots}>
          {order.map((c, k) => (
            <View key={k} style={[styles.dot, { backgroundColor: c }, fill[k] && { opacity: 0.35 }]} />
          ))}
        </View>
      </Sheet>
      <View style={styles.palette}>
        {palette.map((c) => (
          <Pressable key={c} onPress={() => setPaint(c)} style={[styles.paint, paint === c && styles.paintOn]} accessibilityLabel="Colour">
            <View style={[styles.swatch, { backgroundColor: c }]} />
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>{t('The first dot is the outside band.')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: '#5A6180' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 14 },
  paint: { padding: 5, borderRadius: 26, borderWidth: 3, borderColor: 'transparent' },
  paintOn: { borderColor: colors.forest },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#5A6180' },
  hint: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, textAlign: 'center', marginTop: 8 },
});
