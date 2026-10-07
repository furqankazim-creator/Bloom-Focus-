import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { lightColors as colors, font } from '../../theme';
import { DoneButton, GameBar, LibraryGameProps, SHEET, Sheet, rng, secondsSince, shuffle, useSheetTheme , useCheer } from './shared';

const LOOKALIKE = ['□', '■', '△', '▲', '▽', '▼', '○', '●', '◎', '◇', '◆', '☆', '★', '※', '#', '×', '*', '@', '♪', '〒'];
const ANIMALS = ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐢', '🐙', '🦋', '🐞'];
const FRUIT = ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥕', '🌽', '🥦', '🍄'];
const SYMBOLS = ['□', '☆', '◎', '■', '○', '@', '▼', '*', '◇', '△', '※', '#', '▲', '×', '〒', '▽', '♪', '◆', '★', '●'];
const COUNT = [6, 12, 20];
const ROW = 50;

/** Day 3: join each symbol on the left to the same symbol on the right. */
export default function SymbolMatch({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const { left, right } = useMemo(() => {
    const rand = rng(seed);
    const n = cfg.count ?? COUNT[level - 1] ?? 6;
    // Look-alikes stay together (□ ■, △ ▲ ▽ ▼, ○ ● ◎) so the child must look closely.
    const pool = cfg.theme === 'animals' ? ANIMALS : cfg.theme === 'fruit' ? FRUIT : cfg.theme === 'lookalike' ? LOOKALIKE : SYMBOLS;
    const set = cfg.theme === 'lookalike' ? pool.slice(0, n) : shuffle(pool, rand).slice(0, n);
    return { left: shuffle(set, rand), right: shuffle(set, rand) };
  }, [level, seed, cfg.count, cfg.theme]);
  const theme = useSheetTheme();
  const start = useRef(Date.now());
  const [width, setWidth] = useState(300);
  const [sel, setSel] = useState<{ side: 'l' | 'r'; i: number } | null>(null);
  const [pairs, setPairs] = useState<[number, number][]>([]);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  const done = (l: number) => pairs.some((p) => p[0] === l);
  const doneR = (r: number) => pairs.some((p) => p[1] === r);

  const tap = (side: 'l' | 'r', i: number) => {
    if ((side === 'l' && done(i)) || (side === 'r' && doneR(i))) return;
    if (!sel || sel.side === side) return setSel({ side, i });
    const l = side === 'l' ? i : sel.i;
    const r = side === 'r' ? i : sel.i;
    setSel(null);
    if (left[l] === right[r]) {
      const next = [...pairs, [l, r] as [number, number]];
      setPairs(next);
      cheer(true);
      if (next.length === left.length) setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong * 0.08), activeSec: secondsSince(start.current) }), 600);
    } else {
      setWrong((w) => w + 1);
      cheer(false);
      setFlash(`${l}-${r}`);
      setTimeout(() => setFlash(null), 450);
    }
  };

  const x1 = 80;
  const x2 = width - 80;
  const y = (i: number) => i * ROW + ROW / 2;

  return (
    <View>
      <GameBar left={t(`${pairs.length}/${left.length} joined`)} right={sel ? 'Now tap its match' : 'Tap a symbol'} />
      <Sheet>
        <View style={{ height: left.length * ROW }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <Svg width={width} height={left.length * ROW} style={StyleSheet.absoluteFill} pointerEvents="none">
            {pairs.map(([l, r]) => (
              <Line key={`${l}-${r}`} x1={x1} y1={y(l)} x2={x2} y2={y(r)} stroke={theme.color} strokeWidth={3} strokeLinecap="round" />
            ))}
          </Svg>
          {left.map((s, i) => (
            <Item key={`l${i}`} symbol={s} top={i * ROW} side="l" on={sel?.side === 'l' && sel.i === i} done={done(i)} bad={!!flash && flash.startsWith(`${i}-`) && sel === null} onPress={() => tap('l', i)} />
          ))}
          {right.map((s, i) => (
            <Item key={`r${i}`} symbol={s} top={i * ROW} side="r" on={sel?.side === 'r' && sel.i === i} done={doneR(i)} bad={!!flash && flash.endsWith(`-${i}`)} onPress={() => tap('r', i)} />
          ))}
        </View>
      </Sheet>
      <DoneButton label={t(`Finish (${pairs.length}/${left.length})`)} onPress={() => onDone({ accuracy: Math.max(0, pairs.length / left.length - wrong * 0.05), activeSec: secondsSince(start.current) })} />
    </View>
  );
}

function Item({ symbol, top, side, on, done, bad, onPress }: { symbol: string; top: number; side: 'l' | 'r'; on: boolean; done: boolean; bad: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Symbol ${symbol}`}
      style={[styles.item, { top }, side === 'l' ? { left: 0, flexDirection: 'row' } : { right: 0, flexDirection: 'row-reverse' }, on && styles.on, bad && styles.bad, done && { opacity: 0.55 }]}
    >
      <Text style={styles.sym}>{symbol}</Text>
      <View style={styles.dot} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute', height: ROW - 4, width: 76, alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 10 },
  on: { backgroundColor: colors.lime },
  bad: { backgroundColor: '#F6C9BD' },
  sym: { fontFamily: font.bold, fontSize: 32, color: SHEET.ink, width: 40, textAlign: 'center' },
  dot: { width: 6, height: 6, backgroundColor: SHEET.ink },
});
