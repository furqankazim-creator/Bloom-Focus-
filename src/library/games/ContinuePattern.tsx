import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, OptionKey, SHEET, Sheet, pick, rng, secondsSince, shuffle , useCheer } from './shared';

const MARKS = ['○', '+', '•', '/', '\\', '×', '—', '|'];
const SHOWN = 6;
const COLS = 10;

/** Days 5 & 6: carry on each row's repeating pattern of marks. */
export default function ContinuePattern({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const rows = useMemo(() => {
    const rand = rng(seed);
    const period: number = cfg.period ?? level + 1;
    return Array.from({ length: cfg.rows ?? 4 }, () => {
      const unit = Array.from({ length: period }, () => pick(MARKS, rand));
      // Make sure the unit isn't all one mark.
      if (new Set(unit).size === 1) unit[period - 1] = shuffle(MARKS.filter((m) => m !== unit[0]), rand)[0];
      return Array.from({ length: COLS }, (_, k) => unit[k % period]);
    });
  }, [level, seed, cfg.period, cfg.rows]);
  const { width } = useWindowDimensions();
  const cell = Math.min(34, Math.floor((Math.min(width, 520) - 64) / COLS));
  const start = useRef(Date.now());
  const [r, setR] = useState(0);
  const [c, setC] = useState(SHOWN);
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<string | null>(null);
  const total = rows.length * (COLS - SHOWN);

  const choose = (m: string) => {
    if (m !== rows[r][c]) {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(m);
      return setTimeout(() => setBad(null), 400);
    }
    cheer(true);
    if (c + 1 < COLS) return setC(c + 1);
    if (r + 1 < rows.length) {
      setR(r + 1);
      return setC(SHOWN);
    }
    setC(COLS);
    setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong / total), activeSec: secondsSince(start.current) }), 500);
  };

  return (
    <View>
      <GameBar left={t(`Row ${r + 1} of ${rows.length}`)} right={t('What comes next?')} />
      <Sheet style={{ alignItems: 'center', gap: 10 }}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((m, ci) => {
              const shown = ci < SHOWN || ri < r || (ri === r && ci < c);
              const now = ri === r && ci === c;
              return (
                <View key={ci} style={[styles.cell, { width: cell, height: cell }, now && styles.now]}>
                  <Text style={[styles.mark, { fontSize: cell * 0.62 }, ci >= SHOWN && { color: colors.forest }]}>{shown ? m : ''}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </Sheet>
      <View style={styles.keys}>
        {[...new Set(rows[r])].concat(MARKS.filter((m) => !rows[r].includes(m)).slice(0, 2)).sort().map((m) => (
          <OptionKey key={m} label={m} onPress={() => choose(m)} wrong={bad === m} size={54}>
            <Text style={styles.keyMark}>{m}</Text>
          </OptionKey>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderLeftWidth: 1, borderTopWidth: 1, borderColor: '#4A5170' },
  cell: { borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#4A5170', alignItems: 'center', justifyContent: 'center' },
  now: { backgroundColor: colors.lime },
  mark: { fontFamily: font.bold, color: SHEET.ink },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 },
  keyMark: { fontFamily: font.bold, fontSize: 24, color: SHEET.ink },
});
