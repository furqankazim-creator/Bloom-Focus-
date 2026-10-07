import { useVisibleChildren } from '../../store/useTeam';
import { t } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { HeatCalendar, MultiLineChart, RadarChart, ScoreRing, Sparkline } from '../../components/insightCharts';
import { Avatar, Screen, T, flipIcon } from '../../components/ui';
import { buildInsights, RANGE_LABEL, type AlertTone, type ChildRow, type Range } from '../../engine/insights';
import { LIBRARY_ART } from '../../library/art';
import { printHtml } from '../../library/print';
import { therapistLabel } from '../../store/seed';
import { insightReportHtml } from '../../services/insightReport';
import { useStore } from '../../store/useStore';
import { colors, font } from '../../theme';
import { firstName, relativeDay } from '../helpers';

/** Strong line colours per child (the avatar pastels are too light for charts). */
const LINE = ['#2A7FD4', '#E2604F', '#E0A11B', '#2E9E6B', '#7A5AE0', '#D63C7E'];
const TONE: Record<AlertTone, { bg: string; dot: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  red: { bg: colors.blush, dot: '#D9473A', icon: 'alert-circle' },
  amber: { bg: colors.warm, dot: '#D99A1B', icon: 'alert-triangle' },
  green: { bg: colors.mint, dot: '#2E9E6B', icon: 'trending-up' },
};
const FEEL: Record<string, string> = { happy: '😊', calm: '😌', excited: '🤩', tired: '😴', worried: '😟', grumpy: '😠' };
type Sort = 'practice' | 'accuracy' | 'trend' | 'bloom';

/**
 * Insights: who needs attention, what is improving, and how practice, mood, home plans and
 * clinic goals are going — for a time range, for all children or one.
 */
