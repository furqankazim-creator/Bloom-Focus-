import { dateLocale, t } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Avatar, Button, Card, IconButton, Screen, T, flipIcon } from '../../components/ui';
import { HeroSticker } from '../../components/hero/HeroSticker';
import {
  CLINIC_TAGS,
  FEELING_EMOJI,
  buildBriefing,
  formatDuration,
  goalIdeas,
  isTrain,
  libraryFamilyOf,
  planTitle,
  levelOf,
  minutesOf,
  nudgeParams,
  suggestPlan,
  summarizeVisit,
  type PlanPick,
} from '../../engine/clinic';
import { TRAIN_BY_ID, TRAIN_IDS, type TrainTaskId } from '../../engine/trainTasks';
import { BASE_PARAMS } from '../../engine/tasks';
import type { RootProps } from '../../navigation/types';
import { LIBRARY_ART } from '../../library/art';
import { libraryActivity } from '../../library/assign';
import { FAMILY, LEVEL_NAMES, LIBRARY, isLibraryFamily, startLevel } from '../../library/catalog';
import { openPlanStep } from '../planChain';
import { noteSummary } from '../../services/attachments';
import { postToConversation } from '../../services/messaging';
import { pct } from '../../services/noteCards';
import { parentLabel, uid } from '../../store/seed';
import { useChild, useStore } from '../../store/useStore';
import { colors, font } from '../../theme';
import type { ClinicVisit, GoalResult, VisitCard } from '../../types';
import { firstName, relativeDay, shortDate } from '../helpers';

type Step = 'brief' | 'plan' | 'wrap' | 'done';
const STEPS = ['Briefing', 'Plan', 'Play', 'Wrap-up'];
/** Where each screen sits on the stepper; once the games are played the wrap-up is step 4. */
const STEP_AT: Record<Step, number> = { brief: 0, plan: 1, wrap: 3, done: 4 };

const GOAL_RESULTS: { id: GoalResult; label: string; emoji: string }[] = [
  { id: 'met', label: 'Met', emoji: '🎯' },
  { id: 'partly', label: 'Partly', emoji: '🌱' },
  { id: 'notYet', label: 'Not yet', emoji: '💪' },
];
const RATINGS = [
  { key: 'attention' as const, label: 'Attention' },
  { key: 'engagement' as const, label: 'Engagement' },
  { key: 'calm' as const, label: 'Calm & regulation' },
];
const DAY = 86_400_000;
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString(dateLocale(), { weekday: 'narrow' });
const fullDate = (iso: string) => new Date(iso).toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' });

