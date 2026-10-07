import { t } from '../i18n';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors, font } from '../theme';
import type { Seg } from './patterns';

const same = (a: Seg, b: Seg) =>
  (a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3]) || (a[0] === b[2] && a[1] === b[3] && a[2] === b[0] && a[3] === b[1]);

/** A dot grid drawing (static), used for thumbnails. */
function Drawing({ n, size, segs, color, active, onDot }: { n: number; size: number; segs: Seg[]; color: string; active?: [number, number] | null; onDot?: (x: number, y: number) => void }) {
  const pad = size * 0.12;
  const step = (size - pad * 2) / (n - 1);
  const at = (v: number) => pad + v * step;
  const dots: [number, number][] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) dots.push([x, y]);
  return (
    <View style={[styles.box, { width: size, height: size, borderColor: color + '88' }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        {segs.map(([x1, y1, x2, y2], k) => (
          <Line key={k} x1={at(x1)} y1={at(y1)} x2={at(x2)} y2={at(y2)} stroke={color} strokeWidth={size > 100 ? 4 : 2.5} strokeLinecap="round" />
        ))}
        {dots.map(([x, y]) => {
          const on = active && active[0] === x && active[1] === y;
          return <Circle key={`${x}-${y}`} cx={at(x)} cy={at(y)} r={on ? 8 : size > 100 ? 4.5 : 2.5} fill={on ? color : '#2E3352'} />;
        })}
      </Svg>
      {onDot &&
        dots.map(([x, y]) => (
          <Pressable key={`p${x}-${y}`} onPress={() => onDot(x, y)} accessibilityLabel={`Dot ${x + 1}, ${y + 1}`} style={[styles.hit, { left: at(x) - 18, top: at(y) - 18 }]} />
        ))}
    </View>
  );
}

/** Draw your own dot-grid patterns: tap two dots for a line (tap the same line again to remove it). */
export function PatternEditor({ n, value, onChange, color }: { n: number; value: Seg[][]; onChange: (v: Seg[][]) => void; color: string }) {
  const [segs, setSegs] = useState<Seg[]>([]);
  const [first, setFirst] = useState<[number, number] | null>(null);
  // Only drawings made for this grid size are shown and used.
  const mine = value.filter((p) => p.every((s) => s.every((v) => v < n)));

  const tap = (x: number, y: number) => {
    if (!first) return setFirst([x, y]);
    if (first[0] === x && first[1] === y) return setFirst(null);
    const seg: Seg = [first[0], first[1], x, y];
    setFirst(null);
    setSegs(segs.some((s) => same(s, seg)) ? segs.filter((s) => !same(s, seg)) : [...segs, seg]);
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.row}>
        <Drawing n={n} size={170} segs={segs} color={color} active={first} onDot={tap} />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={styles.help}>{first ? 'Now tap where the line ends.' : 'Tap a dot to start a line.'}</Text>
          <Pressable onPress={() => { if (segs.length) { onChange([...value, segs]); setSegs([]); } }} disabled={!segs.length} style={[styles.btn, { backgroundColor: color }, !segs.length && { opacity: 0.4 }]} accessibilityRole="button">
            <Feather name="plus" size={16} color={colors.white} />
            <Text style={styles.btnText}>{t('Add drawing')}</Text>
          </Pressable>
          <Pressable onPress={() => { setSegs([]); setFirst(null); }} style={[styles.btn, { backgroundColor: colors.sage }]} accessibilityRole="button">
            <Text style={[styles.btnText, { color: colors.forest }]}>{t('Clear')}</Text>
          </Pressable>
        </View>
      </View>
      {mine.length > 0 && (
        <View style={styles.thumbs}>
          {mine.map((p, i) => (
            <View key={i}>
              <Drawing n={n} size={64} segs={p} color={color} />
              <Pressable onPress={() => onChange(value.filter((x) => x !== p))} style={styles.del} hitSlop={6} accessibilityLabel={`Remove drawing ${i + 1}`}>
                <Feather name="x" size={12} color={colors.white} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.help}>{mine.length ? `${mine.length} own drawing${mine.length === 1 ? '' : 's'} — shown first, then built-in ones.` : 'No own drawings yet — the built-in ones are used.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  box: { borderWidth: 2, borderRadius: 14, backgroundColor: '#FFFDF6' },
  hit: { position: 'absolute', width: 36, height: 36, borderRadius: 18 },
  help: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, lineHeight: 18 },
  btn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 14 },
  btnText: { fontFamily: font.semibold, fontSize: 14, color: colors.white },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  del: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
});