export default function InsightsScreen() {
  const nav = useNavigation<any>();
  const { sessions, libraryPlays, kidCheckIns, clinicVisits, settings } = useStore();
  const children = useVisibleChildren();
  const rules = { gapDays: settings.alertGapDays, dropPct: settings.alertDropPct };
  const [range, setRange] = useState<Range>('month');
  const [childId, setChildId] = useState<string | null>(null);
  const [allAlerts, setAllAlerts] = useState(false);
  const [allDecisions, setAllDecisions] = useState(false);
  const [sort, setSort] = useState<Sort>('bloom');
  // Highlight cards: sized so whole cards fit the row (no card cut off), with page dots below.
  const [rowW, setRowW] = useState(0);
  const [page, setPage] = useState(0);
  const strip = useRef<ScrollView>(null);

  const data = { children, sessions, libraryPlays, checkIns: kidCheckIns, visits: clinicVisits };
  const ins = useMemo(() => buildInsights(data, range, childId, new Date(), rules), [children, sessions, libraryPlays, kidCheckIns, clinicVisits, range, childId, settings.alertGapDays, settings.alertDropPct]); // eslint-disable-line react-hooks/exhaustive-deps
  const colorOf = (id: string) => LINE[Math.max(0, children.findIndex((c) => c.id === id)) % LINE.length];
  const one = childId ? ins.rows[0] : null;
  const bloom = one ? one.bloom.score : Math.round(ins.rows.reduce((t, r) => t + r.bloom.score, 0) / Math.max(1, ins.rows.length));
  const bloomLabel = bloom >= 75 ? 'Blooming 🌸' : bloom >= 50 ? 'Growing 🌿' : 'Needs care 🌱';
  const accDelta = ins.kpis.accuracy !== null && ins.kpis.prevAccuracy !== null ? ins.kpis.accuracy - ins.kpis.prevAccuracy : null;
  const alerts = allAlerts ? ins.alerts : ins.alerts.slice(0, 5);
  const decisions = allDecisions ? ins.decisions : ins.decisions.slice(0, 4);
  const sorted = [...ins.rows].sort((a, b) =>
    sort === 'practice' ? b.practiceDays - a.practiceDays : sort === 'accuracy' ? (b.accuracy ?? -1) - (a.accuracy ?? -1) : sort === 'trend' ? (b.trend ?? -9) - (a.trend ?? -9) : b.bloom.score - a.bloom.score,
  );

  // A colour report for one child, built from that child's own numbers.
  const report = (row: ChildRow) => void printHtml(insightReportHtml(row, buildInsights(data, range, row.child.id, new Date(), rules), range, therapistLabel(row.child), undefined, { clinic: settings.clinicName, signoff: settings.reportSignoff }));

  return (
    <Screen>
      <T.Eyebrow>{t('Small signals, steady growth')}</T.Eyebrow>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <T.Display>{t('Insights')}</T.Display>
        {one && (
          <Pressable onPress={() => report(one)} style={styles.reportBtn} accessibilityRole="button">
            <Feather name="file-text" size={16} color={colors.white} />
            <Text style={styles.reportText}>{t('Report')}</Text>
          </Pressable>
        )}
      </View>

      {/* Range + child filter: every section below follows these. */}
      <View style={styles.segment}>
        {(['week', 'month', 'quarter'] as Range[]).map((r) => (
          <Pressable key={r} onPress={() => setRange(r)} style={[styles.segBtn, range === r && styles.segOn]} accessibilityRole="tab" accessibilityState={{ selected: range === r }}>
            <Text style={[styles.segText, range === r && { color: colors.ink }]}>{t(RANGE_LABEL[r])}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kids}>
        <Pressable onPress={() => setChildId(null)} style={[styles.kid, !childId && styles.kidOn]} accessibilityRole="button" accessibilityState={{ selected: !childId }}>
          <Feather name="users" size={15} color={!childId ? colors.white : colors.forest} />
          <Text style={[styles.kidText, !childId && { color: colors.white }]}>{t('All children')}</Text>
        </Pressable>
        {children.map((c) => {
          const on = childId === c.id;
          return (
            <Pressable key={c.id} onPress={() => setChildId(c.id)} style={[styles.kid, on && { backgroundColor: colorOf(c.id), borderColor: colorOf(c.id) }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Avatar name={c.name} color={c.color} photo={c.photo} emoji={c.avatarEmoji} size={24} />
              <Text style={[styles.kidText, on && { color: colors.white }]}>{firstName(c.name)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Hero: Bloom score + key numbers */}
      <LinearGradient colors={[colors.forestDeep, '#2F6B4F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.row, { gap: 16 }]}>
          <View style={styles.ringWrap}>
            <ScoreRing score={bloom} size={104} color={colors.lime} track="rgba(255,255,255,0.15)" label="BLOOM" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>
              {one ? firstName(one.child.name).toUpperCase() : t('ALL CHILDREN')} · {t(RANGE_LABEL[range]).toUpperCase()}
            </Text>
            <Text style={styles.heroTitle}>{bloomLabel}</Text>
            <Text style={styles.heroSub}>{t('Accuracy, keeping to the home plan and mood, in one friendly score.')}</Text>
          </View>
        </View>
        <View style={styles.kpis}>
          <Kpi value={String(ins.kpis.sessions)} label="Sessions" />
          <Kpi value={ins.kpis.minutes >= 60 ? `${(ins.kpis.minutes / 60).toFixed(ins.kpis.minutes >= 600 ? 0 : 1)}h` : `${ins.kpis.minutes}m`} label="Focus time" />
          <Kpi value={ins.kpis.accuracy === null ? '—' : `${Math.round(ins.kpis.accuracy * 100)}%`} label="Accuracy" delta={accDelta} />
          <Kpi value={String(ins.kpis.practiceDays)} label="Days" />
        </View>
      </LinearGradient>

      {/* Highlights — swipeable "story" cards */}
      {ins.highlights.length > 0 && (
        <>
          <SectionTitle title="Highlights" sub="This period’s wins · tap a card to see that child" />
          <View onLayout={(e) => setRowW(e.nativeEvent.layout.width)}>
          {(() => {
            const GAP = 12;
            const perView = rowW >= 900 ? 5 : rowW >= 680 ? 4 : rowW >= 480 ? 3 : 2;
            const cardW = rowW ? Math.floor((rowW - GAP * (perView - 1)) / perView) : 160;
            const pages = Math.max(1, Math.ceil(ins.highlights.length / perView));
            const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / ((cardW + GAP) * perView)));
            return (
              <>
          <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: GAP }} snapToInterval={(cardW + GAP) * perView} snapToAlignment="start" decelerationRate="fast" onScroll={onScroll} scrollEventThrottle={32} pagingEnabled={false}>
            {ins.highlights.map((h) => (
              <Pressable key={h.id} onPress={() => h.childId && setChildId(h.childId)} accessibilityRole="button" accessibilityLabel={`${h.title}: ${h.value}, ${h.detail}`}>
                <LinearGradient colors={h.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.story, { width: cardW }]}>
                  <View style={styles.storyBubble} />
                  <Text style={styles.storyEmoji}>{h.emoji}</Text>
                  <Text style={styles.storyTitle}>{h.title}</Text>
                  <Text style={[styles.storyValue, h.value.length > 9 && { fontSize: 19 }]} numberOfLines={2}>
                    {h.value}
                  </Text>
                  <Text style={styles.storyDetail} numberOfLines={2}>
                    {h.detail}
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
          {pages > 1 && (() => {
            const cur = Math.min(page, pages - 1);
            // Buttons and dots work with a mouse too (on a computer you can't swipe).
            const go = (i: number) => {
              const to = Math.max(0, Math.min(pages - 1, i));
              setPage(to);
              strip.current?.scrollTo({ x: to * (cardW + GAP) * perView, animated: true });
            };
            return (
              <View style={styles.dots}>
                {Array.from({ length: pages }, (_, i) => (
                  <Pressable key={i} onPress={() => go(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Highlights page ${i + 1}`}>
                    <View style={[styles.pageDot, i === cur && styles.pageDotOn]} />
                  </Pressable>
                ))}
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => go(cur - 1)} disabled={cur === 0} style={[styles.arrowBtn, cur === 0 && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="Previous highlights">
                  <Feather name={flipIcon('chevron-left')} size={18} color={colors.forest} />
                </Pressable>
                <Pressable onPress={() => go(cur + 1)} disabled={cur === pages - 1} style={[styles.arrowBtn, cur === pages - 1 && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="More highlights">
                  <Feather name={flipIcon('chevron-right')} size={18} color={colors.forest} />
                </Pressable>
              </View>
            );
          })()}
              </>
            );
          })()}
          </View>
        </>
      )}

      {/* Needs attention */}
      <SectionTitle
        title="Needs attention"
        sub={ins.alerts.length ? `${ins.alerts.filter((a) => a.tone !== 'green').length} to check · ${ins.alerts.filter((a) => a.tone === 'green').length} wins` : 'All calm'}
      />
      <View style={{ gap: 8 }}>
        {alerts.length === 0 && <Empty text="Nothing needs attention right now. 🌿" />}
        {alerts.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => nav.navigate(a.tone === 'green' ? 'ChildProfile' : 'ClinicSession', { childId: a.childId })}
            style={({ pressed }) => [styles.alert, { backgroundColor: TONE[a.tone].bg }, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <Feather name={TONE[a.tone].icon} size={18} color={TONE[a.tone].dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{a.title}</Text>
              <Text style={styles.alertDetail}>{a.detail}</Text>
            </View>
            <Feather name={flipIcon('chevron-right')} size={16} color={colors.inkMuted} />
          </Pressable>
        ))}
        {ins.alerts.length > 5 && (
          <Pressable onPress={() => setAllAlerts(!allAlerts)} style={styles.more} accessibilityRole="button">
            <Text style={styles.moreText}>{allAlerts ? 'Show less' : `Show all ${ins.alerts.length}`}</Text>
          </Pressable>
        )}
      </View>

      {/* Accuracy over time */}
      <SectionTitle title="Accuracy over time" sub={childId ? 'Dashed line = level-up point' : 'One line per child · dashed = level-up point'} />
      <View style={styles.card}>
        {ins.series.some((s) => s.points.some((p) => p !== null)) ? (
          <MultiLineChart series={ins.series.map((s) => ({ name: s.name, color: colorOf(s.childId), points: s.points }))} labels={ins.bucketLabels} />
        ) : (
          <Empty text="No scored games in this period yet." />
        )}
      </View>

      {/* Skill map */}
      <SectionTitle title="Skill map" sub="Filled = now · dashed = the period before" />
      <View style={[styles.card, { alignItems: 'center' }]}>
        <RadarChart axes={ins.skills.map((s) => ({ label: s.label, now: s.now, prev: s.prev }))} color={childId ? colorOf(childId) : colors.forest} />
        <View style={{ alignSelf: 'stretch', gap: 6, marginTop: 4 }}>
          {ins.skills
            .filter((s) => s.now !== null)
            .sort((a, b) => (b.now ?? 0) - (a.now ?? 0))
            .map((s) => {
              const d = s.now !== null && s.prev !== null ? s.now - s.prev : null;
              return (
                <View key={s.domain} style={styles.skillRow}>
                  <Text style={styles.skillName}>{s.label}</Text>
                  <View style={styles.skillTrack}>
                    <View style={[styles.skillFill, { width: `${Math.round((s.now ?? 0) * 100)}%`, backgroundColor: childId ? colorOf(childId) : colors.forest }]} />
                  </View>
                  <Text style={styles.skillPct}>{Math.round((s.now ?? 0) * 100)}%</Text>
                  <Text style={[styles.delta, d !== null && d <= -0.03 ? { color: colors.danger } : { color: '#2E9E6B' }]}>
                    {d === null ? 'new' : d >= 0.03 ? `▲${Math.round(d * 100)}` : d <= -0.03 ? `▼${Math.round(-d * 100)}` : '●'}
                  </Text>
                </View>
              );
            })}
        </View>
      </View>

      {/* Practice calendar */}
      <SectionTitle title="Practice calendar" sub="Last 5 weeks · darker = more minutes" />
      <View style={styles.card}>
        <HeatCalendar days={ins.calendar} color={childId ? colorOf(childId) : colors.forest} />
      </View>

      {/* Home plan follow-through */}
      <SectionTitle title="Home plan follow-through" sub={`Days practised vs planned · ${RANGE_LABEL[range].toLowerCase()}`} />
      <View style={[styles.card, { gap: 12 }]}>
        {ins.rows.map((r) => {
          const share = r.done / r.planned;
          return (
            <View key={r.child.id} style={{ gap: 6 }}>
              <View style={[styles.row, { gap: 8 }]}>
                <Avatar name={r.child.name} color={r.child.color} photo={r.child.photo} emoji={r.child.avatarEmoji} size={26} />
                <Text style={[styles.rowName, { flex: 1 }]}>{firstName(r.child.name)}</Text>
                <Text style={styles.rowValue}>
                  {r.done} / {r.planned} days
                </Text>
              </View>
              <View style={styles.followTrack}>
                <View style={[styles.followFill, { width: `${Math.min(100, share * 100)}%`, backgroundColor: share >= 0.8 ? '#2E9E6B' : share >= 0.5 ? '#E0A11B' : '#E2604F' }]} />
              </View>
            </View>
          );
        })}
      </View>

      {/* Mood */}
      <SectionTitle title="Feelings before playing" sub={ins.mood.total ? `${ins.mood.total} check-ins · ${ins.mood.low} low` : 'No check-ins yet'} />
      <View style={styles.card}>
        <View style={styles.moodRow}>
          {ins.mood.counts.map((m) => {
            const max = Math.max(1, ...ins.mood.counts.map((x) => x.count));
            return (
              <View key={m.feeling} style={styles.moodCol}>
                <Text style={styles.moodCount}>{m.count || ''}</Text>
                <View style={[styles.moodBar, { height: 8 + (m.count / max) * 70, backgroundColor: ['tired', 'worried', 'grumpy'].includes(m.feeling) ? '#F6C9B4' : '#BFE3C4' }]} />
                <Text style={{ fontSize: 22 }}>{FEEL[m.feeling]}</Text>
              </View>
            );
          })}
        </View>
        {ins.mood.lowDay && <Text style={styles.insightLine}>💡 Low moods happen most on {ins.mood.lowDay}. A shorter session that day may help.</Text>}
      </View>

      {/* Skill Builders */}
      {ins.builders.length > 0 && (
        <>
          <SectionTitle title="Skill Builders" sub="Worksheet activities played or done at home" />
          <View style={[styles.card, { gap: 10 }]}>
            {ins.builders.slice(0, 6).map((b) => (
              <View key={b.family} style={[styles.row, { gap: 10 }]}>
                <Image source={LIBRARY_ART[b.family]} style={{ width: 30, height: 30 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{b.name}</Text>
                  <Text style={styles.rowSub}>
                    {b.plays} go{b.plays === 1 ? '' : 'es'}
                    {b.hard ? ` · 😓 ${b.hard} hard` : ''}
                  </Text>
                </View>
                <Text style={styles.stars}>{b.stars === null ? '' : '⭐'.repeat(Math.max(1, Math.round(b.stars)))}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Clinic */}
      {(ins.clinic.length > 0 || ins.tags.length > 0) && (
        <>
          <SectionTitle title="Clinic sessions" sub="Your ratings over visits, and goals" />
          <View style={[styles.card, { gap: 12 }]}>
            {ins.clinic.map((c) => (
              <View key={c.childId} style={[styles.row, { gap: 10 }]}>
                <Text style={[styles.rowName, { width: 64 }]}>{c.name}</Text>
                <Sparkline values={c.ratings.map((r) => r.value)} color={colorOf(c.childId)} width={60} />
                {c.ratings.length > 0 && <Text style={styles.rowValue}>{c.ratings[c.ratings.length - 1].value.toFixed(1)}/5</Text>}
                <View style={styles.chips}>
                  {c.met > 0 && <Chip text={`🎯 ${c.met} met`} bg="#E3F4E3" />}
                  {c.partly > 0 && <Chip text={`🌱 ${c.partly}`} bg="#FFF3D6" />}
                  {c.notYet > 0 && <Chip text={`💪 ${c.notYet}`} bg="#FCE6E1" />}
                </View>
              </View>
            ))}
            {ins.tags.length > 0 && (
              <View style={[styles.chips, { justifyContent: 'flex-start', marginTop: 4 }]}>
                {ins.tags.map((t) => (
                  <Chip key={t.tag} text={`${t.emoji} ${t.label} ×${t.count}`} bg={t.tone === 'good' ? colors.mint : '#FCEDE4'} />
                ))}
              </View>
            )}
          </View>
        </>
      )}

      {/* Compare children */}
      {!childId && ins.rows.length > 1 && (
        <>
          <SectionTitle title="Children compared" sub="Tap a row to open the profile" />
          <View style={styles.sortRow}>
            {(['bloom', 'practice', 'accuracy', 'trend'] as Sort[]).map((k) => (
              <Pressable key={k} onPress={() => setSort(k)} style={[styles.sortChip, sort === k && styles.sortOn]} accessibilityRole="button" accessibilityState={{ selected: sort === k }}>
                <Text style={[styles.sortText, sort === k && { color: colors.white }]}>{k === 'bloom' ? 'Bloom' : k === 'practice' ? 'Practice' : k === 'accuracy' ? 'Accuracy' : 'Trend'}</Text>
              </Pressable>
            ))}
          </View>
          <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
            <View style={[styles.tr, styles.th]}>
              <Text style={[styles.tc, { flex: 1.6, textAlign: 'left' }]}>{t('CHILD')}</Text>
              <Text style={styles.tc}>{t('BLOOM')}</Text>
              <Text style={styles.tc}>{t('DAYS')}</Text>
              <Text style={styles.tc}>{t('ACC.')}</Text>
              <Text style={styles.tc}>{t('TREND')}</Text>
            </View>
            {sorted.map((r, i) => (
              <Pressable key={r.child.id} onPress={() => nav.navigate('ChildProfile', { childId: r.child.id })} style={[styles.tr, i % 2 === 1 && { backgroundColor: '#FAFAF6' }]} accessibilityRole="button">
                <View style={[styles.row, { flex: 1.6, gap: 8 }]}>
                  <View style={[styles.dot, { backgroundColor: colorOf(r.child.id) }]} />
                  <Text style={styles.rowName} numberOfLines={1}>
                    {firstName(r.child.name)}
                  </Text>
                </View>
                <Text style={[styles.td, { fontFamily: font.heavy }]}>{r.bloom.score}</Text>
                <Text style={styles.td}>
                  {r.practiceDays}/{r.planned}
                </Text>
                <Text style={styles.td}>{r.accuracy === null ? '—' : `${Math.round(r.accuracy * 100)}%`}</Text>
                <Text style={[styles.td, r.trend !== null && r.trend < 0 ? { color: colors.danger } : { color: '#2E9E6B' }]}>
                  {r.trend === null ? '—' : `${r.trend >= 0 ? '▲' : '▼'}${Math.abs(Math.round(r.trend * 100))}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Engine decisions */}
      {ins.decisions.length > 0 && (
        <>
          <SectionTitle title="How the games adapted" sub="Automatic level changes, in plain words" />
          <View style={{ gap: 8 }}>
            {decisions.map((d, i) => (
              <View key={i} style={styles.decision}>
                <View style={[styles.decisionIcon, { backgroundColor: d.up ? colors.mint : colors.warm }]}>
                  <Feather name={d.up ? 'arrow-up-right' : 'arrow-down-right'} size={16} color={d.up ? '#2E9E6B' : '#D99A1B'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowSub}>
                    {d.name} · {relativeDay(d.at)}
                  </Text>
                  <Text style={styles.rowName}>{d.text}</Text>
                  <Text style={styles.rowSub}>{d.why}</Text>
                </View>
              </View>
            ))}
            {ins.decisions.length > 4 && (
              <Pressable onPress={() => setAllDecisions(!allDecisions)} style={styles.more} accessibilityRole="button">
                <Text style={styles.moreText}>{allDecisions ? 'Show less' : `Show all ${ins.decisions.length}`}</Text>
              </Pressable>
            )}
          </View>
        </>
      )}

      {/* Reports */}
      <SectionTitle title="Progress reports" sub="A colour report for the family or school · print or save as PDF" />
      <View style={{ gap: 8 }}>
        {ins.rows.map((r) => (
          <Pressable key={r.child.id} onPress={() => report(r)} style={styles.reportRow} accessibilityRole="button" accessibilityLabel={`Progress report for ${r.child.name}`}>
            <Avatar name={r.child.name} color={r.child.color} photo={r.child.photo} emoji={r.child.avatarEmoji} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{r.child.name}</Text>
              <Text style={styles.rowSub}>
                {RANGE_LABEL[range]} · {r.bloom.emoji} {r.bloom.label} · {r.bloom.score}
              </Text>
            </View>
            <View style={styles.reportIcon}>
              <Feather name="printer" size={16} color={colors.forest} />
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={styles.disclaimer}>{t('Practice summaries to support your clinical judgement — not a diagnosis or a clinical measure.')}</Text>
    </Screen>
  );
}

function Kpi({ value, label, delta }: { value: string; label: string; delta?: number | null }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.kpiLabel}>{label}</Text>
      {delta !== undefined && delta !== null && (
        <Text style={[styles.kpiDelta, { color: delta >= 0 ? colors.lime : '#FFB4A6' }]}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta * 100))}%
        </Text>
      )}
    </View>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginTop: 26, marginBottom: 10 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!sub && <Text style={styles.sectionSub}>{sub}</Text>}
    </View>
  );
}

function Chip({ text, bg }: { text: string; bg: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  reportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.forest, paddingHorizontal: 14, height: 40, borderRadius: 20 },
  reportText: { fontFamily: font.bold, fontSize: 14, color: colors.white },
  segment: { flexDirection: 'row', backgroundColor: '#E9E7DF', borderRadius: 14, padding: 4, marginTop: 16 },
  segBtn: { flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  segText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.inkSoft },
  kids: { gap: 8, marginTop: 12, paddingRight: 8 },
  kid: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 6, paddingRight: 12, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  kidOn: { backgroundColor: colors.forest, borderColor: colors.forest, paddingLeft: 12 },
  kidText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  hero: { borderRadius: 28, padding: 20, marginTop: 16 },
  ringWrap: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 60, padding: 4 },
  heroEyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.4, color: '#B9D3C2' },
  heroTitle: { fontFamily: font.heavy, fontSize: 26, color: colors.white, marginTop: 4 },
  heroSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.onDark, marginTop: 4, lineHeight: 17 },
  kpis: { flexDirection: 'row', gap: 8, marginTop: 18 },
  kpi: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  kpiValue: { fontFamily: font.heavy, fontSize: 20, color: colors.white },
  kpiLabel: { fontFamily: font.medium, fontSize: 11, color: colors.onDark, marginTop: 2 },
  kpiDelta: { fontFamily: font.bold, fontSize: 11, marginTop: 2 },
  sectionTitle: { fontFamily: font.heavy, fontSize: 20, color: colors.ink, letterSpacing: -0.3 },
  sectionSub: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  pageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D9D7CE' },
  pageDotOn: { width: 22, backgroundColor: colors.forest },
  arrowBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  story: { width: 160, height: 190, borderRadius: 24, padding: 16, overflow: 'hidden', justifyContent: 'flex-end' },
  storyEmoji: { fontSize: 34, position: 'absolute', top: 14, left: 16 },
  storyTitle: { fontFamily: font.bold, fontSize: 12, letterSpacing: 0.6, color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase' },
  storyValue: { fontFamily: font.heavy, fontSize: 24, color: colors.white, marginTop: 4, letterSpacing: -0.5 },
  storyDetail: { fontFamily: font.medium, fontSize: 12.5, color: 'rgba(255,255,255,0.92)', marginTop: 2 },
  storyBubble: { position: 'absolute', right: -30, top: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.18)' },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 12 },
  alertTitle: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink },
  alertDetail: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, marginTop: 1 },
  more: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14 },
  moreText: { fontFamily: font.bold, fontSize: 14, color: colors.forest },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 14, borderWidth: 1, borderColor: colors.border },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillName: { width: 130, fontFamily: font.medium, fontSize: 12.5, color: colors.ink },
  skillTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.soft, overflow: 'hidden' },
  skillFill: { height: '100%', borderRadius: 5 },
  skillPct: { width: 36, textAlign: 'right', fontFamily: font.bold, fontSize: 12.5, color: colors.ink },
  delta: { width: 32, textAlign: 'right', fontFamily: font.bold, fontSize: 11.5 },
  rowName: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  rowSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft },
  rowValue: { fontFamily: font.bold, fontSize: 13.5, color: colors.ink },
  followTrack: { height: 12, borderRadius: 6, backgroundColor: colors.soft, overflow: 'hidden' },
  followFill: { height: '100%', borderRadius: 6 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
  moodCol: { alignItems: 'center', gap: 4, width: 40 },
  moodCount: { fontFamily: font.bold, fontSize: 12, color: colors.inkSoft },
  moodBar: { width: 24, borderRadius: 8 },
  insightLine: { fontFamily: font.medium, fontSize: 13.5, color: colors.ink, marginTop: 12, backgroundColor: colors.warm, borderRadius: 12, padding: 10 },
  stars: { fontSize: 13 },
  chips: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  chip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontFamily: font.semibold, fontSize: 12, color: colors.ink },
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  sortChip: { paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: colors.sage, justifyContent: 'center' },
  sortOn: { backgroundColor: colors.forest },
  sortText: { fontFamily: font.semibold, fontSize: 13, color: colors.forest },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  th: { backgroundColor: colors.bg },
  tc: { flex: 1, textAlign: 'center', fontFamily: font.bold, fontSize: 11, color: colors.inkSoft, letterSpacing: 0.4 },
  td: { flex: 1, textAlign: 'center', fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  dot: { width: 10, height: 10, borderRadius: 5 },
  decision: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.border },
  decisionIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: colors.border },
  reportIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft, textAlign: 'center', paddingVertical: 14 },
  disclaimer: { fontFamily: font.regular, fontSize: 12, color: colors.inkMuted, textAlign: 'center', marginTop: 26 },
});
