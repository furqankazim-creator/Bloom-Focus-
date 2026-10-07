import { t } from '../../i18n';
import React, { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import { GameBar, LibraryGameProps, OptionKey, SHEET, Sheet, randInt, rng, secondsSince , useCheer } from './shared';

const sign = (a: number, b: number) => (a < b ? '<' : a > b ? '>' : '=');

/** Days 8 & 9: put <, > or = between each pair of numbers in the row. */
export default function CompareNumbers({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const rows = useMemo(() => {
    const rand = rng(seed);
    const len: number = cfg.length ?? 5;
    const max: number = cfg.max ?? 9;
    return Array.from({ length: cfg.rows ?? 4 }, () => {
      const nums = [randInt(1, max, rand)];
      // Some equal neighbours so "=" is needed too.
      for (let k = 1; k < len; k++) nums.push(rand() < 0.15 ? nums[k - 1] : randInt(1, max, rand));
      return nums;
    });
  }, [level, seed, cfg.length, cfg.max, cfg.rows]);
  const start = useRef(Date.now());
  const [r, setR] = useState(0);
  const [k, setK] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [bad, setBad] = useState<string | null>(null);
  const total = rows.reduce((t, row) => t + row.length - 1, 0);

  const choose = (s: string) => {
    const row = rows[r];
    if (s !== sign(row[k], row[k + 1])) {
      setWrong((w) => w + 1);
      cheer(false);
      setBad(s);
      return setTimeout(() => setBad(null), 400);
    }
    cheer(true);
    if (k + 1 < row.length - 1) return setK(k + 1);
    if (r + 1 < rows.length) {
      setR(r + 1);
      return setK(0);
    }
    setK(row.length);
    setTimeout(() => onDone({ accuracy: Math.max(0, 1 - wrong / total), activeSec: secondsSince(start.current) }), 500);
  };

  return (
    <View>
      <GameBar left={t(`Row ${r + 1} of ${rows.length}`)} right={t('The mouth eats the bigger number')} />
      <Sheet>
        <View style={styles.example}>
          <Text style={styles.exText}>2</Text><Box s="<" /><Text style={styles.exText}>5</Text><Box s="<" /><Text style={styles.exText}>7</Text><Box s="=" /><Text style={styles.exText}>7</Text><Box s=">" /><Text style={styles.exText}>3</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ gap: 14 }}>
            {rows.map((row, ri) => (
              <View key={ri} style={styles.row}>
                {row.map((n, ni) => (
                  <React.Fragment key={ni}>
                    <Text style={styles.num}>{n}</Text>
                    {ni < row.length - 1 && <Box s={ri < r || (ri === r && ni < k) ? sign(n, row[ni + 1]) : ''} now={ri === r && ni === k} />}
                  </React.Fragment>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </Sheet>
      <View style={styles.keys}>
        {['<', '=', '>'].map((s) => (
          <OptionKey key={s} label={s} onPress={() => choose(s)} wrong={bad === s} size={72}>
            <Text style={styles.keyText}>{s}</Text>
          </OptionKey>
        ))}
      </View>
    </View>
  );
}

function Box({ s, now }: { s: string; now?: boolean }) {
  return (
    <View style={[styles.box, now && styles.boxNow]}>
      <Text style={styles.boxText}>{s}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  example: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16, opacity: 0.75 },
  exText: { fontFamily: font.semibold, fontSize: 16, color: SHEET.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  num: { fontFamily: font.bold, fontSize: 20, color: SHEET.ink, minWidth: 18, textAlign: 'center' },
  box: { width: 30, height: 30, borderWidth: 1.5, borderColor: '#4A5170', alignItems: 'center', justifyContent: 'center' },
  boxNow: { backgroundColor: colors.lime, borderColor: colors.forest, borderWidth: 2 },
  boxText: { fontFamily: font.bold, fontSize: 18, color: colors.forest },
  keys: { flexDirection: 'row', gap: 14, justifyContent: 'center', marginTop: 14 },
  keyText: { fontFamily: font.heavy, fontSize: 30, color: SHEET.ink },
});
