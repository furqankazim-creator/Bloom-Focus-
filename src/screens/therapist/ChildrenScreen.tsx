import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar, IconButton, Screen, flipIcon } from '../../components/ui';
import { Sparkline } from '../../components/insightCharts';
import { STATUS, childPulse, type ChildPulse } from '../../engine/childStatus';
import { FEELING_EMOJI } from '../../engine/clinic';
import { currentWeek } from '../../engine/monthPlan';
import { DOMAIN_LABEL } from '../../engine/tasks';
import { t } from '../../i18n';
import { useStore } from '../../store/useStore';
import { useVisibleChildren } from '../../store/useTeam';
import { colors, font } from '../../theme';
import type { Child } from '../../types';
import { childStats } from '../helpers';

type Filter = 'all' | 'today' | 'nudge' | 'plan';
type Sort = 'attention' | 'name' | 'accuracy';


/** The therapist's caseload: who practised, who needs a nudge, and quick actions per child. */
export default function ChildrenScreen() {
  const nav = useNavigation();
  const children = useVisibleChildren();
  const sessions = useStore((s) => s.sessions);
  const checkIns = useStore((s) => s.kidCheckIns);
  const notes = useStore((s) => s.notes);
  const gapDays = useStore((s) => s.settings.alertGapDays);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('attention');

  const rows = useMemo(
    () =>
      children.map((c) => ({
        child: c,
        pulse: childPulse(sessions, c.id, gapDays),
        stats: childStats(c, sessions),
        mood: [...checkIns].reverse().find((k) => k.childId === c.id)?.feeling,
        week: currentWeek(c.monthPlan),
        unread: notes.filter((n) => n.childId === c.id && n.from !== 'therapist' && !n.readAt).length,
      })),
    [children, sessions, checkIns, notes, gapDays],
  );

  const counts = {
    today: rows.filter((r) => r.pulse.status === 'today').length,
    nudge: rows.filter((r) => r.pulse.status === 'gap' || r.pulse.status === 'never').length,
    plan: rows.filter((r) => r.week).length,
  };
  const accs = rows.map((r) => r.pulse.recent).filter((v): v is number => v !== null);
  const avg = accs.length ? Math.round((accs.reduce((a, b) => a + b, 0) / accs.length) * 100) : null;

  const rank = { gap: 0, never: 1, recent: 2, today: 3 } as const;
  const shown = rows
    .filter((r) => r.child.name.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((r) => (filter === 'today' ? r.pulse.status === 'today' : filter === 'nudge' ? r.pulse.status === 'gap' || r.pulse.status === 'never' : filter === 'plan' ? !!r.week : true))
    .sort((a, b) =>
      sort === 'name'
        ? a.child.name.localeCompare(b.child.name)
        : sort === 'accuracy'
          ? (a.pulse.recent ?? 2) - (b.pulse.recent ?? 2)
          : rank[a.pulse.status] - rank[b.pulse.status] || (b.pulse.daysSince ?? 99) - (a.pulse.daysSince ?? 99),
    );

  const FILTERS: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: t('All'), n: rows.length },
    { id: 'today', label: t('Practised today'), n: counts.today },
    { id: 'nudge', label: t('Needs a nudge'), n: counts.nudge },
    { id: 'plan', label: t('4-week plan'), n: counts.plan },
  ];
  const SORTS: { id: Sort; label: string }[] = [
    { id: 'attention', label: t('Needs attention first') },
    { id: 'name', label: t('Name') },
    { id: 'accuracy', label: t('Lowest accuracy') },
  ];

  return (
    <Screen>
      <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>{t('Your practice space')}</Text>
          <View style={[styles.row, { gap: 10 }]}>
            <Text style={styles.title}>{t('Children')}</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{rows.length}</Text>
            </View>
          </View>
        </View>
        <IconButton icon="user-plus" label="Add child" size={54} bg={colors.forest} color={colors.white} onPress={() => nav.navigate('EditChild', {})} />
      </View>

      <View style={styles.summary}>
        <Summary value={`${counts.today}/${rows.length}`} label={t('Practised today')} color="#2E9E6B" icon="check-circle" onPress={() => setFilter('today')} />
        <Summary value={String(counts.nudge)} label={t('Needs a nudge')} color={counts.nudge ? '#C2412D' : colors.inkSoft} icon="bell" onPress={() => setFilter('nudge')} />
        <Summary value={avg === null ? '—' : `${avg}%`} label={t('Avg accuracy')} color={colors.forest} icon="target" />
      </View>

      <View style={styles.search}>
        <Feather name="search" size={18} color={colors.inkSoft} />
        <TextInput value={q} onChangeText={setQ} placeholder={t('Find a profile')} placeholderTextColor={colors.inkMuted} style={styles.searchInput} />
        {!!q && (
          <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel={t('Clear')}>
            <Feather name="x-circle" size={18} color={colors.inkMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        {FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[styles.chipText, on && { color: colors.white }]}>{f.label}</Text>
              <View style={[styles.chipCount, on && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={[styles.chipCountText, on && { color: colors.white }]}>{f.n}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={[styles.row, { gap: 6, marginTop: 10, flexWrap: 'wrap' }]}>
        <Feather name="bar-chart" size={13} color={colors.inkMuted} />
        {SORTS.map((s) => (
          <Pressable key={s.id} onPress={() => setSort(s.id)} hitSlop={6} accessibilityRole="radio" accessibilityState={{ selected: sort === s.id }}>
            <Text style={[styles.sort, sort === s.id && styles.sortOn]}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 14, marginTop: 14 }}>
        {shown.map((r) => (
          <ChildCard
            key={r.child.id}
            child={r.child}
            pulse={r.pulse}
            level={r.stats.level}
            count={r.stats.count}
            mood={r.mood}
            planWeek={r.week ? r.week.index + 1 : null}
            unread={r.unread}
            onOpen={() => nav.navigate('ChildProfile', { childId: r.child.id })}
            onStart={() => nav.navigate('ClinicSession', { childId: r.child.id })}
            onPlan={() => nav.navigate('Tabs', { screen: 'Plan', params: { childId: r.child.id } })}
            onMessage={() => nav.navigate('Tabs', { screen: 'Notes', params: { childId: r.child.id } })}
          />
        ))}
        {shown.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 34 }}>{rows.length ? '🔍' : '🌱'}</Text>
            <Text style={styles.emptyTitle}>{rows.length ? t('No profiles match') : t('No children yet')}</Text>
            <Text style={styles.emptyBody}>{rows.length ? t('Try another name or filter.') : t('Add your first child to get started.')}</Text>
            {!rows.length && (
              <Pressable onPress={() => nav.navigate('EditChild', {})} style={styles.emptyBtn} accessibilityRole="button">
                <Feather name="user-plus" size={16} color={colors.white} />
                <Text style={styles.emptyBtnText}>{t('Add child')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

function Summary({ value, label, color, icon, onPress }: { value: string; label: string; color: string; icon: React.ComponentProps<typeof Feather>['name']; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.sumCard, pressed && { opacity: 0.85 }]}>
      <Feather name={icon} size={16} color={color} />
      <Text style={[styles.sumValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.sumLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function ChildCard({
  child,
  pulse,
  level,
  count,
  mood,
  planWeek,
  unread,
  onOpen,
  onStart,
  onPlan,
  onMessage,
}: {
  child: Child;
  pulse: ChildPulse;
  level: number;
  count: number;
  mood?: keyof typeof FEELING_EMOJI;
  planWeek: number | null;
  unread: number;
  onOpen: () => void;
  onStart: () => void;
  onPlan: () => void;
  onMessage: () => void;
}) {
  const s = STATUS[pulse.status];
  const when = pulse.daysSince === null ? '' : pulse.daysSince === 1 ? t('Yesterday') : t('{{n}} days ago', { n: pulse.daysSince });
  const todayIdx = (new Date().getDay() + 6) % 7;
  const badges = [
    planWeek ? `🗓️ ${t('Week {{n}} of 4', { n: planWeek })}` : '',
    pulse.streak > 1 ? `🔥 ${t('{{n}}-day streak', { n: pulse.streak })}` : '',
    mood ? `${FEELING_EMOJI[mood]} ${t(mood[0].toUpperCase() + mood.slice(1))}` : '',
  ].filter(Boolean);
  return (
    <View style={styles.card}>
      <View style={[styles.cardBand, { backgroundColor: child.color }]} />
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel={child.name}>
        <View style={[styles.row, { gap: 14 }]}>
          <View style={[styles.avatarRing, { borderColor: s.color }]}>
            <Avatar name={child.name} color={child.color} photo={child.photo} emoji={child.avatarEmoji} size={56} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{child.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {t('{{n}} years', { n: child.age })} · {t(DOMAIN_LABEL[child.focus])}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: s.color }]} />
              <Text style={[styles.statusText, { color: s.color }]}>
                {pulse.status === 'today' || pulse.status === 'never' ? t(s.label) : `${when} · ${t(s.label)}`}
              </Text>
            </View>
          </View>
          <Feather name={flipIcon('chevron-right')} size={20} color={colors.inkMuted} />
        </View>

        {badges.length > 0 && (
          <View style={styles.badges}>
            {badges.map((b) => (
              <View key={b} style={styles.badge}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.metrics}>
          <Metric value={pulse.recent === null ? '—' : `${Math.round(pulse.recent * 100)}%`} label={t('Accuracy')} delta={pulse.trend} />
          <Metric value={String(level)} label={t('Level')} />
          <Metric value={String(count)} label={t('Sessions')} />
          <Sparkline values={pulse.spark} max={1} width={70} height={30} color={colors.forest} />
        </View>

        <View style={[styles.row, { gap: 4, marginTop: 12 }]}>
          {[t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')].map((d, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={[styles.weekBar, pulse.weekDays.includes(i) && { backgroundColor: colors.leaf }, i === todayIdx && styles.weekToday, i > todayIdx && { opacity: 0.45 }]} />
              <Text style={[styles.weekLabel, i === todayIdx && { color: colors.forest, fontFamily: font.bold }]} numberOfLines={1}>
                {d}
              </Text>
            </View>
          ))}
        </View>
      </Pressable>

      <View style={styles.footer}>
        <Pressable onPress={onStart} style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Feather name="play" size={16} color={colors.onPastel} />
          <Text style={styles.startText}>{t('Start session')}</Text>
        </Pressable>
        <Pressable onPress={onPlan} style={styles.footBtn} accessibilityRole="button" accessibilityLabel={t('Activity plan')}>
          <Feather name="layers" size={17} color={colors.forest} />
        </Pressable>
        <Pressable onPress={onMessage} style={styles.footBtn} accessibilityRole="button" accessibilityLabel={t('Messages')}>
          <Feather name="message-circle" size={17} color={colors.forest} />
          {unread > 0 && (
            <View style={styles.unread}>
              <Text style={styles.unreadText}>{unread}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Metric({ value, label, delta }: { value: string; label: string; delta?: number | null }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.row, { gap: 4 }]}>
        <Text style={styles.metricValue}>{value}</Text>
        {!!delta && (
          <Text style={[styles.delta, { color: delta > 0 ? '#2E9E6B' : colors.danger }]}>
            {delta > 0 ? '▲' : '▼'}
            {Math.abs(delta)}
          </Text>
        )}
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: { fontFamily: font.semibold, fontSize: 11.5, letterSpacing: 1.2, color: colors.inkMuted, textTransform: 'uppercase' },
  title: { fontFamily: font.heavy, fontSize: 32, color: colors.ink, letterSpacing: -0.8 },
  countPill: { minWidth: 32, height: 28, paddingHorizontal: 9, borderRadius: 14, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  countPillText: { fontFamily: font.bold, fontSize: 14, color: '#213D31' },

  summary: { flexDirection: 'row', gap: 10, marginTop: 18 },
  sumCard: { flex: 1, minWidth: 0, padding: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 4 },
  sumValue: { fontFamily: font.heavy, fontSize: 22, letterSpacing: -0.4 },
  sumLabel: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkSoft },

  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, marginTop: 16 },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 15.5, color: colors.ink },

  chipScroll: { marginTop: 12, marginHorizontal: -20 },
  chipRow: { gap: 8, paddingHorizontal: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  chipCount: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  chipCountText: { fontFamily: font.bold, fontSize: 11, color: colors.forest },
  sort: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkMuted, paddingHorizontal: 4 },
  sortOn: { color: colors.forest, fontFamily: font.bold, textDecorationLine: 'underline' },

  card: { borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  cardBand: { height: 6, opacity: 0.9 },
  cardMain: { padding: 16, paddingBottom: 12 },
  avatarRing: { padding: 2.5, borderRadius: 34, borderWidth: 2.5 },
  name: { fontFamily: font.heavy, fontSize: 18.5, color: colors.ink, letterSpacing: -0.3 },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, marginTop: 1 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, marginTop: 7 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: font.bold, fontSize: 11.5 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.soft },
  badgeText: { fontFamily: font.semibold, fontSize: 12, color: colors.ink },
  metrics: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  metricValue: { fontFamily: font.heavy, fontSize: 18, color: colors.ink },
  metricLabel: { fontFamily: font.medium, fontSize: 11, color: colors.inkMuted, marginTop: 1 },
  delta: { fontFamily: font.bold, fontSize: 11 },
  weekBar: { width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.border },
  weekToday: { borderWidth: 1, borderColor: colors.forest },
  weekLabel: { fontFamily: font.medium, fontSize: 9.5, color: colors.inkMuted },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  startBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startText: { fontFamily: font.bold, fontSize: 14.5, color: colors.onPastel },
  footBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  unread: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card },
  unreadText: { fontFamily: font.bold, fontSize: 9.5, color: colors.white },

  empty: { alignItems: 'center', padding: 28, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  emptyTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink, marginTop: 6 },
  emptyBody: { fontFamily: font.regular, fontSize: 13.5, color: colors.inkSoft, marginTop: 4, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 18, height: 42, borderRadius: 14, backgroundColor: colors.forest },
  emptyBtnText: { fontFamily: font.bold, fontSize: 14, color: colors.white },
});
