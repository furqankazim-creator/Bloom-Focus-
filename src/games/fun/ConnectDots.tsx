import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { playSound } from '../../services/sounds';
import { lightColors as colors, font } from '../../theme';
import { DOT_COLORS, DOT_LEVELS, levelDots } from './dotsLevels';
import type { FunGameProps } from './shared';

type Paths = Record<string, number[]>;

/** Drag from a dot to its matching colour. Lines can't cross — drawing over a line cuts it. */
export default function ConnectDots({ onWin }: FunGameProps) {
  const { width } = useWindowDimensions();
  const [levelIndex, setLevelIndex] = useState(0);
  const level = DOT_LEVELS[levelIndex];
  const n = level.size;
  const board = Math.min(width - 48, 360);
  const cell = board / n;
  const dots = useMemo(() => levelDots(level), [level]);
  const [paths, setPaths] = useState<Paths>({});
  const [won, setWon] = useState(false);
  // Refs so the gesture handler always sees the latest values.
  const live = useRef({ paths: {} as Paths, active: null as string | null, cell, dots, n, won: false, levelIndex, onWin });
  live.current = { ...live.current, cell, dots, n, won, levelIndex, onWin };

  const dotColorAt = (i: number) => Object.keys(live.current.dots).find((c) => live.current.dots[c].includes(i));
  const connected = (p: Paths, c: string) => {
    const path = p[c];
    const [a, b] = live.current.dots[c];
    return !!path && path.length >= 2 && ((path[0] === a && path[path.length - 1] === b) || (path[0] === b && path[path.length - 1] === a));
  };
  const commit = (next: Paths) => {
    live.current.paths = next;
    setPaths(next);
  };
  const cellAt = (x: number, y: number) => {
    const { cell: c, n: size } = live.current;
    const col = Math.floor(x / c);
    const row = Math.floor(y / c);
    return row < 0 || col < 0 || row >= size || col >= size ? -1 : row * size + col;
  };
  const adjacent = (a: number, b: number) => {
    const size = live.current.n;
    return Math.abs(Math.floor(a / size) - Math.floor(b / size)) + Math.abs((a % size) - (b % size)) === 1;
  };

  const start = (x: number, y: number) => {
    if (live.current.won) return;
    const i = cellAt(x, y);
    if (i < 0) return;
    const p = { ...live.current.paths };
    const dot = dotColorAt(i);
    if (dot) {
      p[dot] = [i];
      live.current.active = dot;
      commit(p);
      return;
    }
    // Pick up an existing line at this cell and keep drawing from there.
    const owner = Object.keys(p).find((c) => p[c].includes(i));
    if (owner && !connected(p, owner)) {
      p[owner] = p[owner].slice(0, p[owner].indexOf(i) + 1);
      live.current.active = owner;
      commit(p);
    }
  };

  const move = (x: number, y: number) => {
    const c = live.current.active;
    if (!c) return;
    const i = cellAt(x, y);
    const p = { ...live.current.paths };
    const path = p[c] ?? [];
    const last = path[path.length - 1];
    if (i < 0 || i === last || connected(p, c)) return;
    // Backtracking one step.
    if (path.length >= 2 && i === path[path.length - 2]) {
      p[c] = path.slice(0, -1);
      return commit(p);
    }
    if (!adjacent(i, last) || path.includes(i)) return;
    const dot = dotColorAt(i);
    if (dot && dot !== c) return;
    // Drawing over another line cuts it.
    for (const other of Object.keys(p)) {
      if (other !== c && p[other].includes(i)) p[other] = p[other].slice(0, p[other].indexOf(i));
    }
    p[c] = [...path, i];
    commit(p);
    if (dot === c) {
      playSound('chime');
      live.current.active = null;
      if (Object.keys(live.current.dots).every((k) => connected(p, k))) {
        setWon(true);
        // Between puzzles the "Next puzzle" button shows inline; the big celebration is for the last one.
        if (live.current.levelIndex + 1 >= DOT_LEVELS.length) live.current.onWin('You solved every puzzle! 🧩');
      }
    }
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => start(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e) => move(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderRelease: () => {
        live.current.active = null;
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const center = (i: number) => [(i % n) * cell + cell / 2, Math.floor(i / n) * cell + cell / 2];
  const done = Object.keys(dots).filter((c) => connected(paths, c)).length;

  return (
    <View style={{ alignItems: 'center', paddingTop: 8 }}>
      <View style={styles.bar}>
        <Text style={styles.barText}>
          Puzzle {levelIndex + 1}/{DOT_LEVELS.length}
        </Text>
        <Text style={styles.barText}>
          🔗 {done}/{Object.keys(dots).length}
        </Text>
      </View>
      <View style={[styles.board, { width: board, height: board }]} {...responder.panHandlers}>
        <Svg width={board} height={board} pointerEvents="none">
          {Array.from({ length: n * n }).map((_, i) => {
            const owner = Object.keys(paths).find((c) => paths[c].includes(i));
            return owner ? (
              <Circle key={`bg${i}`} cx={center(i)[0]} cy={center(i)[1]} r={cell * 0.42} fill={DOT_COLORS[owner]} opacity={0.14} />
            ) : null;
          })}
          {Object.entries(paths).map(([c, path]) =>
            path.length > 1 ? (
              <Polyline
                key={c}
                points={path.map((i) => center(i).join(',')).join(' ')}
                fill="none"
                stroke={DOT_COLORS[c]}
                strokeWidth={cell * 0.34}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null,
          )}
          {Object.entries(dots).flatMap(([c, ends]) =>
            ends.map((i) => <Circle key={`${c}${i}`} cx={center(i)[0]} cy={center(i)[1]} r={cell * 0.3} fill={DOT_COLORS[c]} stroke="#FFFFFF" strokeWidth={3} />),
          )}
        </Svg>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: n - 1 }).map((_, k) => (
            <View key={`v${k}`} style={[styles.lineV, { left: (k + 1) * cell }]} />
          ))}
          {Array.from({ length: n - 1 }).map((_, k) => (
            <View key={`h${k}`} style={[styles.lineH, { top: (k + 1) * cell }]} />
          ))}
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            commit({});
            setWon(false);
          }}
          style={styles.btn}
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>{t('↺ Clear')}</Text>
        </Pressable>
        {won && levelIndex + 1 < DOT_LEVELS.length && (
          <Pressable
            onPress={() => {
              commit({});
              setWon(false);
              setLevelIndex((l) => l + 1);
            }}
            style={[styles.btn, styles.btnPrimary]}
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, { color: colors.white }]}>{t('Next puzzle →')}</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.hint}>{won && levelIndex + 1 < DOT_LEVELS.length ? '🎉 All connected! Tap “Next puzzle”.' : 'Drag from a dot to the dot of the same colour.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  barText: { fontFamily: font.bold, fontSize: 15, color: colors.ink, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)', overflow: 'hidden' },
  // userSelect: dragging on web must not select text.
  board: { borderRadius: 22, backgroundColor: '#24345C', overflow: 'hidden', userSelect: 'none' } as object,
  lineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  lineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { paddingHorizontal: 18, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.forest },
  btnText: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  hint: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, marginTop: 12 },
});
