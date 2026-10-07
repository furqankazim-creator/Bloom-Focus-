import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, ShapeGlyph, ShapeKind, Sheet, pick, randInt, rng, secondsSince , useSheetTheme , useCheer } from './shared';

const KINDS: ShapeKind[] = ['circle', 'square', 'triangle'];
const COLOURED = ['#C62828', '#1E7D3A', '#1F6FB2', '#E39B1B', '#7B3FA0', '#D63384'];

type Item = { kind: ShapeKind; x: number; y: number; s: number; colour: string };

/** Days 8, 9, 12, 14: count every circle, square and triangle in the busy picture. */
export default function CountShapes({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const sheetTheme = useSheetTheme();
  const items = useMemo<Item[]>(() => {
    const rand = rng(seed);
    const n: number = cfg.shapes ?? 6;
    const apart = !cfg.overlap && n <= 9;
    const out: Item[] = [];
    for (let k = 0; k < n; k++) {
      const kind = KINDS[k % 3 === 0 ? 0 : randInt(0, 2, rand)];
      if (apart) {
        // Apart, on a loose 3×3 grid.
        const cell = k % 9;
        out.push({ kind, x: 18 + (cell % 3) * 32, y: 18 + Math.floor(cell / 3) * 32, s: 22, colour: '#4A5170' });
      } else {
        out.push({ kind, x: randInt(14, 86, rand), y: randInt(14, 86, rand), s: randInt(n > 12 ? 12 : 18, n > 12 ? 30 : 34, rand), colour: cfg.colourful ? pick(COLOURED, rand) : '#4A5170' });
      }
    }
    return out;
  }, [level, seed, cfg.shapes, cfg.overlap, cfg.colourful]);
  const { width } = useWindowDimensions();
  const S = Math.min(width, 520) - 72;
  const k = S / 100;
  const start = useRef(Date.now());
  const [counts, setCounts] = useState<Record<string, number>>({ circle: 0, square: 0, triangle: 0 });
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const truth = (kind: ShapeKind) => items.filter((i) => i.kind === kind).length;

  const check = () => {
    const ok = KINDS.filter((kind) => counts[kind] === truth(kind)).length;
    if (ok === KINDS.length) cheer(true);
    else cheer(false);
    if (ok === KINDS.length) return onDone({ accuracy: Math.max(0.3, 1 - tries * 0.2), activeSec: secondsSince(start.current) });
    setTries((t) => t + 1);
    if (tries >= 2) return onDone({ accuracy: ok / KINDS.length * 0.6, activeSec: secondsSince(start.current) });
    setMsg(`${KINDS.length - ok} count${KINDS.length - ok === 1 ? ' is' : 's are'} not right yet — look again!`);
  };

  return (
    <View>
      <GameBar left={t('How many of each shape?')} right={tries ? `Try ${tries + 1} of 3` : undefined} />
      <Sheet style={{ alignItems: 'center' }}>
        <Svg width={S} height={S}>
          {items.map((it, i) => {
            const c = it.colour;
            const half = (it.s * k) / 2;
            const cx = it.x * k;
            const cy = it.y * k;
            if (it.kind === 'circle') return <Circle key={i} cx={cx} cy={cy} r={half} stroke={c} strokeWidth={2.5} fill="none" />;
            if (it.kind === 'square') return <Rect key={i} x={cx - half} y={cy - half} width={half * 2} height={half * 2} stroke={c} strokeWidth={2.5} fill="none" />;
            return <Polygon key={i} points={`${cx},${cy - half} ${cx + half},${cy + half} ${cx - half},${cy + half}`} stroke={c} strokeWidth={2.5} fill="none" />;
          })}
        </Svg>
        {!!msg && <Text style={styles.msg}>{msg}</Text>}
      </Sheet>
      <View style={styles.counters}>
        {KINDS.map((kind) => (
          <View key={kind} style={styles.counter}>
            <ShapeGlyph kind={kind} size={30} />
            <Pressable onPress={() => setCounts({ ...counts, [kind]: Math.max(0, counts[kind] - 1) })} style={styles.step} accessibilityLabel={`Fewer ${kind}s`}>
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.count}>{counts[kind]}</Text>
            <Pressable onPress={() => setCounts({ ...counts, [kind]: counts[kind] + 1 })} style={styles.step} accessibilityLabel={`More ${kind}s`}>
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <Pressable onPress={check} style={[styles.check, { backgroundColor: sheetTheme.color }]} accessibilityRole="button">
        <Text style={styles.checkText}>{t('Check')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  msg: { fontFamily: font.semibold, fontSize: 14, color: colors.danger, marginTop: 8 },
  counters: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  counter: { alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 16, padding: 10, minWidth: 96 },
  step: { width: 34, height: 30, borderRadius: 10, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: font.bold, fontSize: 18, color: colors.forest },
  count: { fontFamily: font.heavy, fontSize: 22, color: colors.ink },
  check: { height: 54, borderRadius: 18, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  checkText: { fontFamily: font.bold, fontSize: 17, color: colors.white },
});
