import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { dateLocale, t } from '../i18n';
import {
  PLAN_WEEKS,
  nextMonday,
  suggestMonth,
  thisMonday,
  weekDates,
  weekIndex,
  weekPracticeDays,
  type MonthPlan,
  type PlanWeek,
} from '../engine/monthPlan';
import { TRAIN_BY_ID, TRAIN_IDS, type TrainTaskId } from '../engine/trainTasks';
import type { Child, Session } from '../types';
import { colors, font } from '../theme';
import { Button } from './ui';

const MAX_GAMES = 3;
const fmt = (d: Date) => d.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });

/** The therapist's 4-week plan for one child: a goal and up to 3 focus games per week. */
export function MonthPlanEditor({ child, sessions, onSave }: { child: Child; sessions: Session[]; onSave: (plan: MonthPlan | undefined) => void }) {
  const [draft, setDraft] = useState<MonthPlan | null>(child.monthPlan ?? null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  useEffect(() => {
    setDraft(child.monthPlan ?? null);
    setOpenWeek(null);
  }, [child.id, child.monthPlan]);

  const saved = JSON.stringify(draft) === JSON.stringify(child.monthPlan ?? null);
  const now = weekIndex(draft ?? { start: thisMonday(), weeks: [], createdAt: '' });

  if (!draft) {
    return (
      <View style={styles.intro}>
        <Text style={styles.introEmoji}>🗓️</Text>
        <Text style={styles.introTitle}>{t('Plan the next 4 weeks')}</Text>
        <Text style={styles.introBody}>
          {t('One goal and a few activities for each week. The running week’s activities lead {{name}}’s daily training, and the family sees “Week 2 of 4”.', { name: child.name.split(' ')[0] })}
        </Text>
        <Button
          label="Suggest a 4-week plan"
          icon="zap"
          onPress={() => {
            setDraft({ start: nextMonday(), weeks: suggestMonth(sessions, child.id), createdAt: new Date().toISOString() });
            setOpenWeek(0);
          }}
          style={{ marginTop: 14, alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  const setWeek = (i: number, patch: Partial<PlanWeek>) =>
    setDraft({ ...draft, weeks: draft.weeks.map((w, j) => (j === i ? { ...w, ...patch } : w)) });
  const toggleGame = (i: number, id: TrainTaskId) => {
    const games = draft.weeks[i].games;
    if (games.includes(id)) setWeek(i, { games: games.filter((g) => g !== id) });
    else if (games.length < MAX_GAMES) setWeek(i, { games: [...games, id] });
  };

  const starts = [
    { value: thisMonday(), label: t('This week') },
    { value: nextMonday(new Date(Date.now() + 86400000)), label: t('Next Monday') },
  ];

  return (
    <View>
      <Text style={styles.label}>{t('Starts')}</Text>
      <View style={styles.row}>
        {starts.map((s) => {
          const on = draft.start === s.value;
          return (
            <Pressable key={s.value} onPress={() => setDraft({ ...draft, start: s.value })} style={[styles.chip, on && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
              <Text style={[styles.chipText, on && { color: colors.white }]}>
                {s.label} · {fmt(new Date(s.value + 'T00:00'))}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {draft.weeks.slice(0, PLAN_WEEKS).map((w, i) => {
        const { from, to } = weekDates(draft, i);
        const status = i < now ? 'done' : i === now ? 'now' : 'next';
        const days = status === 'next' ? null : weekPracticeDays(draft, i, sessions, child.id);
        const open = openWeek === i;
        return (
          <View key={i} style={[styles.week, status === 'now' && styles.weekNow]}>
            <Pressable onPress={() => setOpenWeek(open ? null : i)} style={styles.weekHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
              <View style={[styles.weekNum, status === 'now' && { backgroundColor: colors.forest }, status === 'done' && { backgroundColor: colors.mint }]}>
                {status === 'done' ? <Feather name="check" size={16} color={colors.forest} /> : <Text style={[styles.weekNumText, status === 'now' && { color: colors.white }]}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.weekTitle}>
                  {t('Week {{n}}', { n: i + 1 })} · {fmt(from)} – {fmt(to)}
                  {status === 'now' ? `  · ${t('Now')}` : ''}
                </Text>
                <Text style={styles.weekGoal} numberOfLines={open ? undefined : 1}>
                  {w.goal || t('No goal yet')}
                </Text>
                <Text style={styles.weekGames}>
                  {w.games.map((g) => `${TRAIN_BY_ID[g].icon} ${t(TRAIN_BY_ID[g].title)}`).join('  ·  ') || t('No activities picked')}
                  {days !== null ? `  ·  ${t('{{n}} of 7 days practised', { n: days })}` : ''}
                </Text>
              </View>
              <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkMuted} />
            </Pressable>
            {open && (
              <View style={styles.weekBody}>
                <Text style={styles.label}>{t('Goal for the week')}</Text>
                <TextInput
                  value={w.goal}
                  onChangeText={(v) => setWeek(i, { goal: v })}
                  placeholder={t('e.g. Stay with one activity for 2 minutes')}
                  placeholderTextColor={colors.inkMuted}
                  style={styles.input}
                  multiline
                />
                <Text style={styles.label}>{t('Activities (up to 3)')}</Text>
                <View style={styles.wrap}>
                  {TRAIN_IDS.map((id) => {
                    const on = w.games.includes(id);
                    const g = TRAIN_BY_ID[id];
                    return (
                      <Pressable key={id} onPress={() => toggleGame(i, id)} style={[styles.game, on && styles.gameOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                        <Text style={styles.gameEmoji}>{g.icon}</Text>
                        <Text style={[styles.gameText, on && { color: colors.white }]}>{t(g.title)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        );
      })}

      <View style={[styles.row, { marginTop: 14 }]}>
        <Button label={saved ? 'Saved ✓' : 'Save 4-week plan'} icon="check" disabled={saved} onPress={() => onSave(draft)} style={{ flex: 1 }} />
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <Button
          label="New suggestion"
          icon="refresh-cw"
          variant="soft"
          onPress={() => setDraft({ ...draft, weeks: suggestMonth(sessions, child.id) })}
          style={{ flex: 1 }}
        />
        <Button
          label="Remove plan"
          icon="trash-2"
          variant="danger"
          onPress={() => {
            setDraft(null);
            onSave(undefined);
          }}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { marginTop: 16, padding: 20, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  introEmoji: { fontSize: 40 },
  introTitle: { fontFamily: font.bold, fontSize: 19, color: colors.ink, marginTop: 6 },
  introBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.inkSoft, textAlign: 'center', marginTop: 6 },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: 19, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  week: { marginTop: 12, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  weekNow: { borderColor: colors.forest, borderWidth: 2 },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  weekNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  weekNumText: { fontFamily: font.bold, fontSize: 15, color: colors.forest },
  weekTitle: { fontFamily: font.semibold, fontSize: 12.5, color: colors.inkSoft },
  weekGoal: { fontFamily: font.bold, fontSize: 15.5, color: colors.ink, marginTop: 2 },
  weekGames: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, marginTop: 4 },
  weekBody: { paddingHorizontal: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.border },
  input: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.soft, paddingHorizontal: 12, paddingVertical: 10, fontFamily: font.medium, fontSize: 15, color: colors.ink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  game: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 36, borderRadius: 18, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border },
  gameOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  gameEmoji: { fontSize: 16 },
  gameText: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
});