export default function ClinicSessionScreen({ route, navigation }: RootProps<'ClinicSession'>) {
  const child = useChild(route.params.childId);
  const { sessions, notes, kidCheckIns, clinicVisits, calmMode, setPrefs, saveVisit, updateChild, setTaskParam, libraryPlays, libraryVersions, saveCustomActivity } = useStore();
  const [visitId, setVisitId] = useState<string | undefined>(route.params.visitId);
  const visit = clinicVisits.find((v) => v.id === visitId);
  const [step, setStep] = useState<Step>(visit?.status === 'active' ? 'wrap' : 'brief');

  // Worked out once when the screen opens, so it doesn't shift while the therapist plans.
  const brief = useMemo(
    () => (child ? buildBriefing(child, { sessions, notes, checkIns: kidCheckIns, visits: clinicVisits, libraryPlays }) : null),
    [child?.id], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [plan, setPlan] = useState<PlanPick[]>(() => (child && brief ? suggestPlan(child, brief, calmMode, useStore.getState().settings.clinicGames) : []));
  const [goal, setGoal] = useState('');
  const [addFrom, setAddFrom] = useState<'focus' | 'builders'>('focus');
  // Wrapping up without playing (e.g. the session was talk only).
  const [skipPlay, setSkipPlay] = useState(false);

  // Wrap-up.
  const [goalResult, setGoalResult] = useState<GoalResult | undefined>();
  const [ratings, setRatings] = useState({ attention: 0, engagement: 0, calm: 0 });
  const [note, setNote] = useState('');
  const [homeGames, setHomeGames] = useState<string[] | null>(null);
  const [minutesPerDay, setMinutesPerDay] = useState(child?.homePlan?.minutesPerDay ?? 10);
  const [daysPerWeek, setDaysPerWeek] = useState(child?.homePlan?.daysPerWeek ?? Math.min(7, Math.max(3, child?.homeSessionsPerWeek ?? 3)));
  const [nextIn, setNextIn] = useState<7 | 14 | 0>(useStore.getState().settings.nextVisitDays);
  const [nextGoal, setNextGoal] = useState('');
  const [send, setSend] = useState(true);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!child || !brief) return null;
  const first = firstName(child.name);
  const parent = parentLabel(child);
  const heroes = (child.favouriteCharacters ?? []).slice(0, 3);

  // An unfinished session for this child, offered to resume instead of starting over.
  const openVisit = !visitId
    ? clinicVisits.filter((v) => v.childId === child.id && v.status === 'active').sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
    : undefined;
  const resume = (v: ClinicVisit) => {
    setVisitId(v.id);
    setStep('wrap');
  };
  const discard = (v: ClinicVisit) => saveVisit({ ...v, status: 'cancelled', endedAt: new Date().toISOString() });

  const paramsFor = (p: PlanPick) => {
    const custom = p.customId ? child.customActivities?.find((a) => a.id === p.customId) : undefined;
    if (custom && !custom.adaptive) return { params: custom.params, fixed: true };
    return { params: child.tasks[p.taskId as TrainTaskId]?.params ?? BASE_PARAMS, fixed: false };
  };
  const titleOf = (p: { taskId: string; customId?: string; versionId?: string }) => planTitle(child, p, libraryVersions);
  const planMinutes = Math.max(
    1,
    Math.round(plan.reduce((t, p) => { const fam = libraryFamilyOf(p.taskId); return t + (fam ? FAMILY[fam].minutes / 2 : isTrain(p.taskId) ? minutesOf(p.taskId, paramsFor(p).params) : 0); }, 0)),
  );
  const ideas = goalIdeas(plan, child);

  // Focus games and Skill Builders play one after another.
  const play = (v: ClinicVisit) => openPlanStep(navigation, child.id, v.plan, { visitId: v.id });

  const startSession = () => {
    const v: ClinicVisit = {
      id: uid(),
      childId: child.id,
      startedAt: new Date().toISOString(),
      status: 'active',
      goal: goal.trim() || ideas[0] || '',
      plan: plan.map(({ taskId, customId, level, versionId }) => ({ taskId, ...(customId ? { customId } : {}), ...(level ? { level } : {}), ...(versionId ? { versionId } : {}) })),
      sessionIds: [],
      observations: [],
    };
    saveVisit(v);
    setVisitId(v.id);
    setStep('wrap');
    play(v);
  };

  const summary = visit ? summarizeVisit(visit, sessions, libraryPlays) : null;
  const playedAny = !!summary && summary.games.length > 0;
  const chosenHome = homeGames ?? visit?.plan.map((p) => p.taskId) ?? [];
  const nextDate = nextIn ? new Date(Date.now() + nextIn * DAY).toISOString().slice(0, 10) : undefined;

  const finish = async () => {
    if (!visit || !summary) return;
    const chosen = visit.plan.filter((p) => chosenHome.includes(p.taskId));
    // Skill Builders go home as assigned activities (unless the child already has that one).
    for (const p of chosen) {
      const fam = libraryFamilyOf(p.taskId);
      if (!fam || p.customId) continue;
      const has = child.customActivities?.some((a) => a.library?.family === fam && (a.library.versionId ?? '') === (p.versionId ?? ''));
      if (has) continue;
      const v = libraryVersions.find((x) => x.id === p.versionId);
      saveCustomActivity(
        child.id,
        libraryActivity(fam, p.level ?? 1, daysPerWeek, v?.instructions ?? '', child, v ? { name: v.name, heroes: v.heroes, scene: v.scene, custom: v.custom, autoLevel: v.autoLevel, versionId: v.id } : {}),
      );
    }
    const homePlan = {
      games: chosen.filter((p) => isTrain(p.taskId)).map(({ taskId, customId }) => ({ taskId, ...(customId ? { customId } : {}) })),
      minutesPerDay,
      daysPerWeek,
      setAt: new Date().toISOString(),
    };
    const rated = ratings.attention && ratings.engagement && ratings.calm ? ratings : undefined;
    saveVisit({
      ...visit,
      status: 'done',
      endedAt: new Date().toISOString(),
      goalResult,
      ...(rated ? { ratings: rated } : {}),
      note: note.trim() || undefined,
      nextVisit: nextDate,
      nextGoal: nextGoal.trim() || undefined,
      sentToParent: send,
    });
    if (chosen.length) updateChild(child.id, { homePlan, homeSessionsPerWeek: daysPerWeek });
    setStep('done');
    if (!send) return;
    const card: VisitCard = {
      type: 'visit',
      date: visit.startedAt.slice(0, 10),
      games: summary.games.length,
      minutes: Math.max(summary.games.length ? 1 : 0, summary.minutes),
      avgAccuracy: summary.avgAccuracy,
      ...(visit.goal ? { goal: visit.goal.slice(0, 200) } : {}),
      ...(goalResult ? { goalResult } : {}),
      ...(ratings.attention ? { attention: ratings.attention } : {}),
      ...(ratings.engagement ? { engagement: ratings.engagement } : {}),
      ...(ratings.calm ? { calm: ratings.calm } : {}),
      ...(note.trim() ? { therapistNote: note.trim().slice(0, 200) } : {}),
      homeGames: chosen.map((g) => g.taskId).slice(0, 8),
      homeMinutes: minutesPerDay,
      homeDays: daysPerWeek,
      ...(nextDate ? { nextVisit: nextDate } : {}),
      ...(nextGoal.trim() ? { nextGoal: nextGoal.trim().slice(0, 200) } : {}),
    };
    setSendState('sending');
    try {
      await postToConversation(child.id, 'therapist', { text: '', card });
      setSendState('sent');
    } catch {
      setSendState('error');
    }
  };

  const stepIndex = step === 'wrap' && !playedAny && !skipPlay ? 2 : STEP_AT[step];

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="x" label="Close clinic session" bg={colors.card} onPress={() => navigation.goBack()} />
        <Avatar name={child.name} color={child.color} photo={child.photo} emoji={child.avatarEmoji} size={48} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T.Eyebrow style={{ marginBottom: 0 }}>{t('Clinic session')}</T.Eyebrow>
          <Text style={styles.name} numberOfLines={1}>
            {child.name} · {child.age} yrs
          </Text>
        </View>
      </View>

      <View style={styles.stepper}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepDot, i < stepIndex && styles.stepDone, i === stepIndex && styles.stepNow]}>
              {i < stepIndex ? <Feather name="check" size={12} color={colors.white} /> : <Text style={[styles.stepNum, i === stepIndex && { color: colors.forestDeep }]}>{i + 1}</Text>}
            </View>
            <Text style={[styles.stepLabel, i === stepIndex && { color: colors.ink, fontFamily: font.bold }]}>{label}</Text>
          </View>
        ))}
      </View>

      {step === 'brief' && openVisit && (
        <View style={styles.resume}>
          <View style={styles.resumeIcon}>
            <Feather name="play-circle" size={22} color={colors.forest} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{t('Session in progress')}</Text>
            <Text style={styles.muted}>
              Started {new Date(openVisit.startedAt).toLocaleTimeString(dateLocale(), { hour: '2-digit', minute: '2-digit' })} · {relativeDay(openVisit.startedAt).toLowerCase()} · {summarizeVisit(openVisit, sessions, libraryPlays).games.length} played
            </Text>
            <View style={[styles.row, { gap: 8, marginTop: 10 }]}>
              <Pressable onPress={() => resume(openVisit)} style={[styles.resumeBtn, { backgroundColor: colors.forest }]} accessibilityRole="button">
                <Text style={[styles.resumeText, { color: colors.white }]}>{t('Resume')}</Text>
              </Pressable>
              <Pressable onPress={() => discard(openVisit)} style={styles.resumeBtn} accessibilityRole="button">
                <Text style={styles.resumeText}>{t('Start new')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {step === 'brief' && (
        <>
          <T.H1 style={{ marginTop: 22 }}>{t('Since last visit')}</T.H1>
          <T.Body style={{ marginTop: 4 }}>
            {brief.lastVisit
              ? `Last visit ${fullDate(brief.lastVisit.startedAt)} · ${brief.days} day${brief.days === 1 ? '' : 's'} ago`
              : 'No clinic visit logged yet · showing the last 7 days'}
          </T.Body>

          {brief.alerts.length > 0 && (
            <View style={styles.alerts}>
              {brief.alerts.map((a, i) => (
                <View key={i} style={[styles.alert, a.tone === 'warn' ? styles.alertWarn : styles.alertInfo]}>
                  <Feather name={a.tone === 'warn' ? 'alert-triangle' : 'info'} size={16} color={a.tone === 'warn' ? colors.danger : colors.forest} />
                  <Text style={styles.alertText}>{a.text}</Text>
                </View>
              ))}
            </View>
          )}

          {brief.lastVisit && (brief.lastVisit.nextGoal || brief.lastVisit.goal) && (
            <Card style={styles.section}>
              <Text style={styles.kicker}>{t('🎯 GOAL FROM LAST VISIT')}</Text>
              <Text style={styles.big}>{brief.lastVisit.nextGoal || brief.lastVisit.goal}</Text>
              {!!brief.lastVisit.note && <Text style={styles.muted}>“{brief.lastVisit.note}”</Text>}
            </Card>
          )}

          <Card style={styles.section}>
            <Text style={styles.kicker}>{t('🏠 HOME PRACTICE')}</Text>
            <Text style={styles.big}>
              {brief.homeDays} day{brief.homeDays === 1 ? '' : 's'} · {brief.homeMinutes} min
            </Text>
            <Text style={styles.muted}>{brief.lastPractised ? `Last practised ${relativeDay(brief.lastPractised).toLowerCase()}` : 'No home practice yet'}</Text>
            <View style={styles.weekRow}>
              {brief.week.map((d) => (
                <View key={d.date} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={[styles.weekDot, d.practised && styles.weekDotOn]}>{d.practised && <Feather name="check" size={12} color={colors.white} />}</View>
                  <Text style={styles.weekLabel}>{dayLabel(d.date)}</Text>
                </View>
              ))}
            </View>
            {child.homePlan && (
              <Text style={[styles.muted, { marginTop: 10 }]}>
                Plan: {child.homePlan.daysPerWeek}× a week · {child.homePlan.minutesPerDay} min · {child.homePlan.games.map(titleOf).join(', ')}
              </Text>
            )}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.kicker}>{t('💛 FEELINGS CHECK-INS')}</Text>
            {brief.feelings.length ? (
              <View style={styles.chipRow}>
                {brief.feelings.map((f) => (
                  <View key={f.feeling} style={[styles.feelChip, ['tired', 'worried', 'grumpy'].includes(f.feeling) && { backgroundColor: colors.warm }]}>
                    <Text style={{ fontSize: 18 }}>{FEELING_EMOJI[f.feeling]}</Text>
                    <Text style={styles.feelText}>
                      {f.feeling} ×{f.count}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>{first} hasn’t used the start flow since then.</Text>
            )}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.kicker}>{t('📈 SKILL TRENDS')}</Text>
            {brief.trends.length ? (
              brief.trends.slice(0, 5).map((t) => {
                const g = TRAIN_BY_ID[t.taskId];
                const up = (t.delta ?? 0) >= 0.03;
                const down = (t.delta ?? 0) <= -0.03;
                return (
                  <View key={t.taskId} style={styles.trendRow}>
                    <Text style={{ fontSize: 20 }}>{g.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{g.title}</Text>
                      <Text style={styles.muted}>
                        {g.skill} · {t.plays} play{t.plays === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text style={styles.trendNow}>{pct(t.now)}</Text>
                    <View style={[styles.delta, up && { backgroundColor: colors.mint }, down && { backgroundColor: colors.warm }]}>
                      <Feather name={up ? 'trending-up' : down ? 'trending-down' : 'minus'} size={13} color={down ? colors.danger : colors.forest} />
                      <Text style={[styles.deltaText, down && { color: colors.danger }]}>
                        {t.delta === null ? 'new' : `${t.delta >= 0 ? '+' : ''}${Math.round(t.delta * 100)}%`}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.muted}>{t('No games played since then.')}</Text>
            )}
          </Card>

          {brief.builders.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.kicker}>{t('🧩 SKILL BUILDERS AT HOME')}</Text>
              {brief.builders.slice(0, 4).map((b) => {
                const fam = FAMILY[b.family];
                return (
                  <View key={b.family} style={styles.trendRow}>
                    <Image source={LIBRARY_ART[b.family]} style={{ width: 26, height: 26 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{fam.name}</Text>
                      <Text style={styles.muted}>
                        {b.plays} go{b.plays === 1 ? '' : 'es'}
                        {b.easy ? ` · 😄 ${b.easy} easy` : ''}
                        {b.hard ? ` · 😓 ${b.hard} hard` : ''}
                      </Text>
                    </View>
                    {b.avg !== null && <Text style={styles.trendNow}>{pct(b.avg)}</Text>}
                  </View>
                );
              })}
            </Card>
          )}

          <Card style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.kicker}>💬 FROM {parent.toUpperCase()}</Text>
              {brief.unread > 0 && <Text style={styles.unread}>{brief.unread} unread</Text>}
            </View>
            {brief.parentNotes.length ? (
              brief.parentNotes.slice(0, 3).map((n) => (
                <View key={n.id} style={styles.noteRow}>
                  <Text style={styles.muted}>{relativeDay(n.createdAt)}</Text>
                  <Text style={styles.noteText} numberOfLines={2}>
                    {noteSummary(n)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.muted}>{t('No new messages.')}</Text>
            )}
            <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Notes', params: { childId: child.id } })} style={styles.link} accessibilityRole="button">
              <Text style={styles.linkText}>{t('Open conversation')}</Text>
              <Feather name={flipIcon('arrow-right')} size={15} color={colors.forest} />
            </Pressable>
          </Card>

          <Button label="Plan today’s session" icon="arrow-right" onPress={() => setStep('plan')} style={{ marginTop: 22 }} />
        </>
      )}

      {step === 'plan' && (
        <>
          <T.H1 style={{ marginTop: 22 }}>{t('Today’s plan')}</T.H1>
          <T.Body style={{ marginTop: 4 }}>Suggested from {first}’s trends and profile. Change anything you like.</T.Body>

          <Card style={styles.section}>
            <Text style={styles.kicker}>{t('🎯 ONE GOAL FOR TODAY')}</Text>
            <TextInput value={goal} onChangeText={setGoal} placeholder={ideas[0] ?? 'e.g. Finish every game without a break'} placeholderTextColor={colors.inkMuted} style={styles.input} maxLength={160} />
            <View style={styles.chipRow}>
              {ideas.map((g) => (
                <Pressable key={g} onPress={() => setGoal(g)} style={[styles.ideaChip, goal === g && styles.ideaOn]} accessibilityRole="button">
                  <Text style={[styles.ideaText, goal === g && { color: colors.white }]}>{g}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Text style={[styles.kicker, { marginTop: 22, marginBottom: 10 }]}>
            🎮 GAMES · {plan.length} · ABOUT {planMinutes} MIN
          </Text>
          <View style={{ gap: 10 }}>
            {plan.map((p, i) => {
              const fam = libraryFamilyOf(p.taskId);
              const move = () => setPlan((xs) => { const c = [...xs]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; });
              const remove = () => setPlan((xs) => xs.filter((_, k) => k !== i));
              if (fam) {
                const lf = FAMILY[fam];
                const lv = p.level ?? 1;
                const setLv = (n: number) => setPlan((xs) => xs.map((x, k) => (k === i ? { ...x, level: Math.min(3, Math.max(1, n)) } : x)));
                return (
                  <Card key={`${p.taskId}-${i}`} style={styles.planRow}>
                    <View style={[styles.planIcon, { backgroundColor: lf.tint }]}>
                      <Image source={LIBRARY_ART[fam]} style={{ width: 34, height: 34 }} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {titleOf(p)}
                      </Text>
                      <Text style={styles.muted} numberOfLines={1}>
                        Skill Builder · {LEVEL_NAMES[lv - 1]}
                      </Text>
                      <Text style={styles.why} numberOfLines={2}>
                        {p.why}
                      </Text>
                    </View>
                    <View style={{ gap: 6, alignItems: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {i > 0 && <SmallBtn icon="arrow-up" label="Move up" onPress={move} />}
                        <SmallBtn icon="x" label="Remove" onPress={remove} />
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <SmallBtn icon="minus" label="Easier" onPress={() => setLv(lv - 1)} />
                        <SmallBtn icon="plus" label="Harder" onPress={() => setLv(lv + 1)} />
                      </View>
                    </View>
                  </Card>
                );
              }
              const g = TRAIN_BY_ID[p.taskId as TrainTaskId];
              const { params, fixed } = paramsFor(p);
              return (
                <Card key={`${p.taskId}-${i}`} style={styles.planRow}>
                  <View style={[styles.planIcon, { backgroundColor: g.tint }]}>
                    <Text style={{ fontSize: 24 }}>{g.icon}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {titleOf(p)}
                    </Text>
                    <Text style={styles.muted} numberOfLines={1}>
                      {g.skill} · Level {levelOf(g.id, params)}
                      {fixed ? ' · fixed' : ''}
                    </Text>
                    <Text style={styles.why} numberOfLines={2}>
                      {p.why}
                    </Text>
                  </View>
                  <View style={{ gap: 6, alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {i > 0 && <SmallBtn icon="arrow-up" label="Move up" onPress={move} />}
                      <SmallBtn icon="x" label="Remove" onPress={remove} />
                    </View>
                    {!fixed && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <SmallBtn icon="minus" label="Easier" onPress={() => setTaskParam(child.id, g.id, g.adapts, nudgeParams(g.id, params, -1)[g.adapts])} />
                        <SmallBtn icon="plus" label="Harder" onPress={() => setTaskParam(child.id, g.id, g.adapts, nudgeParams(g.id, params, 1)[g.adapts])} />
                      </View>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>

          {plan.length < 6 && (
            <>
              <View style={[styles.row, { marginTop: 16, marginBottom: 8, gap: 6 }]}>
                <Text style={[styles.muted, { flex: 1 }]}>{t('Add a game')}</Text>
                {(['focus', 'builders'] as const).map((k) => (
                  <Pressable key={k} onPress={() => setAddFrom(k)} style={[styles.miniTab, addFrom === k && styles.miniTabOn]} accessibilityRole="tab" accessibilityState={{ selected: addFrom === k }}>
                    <Text style={[styles.miniTabText, addFrom === k && { color: colors.white }]}>{k === 'focus' ? 'Focus games' : 'Skill Builders'}</Text>
                  </Pressable>
                ))}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {addFrom === 'focus'
                  ? TRAIN_IDS.filter((id) => !plan.some((p) => p.taskId === id)).map((id) => (
                      <Pressable key={id} onPress={() => setPlan((xs) => [...xs, { taskId: id, why: 'Added by you' }])} style={styles.addChip} accessibilityRole="button">
                        <Text>{TRAIN_BY_ID[id].icon}</Text>
                        <Text style={styles.addText}>{TRAIN_BY_ID[id].title}</Text>
                      </Pressable>
                    ))
                  : [
                      // Your saved versions first, then the built-in Skill Builders that play in the app.
                      ...libraryVersions
                        .filter((v) => isLibraryFamily(v.family) && FAMILY[v.family].mode === 'app')
                        .map((v) => ({ key: v.id, fam: v.family as keyof typeof FAMILY, label: `⭐ ${v.name}`, item: { taskId: `library-${v.family}`, level: v.level, versionId: v.id, why: 'Your saved version' } })),
                      ...LIBRARY.filter((f) => f.mode === 'app').map((f) => ({
                        key: f.id,
                        fam: f.id,
                        label: f.name,
                        item: { taskId: `library-${f.id}`, level: startLevel(f, child.cognitiveAge ?? child.age, false), why: 'Added by you' },
                      })),
                    ].map((o) => (
                      <Pressable key={o.key} onPress={() => setPlan((xs) => [...xs, o.item])} style={styles.addChip} accessibilityRole="button">
                        <Image source={LIBRARY_ART[o.fam]} style={{ width: 20, height: 20 }} />
                        <Text style={styles.addText}>{o.label}</Text>
                      </Pressable>
                    ))}
              </ScrollView>
            </>
          )}

          <Card style={styles.section}>
            <Text style={styles.kicker}>{t('🦸 HEROES & SETTINGS')}</Text>
            <View style={[styles.chipRow, { alignItems: 'center' }]}>
              {heroes.length ? heroes.map((h) => <HeroSticker key={h.id ?? h.name} hero={h} size={48} />) : <Text style={styles.muted}>{t('No favourite heroes yet.')}</Text>}
              <Pressable onPress={() => navigation.navigate('EditChild', { childId: child.id })} style={styles.link} accessibilityRole="button">
                <Text style={styles.linkText}>{t('Edit')}</Text>
              </Pressable>
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{t('Calm mode')}</Text>
                <Text style={styles.muted}>{t('Softer feedback and a slower pace for sensitive days')}</Text>
              </View>
              <Switch value={calmMode} onValueChange={(v) => setPrefs({ calmMode: v })} trackColor={{ true: colors.leaf, false: colors.border }} />
            </View>
          </Card>

          <Button label={`Start session · ${plan.length} game${plan.length === 1 ? '' : 's'} · ~${planMinutes} min`} icon="play" disabled={!plan.length} onPress={startSession} style={{ marginTop: 22 }} />
          <Button label="Back to briefing" variant="ghost" onPress={() => setStep('brief')} style={{ marginTop: 6 }} />
        </>
      )}

      {step === 'wrap' && visit && summary && (
        <>
          <T.H1 style={{ marginTop: 22 }}>{playedAny || skipPlay ? 'Wrap-up' : 'Play'}</T.H1>
          <T.Body style={{ marginTop: 4 }}>{visit.goal ? `Goal: ${visit.goal}` : 'How did it go?'}</T.Body>

          {!playedAny && !skipPlay ? (
            <Card style={styles.section}>
              <Text style={styles.kicker}>🎮 READY TO PLAY · {visit.plan.length} GAME{visit.plan.length === 1 ? '' : 'S'}</Text>
              {visit.plan.map((p, i) => {
                const fam = libraryFamilyOf(p.taskId);
                return (
                  <View key={`${p.taskId}-${i}`} style={styles.readyRow}>
                    <Text style={styles.readyNum}>{i + 1}</Text>
                    {fam ? <Image source={LIBRARY_ART[fam]} style={{ width: 24, height: 24 }} /> : <Text style={{ fontSize: 20 }}>{isTrain(p.taskId) ? TRAIN_BY_ID[p.taskId].icon : '🎯'}</Text>}
                    <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>
                      {titleOf(p)}
                    </Text>
                  </View>
                );
              })}
              <Button label="Play the games" icon="play" onPress={() => play(visit)} style={{ marginTop: 6 }} />
              <Pressable onPress={() => setSkipPlay(true)} style={[styles.link, { alignSelf: 'center' }]} accessibilityRole="button">
                <Text style={styles.linkText}>{t('Wrap up without games')}</Text>
              </Pressable>
            </Card>
          ) : (
          <>
          <View style={styles.statRow}>
            <Stat value={String(summary.games.length)} label="Games" />
            <Stat value={formatDuration(summary.seconds)} label="Focus time" />
            <Stat value={pct(summary.avgAccuracy)} label="Accuracy" />
          </View>
          {summary.games.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.kicker}>{t('🎮 GAMES PLAYED')}</Text>
              {summary.games.map((g) => {
                const tags = visit.observations.filter((o) => o.taskId === g.taskId);
                const planItem = visit.plan.find((p) => p.taskId === g.taskId);
                return (
                  <View key={g.key} style={styles.trendRow}>
                    {g.family ? <Image source={LIBRARY_ART[g.family]} style={{ width: 26, height: 26 }} /> : <Text style={{ fontSize: 20 }}>{isTrain(g.taskId) ? TRAIN_BY_ID[g.taskId].icon : '🎯'}</Text>}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{titleOf(planItem ?? { taskId: g.taskId })}</Text>
                      <Text style={styles.muted} numberOfLines={2}>
                        {g.detail}
                        {tags.length ? ` · ${tags.map((o) => (o.tag === 'note' ? `📝 ${o.note}` : CLINIC_TAGS.find((t) => t.id === o.tag)?.emoji)).join(' ')}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.trendNow}>{pct(g.accuracy)}</Text>
                  </View>
                );
              })}
              {summary.tagCounts.length > 0 && (
                <View style={[styles.chipRow, { marginTop: 10 }]}>
                  {summary.tagCounts.map((t) => {
                    const tag = CLINIC_TAGS.find((x) => x.id === t.tag)!;
                    return (
                      <View key={t.tag} style={[styles.feelChip, tag.tone === 'watch' && { backgroundColor: colors.warm }]}>
                        <Text>{tag.emoji}</Text>
                        <Text style={styles.feelText}>
                          {tag.label} ×{t.count}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          )}

          {!!visit.goal && (
            <Card style={styles.section}>
              <Text style={styles.kicker}>{t('🎯 TODAY’S GOAL')}</Text>
              <Text style={styles.big}>{visit.goal}</Text>
              <View style={styles.segment}>
                {GOAL_RESULTS.map((g) => (
                  <Pressable key={g.id} onPress={() => setGoalResult(g.id)} style={[styles.segBtn, goalResult === g.id && styles.segOn]} accessibilityRole="button" accessibilityState={{ selected: goalResult === g.id }}>
                    <Text style={[styles.segText, goalResult === g.id && { color: colors.white }]}>
                      {g.emoji} {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          )}

          <Card style={styles.section}>
            <Text style={styles.kicker}>{t('📝 YOUR OBSERVATIONS')}</Text>
            {RATINGS.map((r) => (
              <View key={r.key} style={styles.ratingRow}>
                <Text style={[styles.rowTitle, { flex: 1, marginRight: 8 }]}>{r.label}</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setRatings((x) => ({ ...x, [r.key]: n }))}
                      style={[styles.rateBtn, ratings[r.key] >= n && styles.rateOn]}
                      accessibilityLabel={`${r.label} ${n} of 5`}
                    >
                      <Text style={[styles.rateText, ratings[r.key] >= n && { color: colors.white }]}>{n}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={`What stood out today? (shared with ${parent})`}
              placeholderTextColor={colors.inkMuted}
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
              multiline
              maxLength={200}
            />
          </Card>

          <Card style={styles.section}>
            <Text style={styles.kicker}>{t('🏠 HOME PLAN FOR THE WEEK')}</Text>
            <Text style={styles.muted}>These games lead {first}’s “Today’s training” at home.</Text>
            <View style={[styles.chipRow, { marginTop: 10 }]}>
              {visit.plan.map((p) => {
                const on = chosenHome.includes(p.taskId);
                return (
                  <Pressable
                    key={p.taskId}
                    onPress={() => setHomeGames(on ? chosenHome.filter((x) => x !== p.taskId) : [...chosenHome, p.taskId])}
                    style={[styles.ideaChip, on && styles.ideaOn]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                  >
                    <Text style={[styles.ideaText, on && { color: colors.white }]}>
                      {on ? '✓ ' : ''}
                      {titleOf(p)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.rowTitle, { marginTop: 14 }]}>{t('Minutes a day')}</Text>
            <View style={styles.segment}>
              {[5, 10, 15].map((m) => (
                <Pressable key={m} onPress={() => setMinutesPerDay(m)} style={[styles.segBtn, minutesPerDay === m && styles.segOn]}>
                  <Text style={[styles.segText, minutesPerDay === m && { color: colors.white }]}>{m} min</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.rowTitle, { marginTop: 12 }]}>{t('Days a week')}</Text>
            <View style={styles.segment}>
              {[3, 5, 7].map((d) => (
                <Pressable key={d} onPress={() => setDaysPerWeek(d)} style={[styles.segBtn, daysPerWeek === d && styles.segOn]}>
                  <Text style={[styles.segText, daysPerWeek === d && { color: colors.white }]}>{d === 7 ? 'Every day' : `${d}×`}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.kicker}>{t('📅 NEXT VISIT')}</Text>
            <View style={styles.segment}>
              {([7, 14, 0] as const).map((d) => (
                <Pressable key={d} onPress={() => setNextIn(d)} style={[styles.segBtn, nextIn === d && styles.segOn]}>
                  <Text style={[styles.segText, nextIn === d && { color: colors.white }]}>{d ? `In ${d / 7} week${d === 14 ? 's' : ''}` : 'Not set'}</Text>
                </Pressable>
              ))}
            </View>
            {nextDate && <Text style={[styles.muted, { marginTop: 8 }]}>{fullDate(nextDate)}</Text>}
            <TextInput value={nextGoal} onChangeText={setNextGoal} placeholder="Goal for next time" placeholderTextColor={colors.inkMuted} style={styles.input} maxLength={160} />
          </Card>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Send summary to {parent}</Text>
              <Text style={styles.muted}>{t('Posts a session card with the home plan in your private chat')}</Text>
            </View>
            <Switch value={send} onValueChange={setSend} trackColor={{ true: colors.leaf, false: colors.border }} />
          </View>

          <Button label={send ? `Finish & send to ${parent}` : 'Finish session'} icon="check" onPress={finish} style={{ marginTop: 18 }} />
          </>
          )}
        </>
      )}

      {step === 'done' && (
        <View style={styles.doneBox}>
          <Text style={{ fontSize: 56 }}>🌱</Text>
          <T.H1 style={{ textAlign: 'center', marginTop: 10 }}>{t('Session saved')}</T.H1>
          <T.Body style={{ textAlign: 'center', marginTop: 6 }}>
            {first}’s home plan is updated
            {send
              ? sendState === 'sent'
                ? ` and the summary is in ${parent}’s chat.`
                : sendState === 'error'
                  ? `, but the summary couldn’t be sent. Try again from Messages.`
                  : '. Sending the summary…'
              : '.'}
          </T.Body>
          {nextDate && <Text style={[styles.muted, { marginTop: 8 }]}>Next visit {fullDate(nextDate)}</Text>}
          <Button label="Back to Today" icon="home" onPress={() => navigation.navigate('Tabs', { screen: 'Today' })} style={{ alignSelf: 'stretch', marginTop: 24 }} />
          {send && (
            <Button
              label={`Open chat with ${parent}`}
              icon="message-circle"
              variant="soft"
              onPress={() => navigation.navigate('Tabs', { screen: 'Notes', params: { childId: child.id } })}
              style={{ alignSelf: 'stretch', marginTop: 10 }}
            />
          )}
          <Button label="View profile" variant="ghost" onPress={() => navigation.navigate('ChildProfile', { childId: child.id })} style={{ alignSelf: 'stretch', marginTop: 4 }} />
          <Text style={[styles.muted, { marginTop: 8 }]}>Saved {shortDate(new Date().toISOString())}</Text>
        </View>
      )}
    </Screen>
  );
}

function SmallBtn({ icon, label, onPress }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.small} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}>
      <Feather name={icon} size={14} color={colors.forest} />
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  resume: { flexDirection: 'row', gap: 12, marginTop: 16, padding: 14, borderRadius: 20, backgroundColor: colors.warm, borderWidth: 1, borderColor: '#F2D78A' },
  resumeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  resumeBtn: { paddingHorizontal: 16, height: 36, borderRadius: 12, backgroundColor: colors.card, justifyContent: 'center' },
  resumeText: { fontFamily: font.bold, fontSize: 14, color: colors.forest },
  miniTab: { paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: colors.sage, justifyContent: 'center' },
  miniTabOn: { backgroundColor: colors.forest },
  miniTabText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.forest },
  readyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  readyNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.sage, textAlign: 'center', lineHeight: 22, fontFamily: font.bold, fontSize: 12, color: colors.forest, overflow: 'hidden' },
  name: { fontFamily: font.bold, fontSize: 19, color: colors.ink, marginTop: 2 },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 8 },
  stepItem: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  stepNow: { backgroundColor: colors.lime },
  stepDone: { backgroundColor: colors.forest },
  stepNum: { fontFamily: font.bold, fontSize: 12, color: colors.inkSoft },
  stepLabel: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },
  section: { marginTop: 14, gap: 8 },
  kicker: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.2, color: colors.inkSoft },
  big: { fontFamily: font.bold, fontSize: 18, color: colors.ink, lineHeight: 24 },
  muted: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, lineHeight: 18 },
  why: { fontFamily: font.medium, fontSize: 12, color: colors.forest, marginTop: 2 },
  alerts: { gap: 8, marginTop: 16 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  alertWarn: { backgroundColor: colors.warm },
  alertInfo: { backgroundColor: colors.sage },
  alertText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.ink },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  weekDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  weekDotOn: { backgroundColor: colors.leaf },
  weekLabel: { fontFamily: font.medium, fontSize: 11, color: colors.inkMuted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.mint, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  feelText: { fontFamily: font.semibold, fontSize: 13, color: colors.ink, textTransform: 'capitalize' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  rowTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  trendNow: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.sage, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, minWidth: 62, justifyContent: 'center' },
  deltaText: { fontFamily: font.bold, fontSize: 12, color: colors.forest },
  unread: { fontFamily: font.bold, fontSize: 12, color: colors.white, backgroundColor: colors.forest, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  noteRow: { gap: 2, paddingVertical: 4 },
  noteText: { fontFamily: font.medium, fontSize: 14, color: colors.ink },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  linkText: { fontFamily: font.semibold, fontSize: 14, color: colors.forest },
  input: {
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.ink,
  },
  ideaChip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.sage },
  ideaOn: { backgroundColor: colors.forest },
  ideaText: { fontFamily: font.medium, fontSize: 13, color: colors.forest },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  planIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  small: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  addChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: colors.border },
  addText: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  statValue: { fontFamily: font.heavy, fontSize: 22, color: colors.ink },
  statLabel: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  segment: { flexDirection: 'row', gap: 8, marginTop: 6 },
  segBtn: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.forest },
  segText: { fontFamily: font.semibold, fontSize: 13, color: colors.forest },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  rateBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  rateOn: { backgroundColor: colors.forest },
  rateText: { fontFamily: font.bold, fontSize: 13, color: colors.forest },
  doneBox: { alignItems: 'center', marginTop: 40, paddingHorizontal: 8 },
});
