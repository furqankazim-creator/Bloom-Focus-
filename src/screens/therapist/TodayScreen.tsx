import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Avatar, IconButton, Notice, Screen, flipIcon } from '../../components/ui';
import { Sparkline } from '../../components/insightCharts';
import { FEELING_EMOJI } from '../../engine/clinic';
import { buildInsights, type InsightAlert } from '../../engine/insights';
import { currentWeek } from '../../engine/monthPlan';
import { sessionAccuracy } from '../../engine/profile';
import { DOMAIN_LABEL } from '../../engine/tasks';
import { dateLocale, t } from '../../i18n';
import { NotificationBell } from '../../notifications/NotificationBell';
import { useStore } from '../../store/useStore';
import { useTeamMember, useVisibleChildren } from '../../store/useTeam';
import { colors, font } from '../../theme';
import type { Child, Session } from '../../types';
import { childStats, firstName, greeting, longDate, relativeDay } from '../helpers';

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const mondayOf = (d: Date) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const accOf = (list: Session[]) => mean(list.map(sessionAccuracy).filter((v): v is number => v !== null));

/** Days since a child last played anything (null = never). */
function daysSince(last: string | undefined, now: Date) {
  if (!last) return null;
  return Math.floor((startOfDay(now).getTime() - startOfDay(new Date(last)).getTime()) / DAY);
}

/**
 * The therapist's dashboard: today's numbers, who to see next and why, what needs attention,
 * quick actions, the week at a glance, the caseload and what is coming up.
 */
