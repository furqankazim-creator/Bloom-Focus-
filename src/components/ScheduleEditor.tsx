import { t } from '../i18n';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DAY_LETTER, DAY_LONG, DAY_PRESETS, WEEK_ORDER, scheduleLabel } from '../engine/schedule';
import { colors, font } from '../theme';

export type Schedule = { days: number[]; times: number };

const TIMES = [1, 2, 3, 5, 7];

/**
 * Choose which days an activity is for (M T W T F S S, or a quick choice), or leave it on
 * "Any days" and pick how many times a week instead.
 */
export function ScheduleEditor({ value, onChange, color = colors.forest, tint = colors.sage }: { value: Schedule; onChange: (s: Schedule) => void; color?: string; tint?: string }) {
  const { days, times } = value;
  const toggle = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    onChange({ days: next, times: next.length || times });
  };
  const same = (a: number[]) => a.length === days.length && a.every((d) => days.includes(d));

  return (
    <View style={{ gap: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {DAY_PRESETS.map((p) => {
          const on = same(p.days);
          return (
            <Pressable key={p.label} onPress={() => onChange({ days: p.days, times: p.days.length || times })} style={[styles.preset, { backgroundColor: on ? color : tint }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[styles.presetText, { color: on ? colors.white : color }]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.week}>
        {WEEK_ORDER.map((d) => {
          const on = days.includes(d);
          return (
            <Pressable key={d} onPress={() => toggle(d)} style={[styles.day, { borderColor: on ? color : colors.border, backgroundColor: on ? color : colors.white }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={DAY_LONG[d]}>
              <Text style={[styles.dayText, { color: on ? colors.white : colors.inkSoft }]}>{DAY_LETTER[d]}</Text>
            </Pressable>
          );
        })}
      </View>
      {days.length === 0 ? (
        <View style={styles.timesRow}>
          <Text style={styles.hint}>{t('Any days ·')}</Text>
          {TIMES.map((t) => (
            <Pressable key={t} onPress={() => onChange({ days, times: t })} style={[styles.time, { backgroundColor: times === t ? color : tint }]} accessibilityRole="button" accessibilityState={{ selected: times === t }}>
              <Text style={[styles.timeText, { color: times === t ? colors.white : color }]}>{t === 7 ? 'Daily' : `${t}×`}</Text>
            </Pressable>
          ))}
          <Text style={styles.hint}>{t('a week')}</Text>
        </View>
      ) : (
        <Text style={[styles.hint, { color }]}>📅 {scheduleLabel(days, days.length)} · shows as “Today” on those days</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  preset: { paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center' },
  presetText: { fontFamily: font.semibold, fontSize: 13 },
  week: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  day: { flex: 1, maxWidth: 46, aspectRatio: 1, borderRadius: 23, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontFamily: font.bold, fontSize: 15 },
  timesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  time: { minWidth: 40, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  timeText: { fontFamily: font.bold, fontSize: 13 },
  hint: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft },
});
