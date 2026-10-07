import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Polygon, Polyline, Text as SvgText } from 'react-native-svg';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, Sheet, pick, rng, secondsSince , useCheer } from './shared';

// Picture outlines in a 100×100 box.
const PICTURES: { name: string; emoji: string; fill: string; pts: [number, number][] }[] = [
  { name: 'a star', emoji: '⭐', fill: '#FFE58A', pts: [[50, 4], [62, 36], [96, 37], [69, 58], [79, 93], [50, 72], [21, 93], [31, 58], [4, 37], [38, 36]] },
  { name: 'a house', emoji: '🏠', fill: '#FFD1B8', pts: [[50, 6], [94, 44], [82, 44], [82, 94], [18, 94], [18, 44], [6, 44]] },
  { name: 'a fish', emoji: '🐟', fill: '#BFE3FF', pts: [[8, 50], [30, 26], [60, 22], [80, 40], [96, 22], [92, 50], [96, 78], [80, 60], [60, 78], [30, 74]] },
  { name: 'a rocket', emoji: '🚀', fill: '#E3D4FF', pts: [[50, 4], [64, 24], [66, 62], [82, 82], [64, 80], [58, 94], [42, 94], [36, 80], [18, 82], [34, 62], [36, 24]] },
  { name: 'a heart', emoji: '💗', fill: '#FFC2D6', pts: [[50, 92], [12, 56], [6, 32], [16, 12], [34, 8], [50, 24], [66, 8], [84, 12], [94, 32], [88, 56]] },
];

/** Evenly spaced points around a closed outline. */
function sample(pts: [number, number][], n: number): [number, number][] {
  const segs = pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as const);
  const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
  const total = lens.reduce((a, b) => a + b, 0);
  const out: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    let d = (k / n) * total;
    let s = 0;
    while (d > lens[s]) d -= lens[s++];
    const [a, b] = segs[s];
    const t = d / lens[s];
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/** Day 3: join the numbered dots in order to reveal the picture. */
export default function DotToDot({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const pic = useMemo(() => PICTURES.find((p) => p.name === `a ${cfg.picture}`) ?? pick(PICTURES, rng(seed)), [seed, cfg.picture]);
  const n: number = cfg.dots ?? 12;
  const dots = useMemo(() => sample(pic.pts, n), [pic, n]);
  const { width } = useWindowDimensions();
  const S = Math.min(width, 520) - 72;
  const at = (p: [number, number]) => [8 + (p[0] / 100) * (S - 16), 8 + (p[1] / 100) * (S - 16)] as const;
  const start = useRef(Date.now());
  const [next, setNext] = useState(1);
  const [wrong, setWrong] = useState(0);
  const done = next > n;

  const release = (x: number, y: number) => {
    if (done) return;
    // The nearest dot to the finger counts, so small dots are still easy to hit.
    let best = -1;
    let bestD = Infinity;
    dots.forEach((p, k) => {
      const [px, py] = at(p);
      const d = Math.hypot(px - x, py - y);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    if (bestD > 30) return;
    if (best === next - 1) {
      const nn = next + 1;
      setNext(nn);
      if (nn > n) setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong / n), activeSec: secondsSince(start.current) }), 1200);
    } else {
      setWrong((w) => w + 1);
      cheer(false);
      cheer(false);
    }
  };

  const joined = dots.slice(0, Math.min(next - 1, n)).map((p) => at(p).join(',')).join(' ');
  return (
    <View>
      <GameBar left={done ? `${t("It’s {{pic}}!", { pic: t(pic.name) })} ${pic.emoji}` : t(`Find number ${next}`)} right={t(`${Math.min(next - 1, n)}/${n}`)} />
      <Sheet style={{ alignItems: 'center' }}>
        <View
          style={{ width: S, height: S }}
          onStartShouldSetResponder={() => true}
          onResponderRelease={(e) => release(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        >
          <Svg width={S} height={S} pointerEvents="none">
            {done && <Polygon points={dots.map((p) => at(p).join(',')).join(' ')} fill={pic.fill} stroke="#4A5170" strokeWidth={2.5} />}
            {!done && next > 2 && <Polyline points={joined} fill="none" stroke="#4A5170" strokeWidth={2.5} />}
            {dots.map((p, k) => {
              const [x, y] = at(p);
              const isNext = k === next - 1;
              return (
                <React.Fragment key={k}>
                  <Circle cx={x} cy={y} r={isNext ? 6 : 3.5} fill={k < next - 1 ? colors.forest : isNext ? '#E53935' : '#4A5170'} />
                  <SvgText x={x + 6} y={y - 5} fontSize={n > 30 ? 9 : 11} fontWeight="bold" fill={isNext ? '#E53935' : '#4A5170'}>
                    {k + 1}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
        {done && <Text style={styles.reveal}>{pic.emoji} {t('You drew {{pic}}!', { pic: t(pic.name) })}</Text>}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  reveal: { fontFamily: font.bold, fontSize: 18, color: colors.forest, marginTop: 10 },
});