export default function TodayScreen() {
  const nav = useNavigation();
  const { sessions: allSessions, userName, notes, kidCheckIns, clinicVisits, libraryPlays, settings } = useStore();
  const children = useVisibleChildren();
  const { me } = useTeamMember();
  const now = new Date();

  const d = useMemo(() => {
    const ids = new Set(children.map((c) => c.id));
    const sessions = allSessions.filter((s) => ids.has(s.childId));
    const today = startOfDay(now).getTime();
    const monday = mondayOf(now).getTime();
    const lastMonday = monday - 7 * DAY;
    const week = sessions.filter((s) => Date.parse(s.startedAt) >= monday);
    // Same days last week (Monday up to this time of day), so a part-week compares fairly.
    const sameTimeLastWeek = now.getTime() - 7 * DAY;
    const prevWeek = sessions.filter((s) => {
      const tt = Date.parse(s.startedAt);
      return tt >= lastMonday && tt < sameTimeLastWeek;
    });
    const activeToday = new Set(sessions.filter((s) => Date.parse(s.startedAt) >= today).map((s) => s.childId));
    // Sessions per weekday, Monday first.
    const perDay = [0, 1, 2, 3, 4, 5, 6].map((i) => week.filter((s) => {
      const tt = Date.parse(s.startedAt);
      return tt >= monday + i * DAY && tt < monday + (i + 1) * DAY;
    }).length);
    const unread = notes.filter((n) => ids.has(n.childId) && n.from !== 'therapist' && !n.readAt).length;
    const ins = buildInsights(
      { children, sessions, libraryPlays, checkIns: kidCheckIns, visits: clinicVisits },
      'week',
      null,
      now,
      { gapDays: settings.alertGapDays, dropPct: settings.alertDropPct },
    );
    return {
      sessions,
      week,
      activeToday,
      perDay,
      unread,
      minutes: Math.round(week.reduce((n, s) => n + s.activeSec, 0) / 60),
      acc: accOf(week),
      prevAcc: accOf(prevWeek),
      prevCount: prevWeek.length,
      alerts: ins.alerts.filter((a) => a.tone !== 'green').slice(0, 3),
      wins: ins.alerts.filter((a) => a.tone === 'green').length,
    };
  }, [children, allSessions, notes, kidCheckIns, clinicVisits, libraryPlays, settings.alertGapDays, settings.alertDropPct]); // eslint-disable-line react-hooks/exhaustive-deps

  // Who to see next: an open clinic session first, then a visit planned for today, then whoever
  // has gone longest without practice.
  const todayYmd = now.toISOString().slice(0, 10);
  const openVisit = clinicVisits.find((v) => v.status === 'active' && children.some((c) => c.id === v.childId));
  const plannedToday = clinicVisits.find((v) => v.status === 'done' && v.nextVisit === todayYmd && children.some((c) => c.id === v.childId));
  const longest = [...children].sort((a, b) => (childStats(a, d.sessions).last?.startedAt ?? '').localeCompare(childStats(b, d.sessions).last?.startedAt ?? ''))[0];
  const upNext = children.find((c) => c.id === (openVisit?.childId ?? plannedToday?.childId)) ?? longest;
  const reason = openVisit
    ? t('A clinic session is open')
    : plannedToday
      ? t('Clinic visit planned for today')
      : t('Longest without practice');

  const total = children.length;
  const done = d.activeToday.size;
  const sessionsDelta = d.week.length - d.prevCount;
  const accDelta = d.acc !== null && d.prevAcc !== null ? Math.round((d.acc - d.prevAcc) * 100) : null;

  // Coming up: planned clinic visits (next 7 days) and running 4-week plans.
  const upcoming = useMemo(() => {
    const out: { key: string; child: Child; icon: string; title: string; when: string; date: number }[] = [];
    const today = startOfDay(now).getTime();
    for (const c of children) {
      const visit = clinicVisits
        .filter((v) => v.childId === c.id && v.status === 'done' && v.nextVisit)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
      const due = visit?.nextVisit ? new Date(visit.nextVisit + 'T00:00').getTime() : NaN;
      if (due >= today && due < today + 8 * DAY) {
        const days = Math.round((due - today) / DAY);
        out.push({
          key: `v-${c.id}`,
          child: c,
          icon: '📅',
          title: visit?.nextGoal ? t('Clinic visit · {{goal}}', { goal: visit.nextGoal }) : t('Clinic visit'),
          when: days === 0 ? t('Today') : days === 1 ? t('Tomorrow') : new Date(due).toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric' }),
          date: due,
        });
      }
      const cur = currentWeek(c.monthPlan, now);
      if (cur) {
        out.push({
          key: `m-${c.id}`,
          child: c,
          icon: '🗓️',
          title: t('Week {{n}} of 4 · {{goal}}', { n: cur.index + 1, goal: cur.week.goal }),
          when: t('This week'),
          date: today + 0.5 * DAY,
        });
      }
    }
    return out.sort((a, b) => a.date - b.date).slice(0, 4);
  }, [children, clinicVisits]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = me?.name || userName || t('there');
  const subline =
    total === 0
      ? t('Add your first child to get started.')
      : d.unread
        ? t('{{done}} of {{total}} practised today · {{n}} new messages', { done, total, n: d.unread })
        : t('{{done}} of {{total}} practised today', { done, total });

  return (
    <Screen>
      {/* Header */}
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={[styles.row, { gap: 12, flex: 1 }]}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="clover" size={26} color={colors.lime} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow} numberOfLines={1}>{longDate()}</Text>
            <Text style={styles.brand} numberOfLines={1}>
              {t('Therapist space')}
              {settings.clinicName ? ` · ${settings.clinicName}` : ''}
            </Text>
          </View>
        </View>
        <View style={[styles.row, { gap: 8 }]}>
          <NotificationBell />
          <IconButton icon="settings" label="Settings" size={48} onPress={() => nav.navigate('Settings')} />
        </View>
      </View>

      {/* Greeting */}
      <Text style={styles.greet}>
        {greeting()}, <Text style={{ color: colors.forest }}>{name}</Text>
      </Text>
      <Text style={styles.subline}>{subline}</Text>

      {/* Today's numbers */}
      <View style={styles.kpis}>
        <View style={styles.kpiWide}>
          <Ring value={total ? done / total : 0} />
          <View style={{ flex: 1 }}>
            <Text style={styles.kpiValue}>
              {done}
              <Text style={styles.kpiOf}>/{total}</Text>
            </Text>
            <Text style={styles.kpiLabel}>{t('Practised today')}</Text>
          </View>
        </View>
        <View style={styles.kpiRow}>
          <Kpi icon="activity" tint={colors.mint} value={String(d.week.length)} label={t('Sessions this week')} delta={d.prevCount ? sessionsDelta : null} />
          <Kpi icon="clock" tint={colors.warm} value={t('{{n}} min', { n: d.minutes })} label={t('Focus time')} />
          <Kpi icon="target" tint={colors.sage} value={d.acc === null ? '—' : `${Math.round(d.acc * 100)}%`} label={t('Avg accuracy')} delta={accDelta} unit="%" />
        </View>
      </View>

      {/* Up next */}
      {upNext ? (
        <UpNext
          child={upNext}
          sessions={d.sessions}
          reason={reason}
          resume={!!openVisit && openVisit.childId === upNext.id}
          mood={[...kidCheckIns].reverse().find((k) => k.childId === upNext.id)?.feeling}
          nextVisit={clinicVisits.filter((v) => v.childId === upNext.id && v.status === 'done' && v.nextVisit).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]?.nextVisit}
          onStart={() => nav.navigate('ClinicSession', { childId: upNext.id })}
          onKid={() => nav.navigate('KidHub', { childId: upNext.id })}
          onProfile={() => nav.navigate('ChildProfile', { childId: upNext.id })}
        />
      ) : (
        <Pressable onPress={() => nav.navigate('EditChild', {})} style={styles.empty} accessibilityRole="button">
          <Text style={{ fontSize: 36 }}>🌱</Text>
          <Text style={styles.emptyTitle}>{t('Add a child')}</Text>
          <Text style={styles.emptyBody}>{t('Add a child profile to begin.')}</Text>
        </Pressable>
      )}

      {/* Needs attention */}
      <Section title={t('Needs attention')} right={d.wins ? t('{{n}} wins this week 🌟', { n: d.wins }) : undefined} onRight={() => nav.navigate('Tabs', { screen: 'Insights' })} />
      {d.alerts.length ? (
        <View style={styles.card}>
          {d.alerts.map((a, i) => (
            <AlertRow
              key={a.id}
              alert={a}
              child={children.find((c) => c.id === a.childId)}
              first={i === 0}
              onOpen={() => nav.navigate('ChildProfile', { childId: a.childId })}
              onMessage={() => nav.navigate('Tabs', { screen: 'Notes', params: { childId: a.childId } })}
            />
          ))}
        </View>
      ) : (
        <View style={[styles.card, styles.allClear]}>
          <Feather name="check-circle" size={20} color={colors.forest} />
          <Text style={styles.allClearText}>{t('Nothing needs attention right now. 🌿')}</Text>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.actions}>
        <Action icon="user-plus" label={t('Add child')} tint={colors.mint} onPress={() => nav.navigate('EditChild', {})} />
        <Action icon="book-open" label={t('Assign activity')} tint={colors.warm} onPress={() => nav.navigate('Library', { childId: upNext?.id })} />
        <Action icon="bar-chart-2" label={t('Reports')} tint={colors.sage} onPress={() => nav.navigate('Tabs', { screen: 'Insights' })} />
        <Action icon="message-circle" label={t('Messages')} tint={colors.blush} badge={d.unread} onPress={() => nav.navigate('Tabs', { screen: 'Notes' })} />
      </View>

      {/* This week */}
      <Section title={t('This week')} right={t('{{n}} sessions', { n: d.week.length })} />
      <View style={styles.card}>
        <WeekBars counts={d.perDay} todayIndex={(now.getDay() + 6) % 7} />
      </View>

      {/* Caseload */}
      <Section title={t('Your caseload')} right={t('See all')} onRight={() => nav.navigate('Tabs', { screen: 'Children' })} />
      <View style={styles.card}>
        {children.map((c, i) => (
          <CaseRow
            key={c.id}
            child={c}
            sessions={d.sessions}
            first={i === 0}
            gapDays={settings.alertGapDays}
            onOpen={() => nav.navigate('ChildProfile', { childId: c.id })}
            onStart={() => nav.navigate('ClinicSession', { childId: c.id })}
          />
        ))}
        {!children.length && <Text style={[styles.emptyBody, { padding: 16 }]}>{t('No children yet')}</Text>}
      </View>

      {/* Coming up */}
      {upcoming.length > 0 && (
        <>
          <Section title={t('Coming up')} />
          <View style={styles.card}>
            {upcoming.map((u, i) => (
              <Pressable key={u.key} onPress={() => nav.navigate('ChildProfile', { childId: u.child.id })} style={[styles.upRow, i > 0 && styles.divider]} accessibilityRole="button">
                <Text style={styles.upIcon}>{u.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upName}>{firstName(u.child.name)}</Text>
                  <Text style={styles.upTitle} numberOfLines={1}>{u.title}</Text>
                </View>
                <Text style={styles.upWhen}>{u.when}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Notice style={{ marginTop: 20 }} text="Sample practice data · saved only on this device" />
    </Screen>
  );
}

/* ——— pieces ——— */

function Ring({ value, size = 52 }: { value: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.sage} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.forest}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c * Math.max(0.001, value)} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

function Kpi({ icon, tint, value, label, delta, unit = '' }: { icon: React.ComponentProps<typeof Feather>['name']; tint: string; value: string; label: string; delta?: number | null; unit?: string }) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: tint }]}>
        <Feather name={icon} size={16} color={colors.ink} />
      </View>
      <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
        <Text style={styles.kpiLabel}>{label}</Text>
        {delta !== undefined && delta !== null && delta !== 0 && (
          <Text style={[styles.delta, { color: delta > 0 ? '#2E9E6B' : colors.danger }]}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

function UpNext({
  child,
  sessions,
  reason,
  resume,
  mood,
  nextVisit,
  onStart,
  onKid,
  onProfile,
}: {
  child: Child;
  sessions: Session[];
  reason: string;
  resume: boolean;
  mood?: keyof typeof FEELING_EMOJI;
  nextVisit?: string;
  onStart: () => void;
  onKid: () => void;
  onProfile: () => void;
}) {
  const st = childStats(child, sessions);
  const mine = st.sessions;
  const recent = accOf(mine.slice(0, 5));
  const before = accOf(mine.slice(5, 10));
  const trend = recent !== null && before !== null ? Math.round((recent - before) * 100) : null;
  const chips: string[] = [
    st.last ? `🕒 ${relativeDay(st.last.startedAt)}` : `🕒 ${t('Not played yet')}`,
    recent !== null ? `🎯 ${Math.round(recent * 100)}%${trend ? ` ${trend > 0 ? '▲' : '▼'}${Math.abs(trend)}` : ''}` : '',
    mood ? `${FEELING_EMOJI[mood]} ${t(mood[0].toUpperCase() + mood.slice(1))}` : '',
    nextVisit ? `📅 ${new Date(nextVisit + 'T00:00').toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' })}` : '',
  ].filter(Boolean);
  return (
    <LinearGradient colors={[colors.forestDeep, '#2B5A43']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroGlow} />
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={styles.heroTag}>
          <View style={styles.heroDot} />
          <Text style={styles.heroTagText}>{t('UP NEXT')}</Text>
        </View>
        <Text style={styles.heroReason} numberOfLines={1}>{reason}</Text>
      </View>
      <Pressable onPress={onProfile} style={[styles.row, { gap: 14, marginTop: 16 }]} accessibilityRole="button">
        <View style={styles.heroAvatar}>
          <Avatar name={child.name} color={child.color} photo={child.photo} emoji={child.avatarEmoji} size={58} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName} numberOfLines={1}>{child.name}</Text>
          <Text style={styles.heroMeta} numberOfLines={1}>
            {t('{{n}} years', { n: child.age })} · {t(DOMAIN_LABEL[child.focus])} · {t('Lvl {{n}}', { n: st.level })}
          </Text>
        </View>
        <Feather name={flipIcon('chevron-right')} size={20} color={colors.onDark} />
      </Pressable>
      <View style={styles.chips}>
        {chips.map((c) => (
          <View key={c} style={styles.chip}>
            <Text style={styles.chipText}>{c}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.row, { gap: 10, marginTop: 18 }]}>
        <Pressable onPress={onStart} style={({ pressed }) => [styles.heroBtn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Feather name={resume ? 'play-circle' : 'play'} size={18} color={colors.onPastel} />
          <Text style={styles.heroBtnText}>{resume ? t('Resume session') : t('Start clinic session')}</Text>
        </Pressable>
        <Pressable onPress={onKid} style={({ pressed }) => [styles.heroBtn2, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={t('Kid view')}>
          <Feather name="smile" size={18} color={colors.white} />
          <Text style={styles.heroBtn2Text}>{t('Kid view')}</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function Section({ title, right, onRight }: { title: string; right?: string; onRight?: () => void }) {
  return (
    <View style={[styles.row, styles.section]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right ? (
        <Pressable onPress={onRight} disabled={!onRight} hitSlop={8}>
          <Text style={[styles.sectionRight, onRight && { color: colors.forest }]}>{right}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AlertRow({ alert, child, first, onOpen, onMessage }: { alert: InsightAlert; child?: Child; first: boolean; onOpen: () => void; onMessage: () => void }) {
  const red = alert.tone === 'red';
  return (
    <View style={[styles.alert, !first && styles.divider]}>
      <View style={[styles.alertBar, { backgroundColor: red ? colors.danger : '#E0A11B' }]} />
      <Pressable onPress={onOpen} style={[styles.row, { flex: 1, gap: 12 }]} accessibilityRole="button">
        {child && <Avatar name={child.name} color={child.color} photo={child.photo} emoji={child.avatarEmoji} size={36} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle} numberOfLines={2}>{alert.title}</Text>
          <Text style={styles.alertDetail} numberOfLines={2}>{alert.detail}</Text>
        </View>
      </Pressable>
      <Pressable onPress={onMessage} style={styles.alertBtn} accessibilityRole="button" accessibilityLabel={t('Message family')} hitSlop={6}>
        <Feather name="send" size={15} color={colors.forest} />
      </Pressable>
    </View>
  );
}

function Action({ icon, label, tint, badge, onPress }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; tint: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <View style={[styles.actionIcon, { backgroundColor: tint }]}>
        <Feather name={icon} size={20} color={colors.ink} />
        {!!badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.actionLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

function WeekBars({ counts, todayIndex }: { counts: number[]; todayIndex: number }) {
  const max = Math.max(1, ...counts);
  const letters = [t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')];
  return (
    <View style={styles.bars}>
      {counts.map((n, i) => (
        <View key={i} style={styles.barCol}>
          <Text style={[styles.barNum, !n && { opacity: 0 }]}>{n}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { height: `${Math.max(n ? 12 : 0, (n / max) * 100)}%`, backgroundColor: i === todayIndex ? colors.forest : i > todayIndex ? colors.border : colors.leaf }]} />
          </View>
          <Text style={[styles.barDay, i === todayIndex && { color: colors.forest, fontFamily: font.bold }]} numberOfLines={1}>
            {letters[i]}
          </Text>
        </View>
      ))}
    </View>
  );
}

function CaseRow({ child, sessions, first, gapDays, onOpen, onStart }: { child: Child; sessions: Session[]; first: boolean; gapDays: number; onOpen: () => void; onStart: () => void }) {
  const st = childStats(child, sessions);
  const now = new Date();
  const gap = daysSince(st.last?.startedAt, now);
  const status = gap === 0 ? colors.leaf : gap !== null && gap < gapDays ? '#E0A11B' : colors.danger;
  const accs = st.sessions
    .slice(0, 8)
    .map(sessionAccuracy)
    .filter((v): v is number => v !== null)
    .reverse();
  // Practice days this week, Monday first.
  const monday = mondayOf(now).getTime();
  const played = new Set(st.sessions.filter((s) => Date.parse(s.startedAt) >= monday).map((s) => Math.floor((Date.parse(s.startedAt) - monday) / DAY)));
  const todayIdx = (now.getDay() + 6) % 7;
  return (
    <View style={[styles.case, !first && styles.divider]}>
      <Pressable onPress={onOpen} style={[styles.row, { flex: 1, gap: 12 }]} accessibilityRole="button">
        <View>
          <Avatar name={child.name} color={child.color} photo={child.photo} emoji={child.avatarEmoji} size={46} />
          <View style={[styles.statusDot, { backgroundColor: status }]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.caseName} numberOfLines={1}>{child.name}</Text>
          <Text style={styles.caseMeta} numberOfLines={1}>
            {st.last ? relativeDay(st.last.startedAt) : t('Not played yet')} · {st.avg === null ? '—' : `${Math.round(st.avg * 100)}%`}
          </Text>
          <View style={[styles.row, { gap: 3, marginTop: 6 }]}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} style={[styles.weekDot, played.has(i) && { backgroundColor: colors.leaf }, i === todayIdx && styles.weekDotToday, i > todayIdx && { opacity: 0.4 }]} />
            ))}
          </View>
        </View>
        <Sparkline values={accs} max={1} width={64} height={28} color={colors.forest} />
      </Pressable>
      <Pressable onPress={onStart} style={styles.play} accessibilityRole="button" accessibilityLabel={t('Start with {{name}}', { name: firstName(child.name) })}>
        <Feather name="play" size={18} color={colors.onPastel} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#14253F', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: font.semibold, fontSize: 11.5, letterSpacing: 1.2, color: colors.inkMuted, textTransform: 'uppercase' },
  brand: { fontFamily: font.bold, fontSize: 15, color: colors.ink, marginTop: 1 },
  greet: { fontFamily: font.heavy, fontSize: 28, lineHeight: 34, color: colors.ink, letterSpacing: -0.6, marginTop: 22 },
  subline: { fontFamily: font.medium, fontSize: 14.5, color: colors.inkSoft, marginTop: 4 },

  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  kpiRow: { width: '100%', flexDirection: 'row', gap: 10 },
  kpi: { flex: 1, minWidth: 0, padding: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  kpiWide: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  kpiIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontFamily: font.heavy, fontSize: 22, color: colors.ink, letterSpacing: -0.4 },
  kpiOf: { fontFamily: font.bold, fontSize: 16, color: colors.inkMuted },
  kpiLabel: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  delta: { fontFamily: font.bold, fontSize: 11.5, marginTop: 2 },

  hero: { borderRadius: 26, padding: 18, marginTop: 16, overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(212,233,140,0.10)', top: -90, right: -70 },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.lime, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.forestDeep },
  heroTagText: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.4, color: '#213D31' },
  heroReason: { flexShrink: 1, marginLeft: 10, fontFamily: font.semibold, fontSize: 12.5, color: colors.lime },
  heroAvatar: { padding: 3, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroName: { fontFamily: font.heavy, fontSize: 22, color: colors.white, letterSpacing: -0.4 },
  heroMeta: { fontFamily: font.medium, fontSize: 13, color: colors.onDark, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' },
  chipText: { fontFamily: font.semibold, fontSize: 12, color: colors.white },
  heroBtn: { flex: 1, height: 50, borderRadius: 16, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroBtnText: { fontFamily: font.bold, fontSize: 15, color: colors.onPastel },
  heroBtn2: { height: 50, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBtn2Text: { fontFamily: font.semibold, fontSize: 14, color: colors.white },

  section: { justifyContent: 'space-between', marginTop: 26, marginBottom: 10 },
  sectionTitle: { fontFamily: font.heavy, fontSize: 18, color: colors.ink, letterSpacing: -0.3 },
  sectionRight: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft },
  card: { borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },

  alert: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 16, paddingRight: 12 },
  alertBar: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  alertTitle: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  alertDetail: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  alertBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  allClear: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  allClearText: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, flex: 1 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  action: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: font.semibold, fontSize: 12, color: colors.ink, textAlign: 'center' },
  badge: { position: 'absolute', top: -6, right: -8, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.card },
  badgeText: { fontFamily: font.bold, fontSize: 10.5, color: colors.white },

  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, height: 150 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barNum: { fontFamily: font.bold, fontSize: 11.5, color: colors.inkSoft, marginBottom: 4 },
  barTrack: { flex: 1, width: '70%', maxWidth: 26, borderRadius: 8, backgroundColor: colors.soft, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 8 },
  barDay: { fontFamily: font.medium, fontSize: 11, color: colors.inkMuted, marginTop: 6 },

  case: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  statusDot: { position: 'absolute', right: -1, bottom: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: colors.card },
  caseName: { fontFamily: font.bold, fontSize: 15.5, color: colors.ink },
  caseMeta: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, marginTop: 1 },
  weekDot: { width: 14, height: 5, borderRadius: 3, backgroundColor: colors.border },
  weekDotToday: { borderWidth: 1, borderColor: colors.forest },
  play: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },

  upRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  upIcon: { fontSize: 22 },
  upName: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  upTitle: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, marginTop: 1 },
  upWhen: { fontFamily: font.bold, fontSize: 12.5, color: colors.forest },

  empty: { marginTop: 16, padding: 24, borderRadius: 24, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  emptyTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink, marginTop: 6 },
  emptyBody: { fontFamily: font.regular, fontSize: 13.5, color: colors.inkSoft, marginTop: 4, textAlign: 'center' },
});
