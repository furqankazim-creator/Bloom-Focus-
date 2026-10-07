import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { colors, font } from '../theme';

/** A ring that fills to `score` (0–100), with the number in the middle. */
export function ScoreRing({ score, size = 96, color = colors.forest, track = '#E9EEE6', label, sub }: { score: number; size?: number; color?: string; track?: string; label?: string; sub?: string }) {
  const stroke = Math.max(6, size * 0.1);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, score));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`ring-${color}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.7" />
            <Stop offset="1" stopColor={color} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#ring-${color})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(c * v) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.ringValue, { fontSize: size * 0.28, color }]}>{Math.round(v)}</Text>
      {!!label && <Text style={[styles.ringLabel, { fontSize: Math.max(9, size * 0.1) }]}>{label}</Text>}
      {!!sub && <Text style={styles.ringSub}>{sub}</Text>}
    </View>
  );
}

const useWidth = (initial = 300) => {
  const [w, setW] = useState(initial);
  return [w, (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)] as const;
};

/** Several accuracy lines (0–1) over the same buckets, with an 85% "level-up" line. */
export function MultiLineChart({ series, labels, height = 180 }: { series: { name: string; color: string; points: (number | null)[] }[]; labels: string[]; height?: number }) {
  const [w, onLayout] = useWidth();
  const padL = 30;
  const padB = 22;
  const n = labels.length;
  const x = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (w - padL - 8));
  const y = (v: number) => 8 + (1 - v) * (height - padB - 8);
  const paths = series.map((s) => {
    let d = '';
    s.points.forEach((p, i) => {
      if (p === null) return;
      const prev = i > 0 ? s.points[i - 1] : null;
      d += `${d && prev !== null ? 'L' : 'M'}${x(i)},${y(p)} `;
    });
    return d.trim();
  });
  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={height}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <G key={t}>
            <Line x1={padL} x2={w} y1={y(t)} y2={y(t)} stroke="#ECEBE4" strokeWidth={1} />
            <SvgText x={padL - 6} y={y(t) + 4} fontSize={10} fill={colors.inkMuted} textAnchor="end">{`${t * 100}`}</SvgText>
          </G>
        ))}
        <Line x1={padL} x2={w} y1={y(0.85)} y2={y(0.85)} stroke={colors.leaf} strokeWidth={1.5} strokeDasharray="5 4" />
        <SvgText x={w - 4} y={y(0.85) - 4} fontSize={9.5} fill={colors.forest} textAnchor="end">
          Level-up 85%
        </SvgText>
        {series.map((s, k) => (
          <G key={s.name}>
            <Path d={paths[k]} stroke={s.color} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {s.points.map((p, i) => (p === null ? null : <Circle key={i} cx={x(i)} cy={y(p)} r={3.5} fill="#fff" stroke={s.color} strokeWidth={2} />))}
          </G>
        ))}
        {labels.map((l, i) =>
          n > 8 && i % 2 ? null : (
            <SvgText key={i} x={x(i)} y={height - 6} fontSize={10} fill={colors.inkMuted} textAnchor="middle">
              {l}
            </SvgText>
          ),
        )}
      </Svg>
      {series.length > 1 && (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.name} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>{s.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** A radar ("spider") chart of skills: filled = now, dashed = the period before. */
export function RadarChart({ axes, size = 260, color = colors.forest }: { axes: { label: string; now: number | null; prev: number | null }[]; size?: number; color?: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 42;
  const n = axes.length;
  const at = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v] as const;
  };
  const poly = (key: 'now' | 'prev') => axes.map((ax, i) => at(i, ax[key] ?? 0).join(',')).join(' ');
  return (
    <Svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <Polygon key={t} points={axes.map((_, i) => at(i, t).join(',')).join(' ')} fill={t === 1 ? '#FAFBF7' : 'none'} stroke="#E3E6DD" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x2, y2] = at(i, 1);
        return <Line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="#E3E6DD" strokeWidth={1} />;
      })}
      {axes.some((a) => a.prev !== null) && <Polygon points={poly('prev')} fill="none" stroke={colors.inkMuted} strokeWidth={1.5} strokeDasharray="4 4" />}
      <Polygon points={poly('now')} fill={color + '33'} stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      {axes.map((ax, i) => {
        const [x, y] = at(i, ax.now ?? 0);
        return ax.now === null ? null : <Circle key={`d${i}`} cx={x} cy={y} r={3.5} fill={color} />;
      })}
      {axes.map((ax, i) => {
        const [x, y] = at(i, 1.22);
        const short = ax.label.replace('attention', 'att.').replace('Following instructions', 'Instructions').replace('Cognitive flexibility', 'Flexibility');
        return (
          <SvgText key={`l${i}`} x={x} y={y + 4} fontSize={10.5} fontWeight="bold" fill={colors.inkSoft} textAnchor="middle">
            {short}
          </SvgText>
        );
      })}
    </Svg>
  );
}

/** Five weeks of practice as a GitHub-style heat map (Mon–Sun columns). */
export function HeatCalendar({ days, color = colors.forest }: { days: { date: string; minutes: number }[]; color?: string }) {
  const max = Math.max(1, ...days.map((d) => d.minutes));
  // Pad the start so each row begins on a Monday.
  const firstDay = (new Date(days[0].date).getDay() + 6) % 7;
  const cells: ({ date: string; minutes: number } | null)[] = [...Array(firstDay).fill(null), ...days];
  const rows = Array.from({ length: Math.ceil(cells.length / 7) }, (_, r) => cells.slice(r * 7, r * 7 + 7));
  const todayKey = new Date().toDateString();
  return (
    <View style={{ gap: 5 }}>
      <View style={styles.calRow}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} style={styles.calHead}>
            {d}
          </Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={styles.calRow}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = row[i];
            if (!d) return <View key={i} style={[styles.calCell, { backgroundColor: 'transparent' }]} />;
            const t = d.minutes / max;
            const isToday = new Date(d.date).toDateString() === todayKey;
            return (
              <View key={i} style={[styles.calCell, { backgroundColor: d.minutes ? color : colors.soft, opacity: d.minutes ? 0.3 + 0.7 * t : 1 }, isToday && styles.calToday]}>
                <Text style={[styles.calNum, d.minutes ? { color: colors.white } : null]}>{new Date(d.date).getDate()}</Text>
              </View>
            );
          })}
        </View>
      ))}
      <View style={[styles.calRow, { justifyContent: 'flex-end', gap: 4, marginTop: 2 }]}>
        <Text style={styles.legendText}>Less</Text>
        {[0, 0.35, 0.6, 1].map((o) => (
          <View key={o} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: o ? color : colors.soft, opacity: o ? 0.3 + 0.7 * o : 1 }} />
        ))}
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
}

/** A tiny line for a card: values 0–max. */
export function Sparkline({ values, max = 5, color = colors.forest, width = 90, height = 30 }: { values: number[]; max?: number; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return <View style={{ width, height }} />;
  const x = (i: number) => (i / (values.length - 1)) * (width - 6) + 3;
  const y = (v: number) => height - 3 - (v / max) * (height - 6);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={3.5} fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  ringValue: { fontFamily: font.heavy, letterSpacing: -1 },
  ringLabel: { fontFamily: font.bold, color: colors.inkSoft, marginTop: -2, letterSpacing: 0.5 },
  ringSub: { fontFamily: font.medium, fontSize: 10, color: colors.inkMuted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkSoft },
  calRow: { flexDirection: 'row', gap: 5 },
  calHead: { flex: 1, textAlign: 'center', fontFamily: font.bold, fontSize: 10.5, color: colors.inkMuted },
  calCell: { flex: 1, aspectRatio: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  calToday: { borderWidth: 2, borderColor: colors.ink },
  calNum: { fontFamily: font.semibold, fontSize: 10, color: colors.inkMuted },
});
