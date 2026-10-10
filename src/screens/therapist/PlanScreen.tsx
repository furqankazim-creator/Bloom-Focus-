import { useVisibleChildren } from '../../store/useTeam';
import { t } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar, Button, Screen, T, TaskIcon, flipIcon } from '../../components/ui';
import { taskLevel } from '../../engine/adaptive';
import { BASE_PARAMS, DOMAIN_LABEL, TASKS, TASK_ORDER } from '../../engine/tasks';
import type { Domain, TaskId } from '../../types';
import type { TabParamList } from '../../navigation/types';
import { FAMILY, LEVEL_NAMES, LIBRARY, MODE_INFO, isLibraryFamily } from '../../library/catalog';
import { ScheduleEditor } from '../../components/ScheduleEditor';
import { MonthPlanEditor } from '../../components/MonthPlanEditor';
import { isDueToday, scheduleLabel } from '../../engine/schedule';
import { LIBRARY_ART } from '../../library/art';
import { useStore } from '../../store/useStore';
import { colors, font } from '../../theme';
import { firstName, relativeDay, shortDate } from '../helpers';
import { planSession } from '../../engine/scheduler';
import { BAND_LABEL, personalize, type Suggestion } from '../../engine/personalize';
import { TRAIN_BY_ID, type TrainTaskId } from '../../engine/trainTasks';
import { TEMPLATE } from '../../engine/studio';
import { HeroSticker } from '../../components/hero/HeroSticker';
import { uid } from '../../store/seed';
import type { CustomActivity, Dim } from '../../types';

export default function PlanScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteProp<TabParamList, 'Plan'>>();
  const children = useVisibleChildren();
  const updateChild = useStore((s) => s.updateChild);
  const setTaskEnabled = useStore((s) => s.setTaskEnabled);
  const setTaskParam = useStore((s) => s.setTaskParam);
  const setPrefs = useStore((s) => s.setPrefs);
  const calmMode = useStore((s) => s.calmMode);
  const sessions = useStore((s) => s.sessions);
  const [applied, setApplied] = useState<string | null>(null);
  const [childId, setChildId] = useState(route.params?.childId ?? children[0]?.id);
  const child = children.find((c) => c.id === childId) ?? children[0];
  const [homeNote, setHomeNote] = useState(child?.homeNote ?? '');
  const saveCustomActivity = useStore((s) => s.saveCustomActivity);

  // Which activity is showing its "Copy to…" child picker.
  const [copyFor, setCopyFor] = useState<string | null>(null);
  // Which assigned activity has its day picker open.
  const [daysFor, setDaysFor] = useState<string | null>(null);
  const [tab, setTab] = useState<'home' | 'month' | 'session' | 'tips'>('home');
  // Session activity whose description is open.
  const [openInfo, setOpenInfo] = useState<TaskId | null>(null);
  const studioPlays = useStore((s) => s.studioPlays);
  const libraryPlays = useStore((s) => s.libraryPlays);

  /** Gives another child their own copy (own id, level and progress). */
  const copyTo = (a: CustomActivity, targetId: string) => {
    const t = children.find((c) => c.id === targetId);
    if (!t) return;
    saveCustomActivity(t.id, {
      ...a,
      id: uid(),
      createdAt: new Date().toISOString(),
      ...(a.studio ? { studio: { ...a.studio, streak: 0 } } : {}),
    });
    setCopyFor(null);
    setApplied(`Copied “${a.name}” to ${firstName(t.name)}`);
    setTimeout(() => setApplied(null), 2500);
  };

  useEffect(() => {
    if (route.params?.childId) setChildId(route.params.childId);
  }, [route.params?.childId]);
  useEffect(() => setHomeNote(child?.homeNote ?? ''), [child?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!child) {
    return (
      <Screen>
        <T.Display>{t('Activity plan')}</T.Display>
        <T.Body style={{ marginVertical: 12 }}>{t('Add a child first, then shape their plan here.')}</T.Body>
        <Button label="Add a child" icon="plus" onPress={() => nav.navigate('EditChild', {})} />
      </Screen>
    );
  }

  const first = firstName(child.name);
  const plan = personalize(child, calmMode);
  const hasProfile = child.iqScore != null || child.cognitiveAge != null || !!child.diagnosis?.length || !!child.favouriteCharacters?.length || !!child.communicationStyle;
  const customs = child.customActivities ?? [];
  const weekStart = Date.now() - 7 * 86_400_000;
  const playedThisWeek = (taskId: string) =>
    sessions.filter((s) => s.childId === child.id && Date.parse(s.startedAt) > weekStart && s.blocks.some((b) => b.taskId === taskId)).length;

  const apply = (s: Suggestion) => {
    const c = s.change;
    if (!c) return;
    if (c.childPatch) updateChild(child.id, c.childPatch);
    if (c.calmMode) setPrefs({ calmMode: true });
    for (const [id, patch] of Object.entries(c.params ?? {}) as [TrainTaskId, Partial<Record<Dim, number>>][]) {
      for (const [dim, value] of Object.entries(patch) as [Dim, number][]) setTaskParam(child.id, id, dim, value);
    }
    setApplied(`Applied: ${s.title}`);
    setTimeout(() => setApplied(null), 2500);
  };

  const enabledCount = TASK_ORDER.filter((id) => child.tasks[id]?.enabled && TASKS[id].scored).length;
  const actionable = plan.suggestions.filter((s) => s.change || s.games).length;
  // Session activities grouped by skill, in the engine's order.
  const groups = TASK_ORDER.reduce<{ domain: Domain; ids: TaskId[] }[]>((acc, id) => {
    const d = TASKS[id].domain;
    const g = acc.find((x) => x.domain === d);
    if (g) g.ids.push(id);
    else acc.push({ domain: d, ids: [id] });
    return acc;
  }, []);
  const saveNote = () => updateChild(child.id, { homeNote: homeNote.trim() });

  // Dates: "Today", "Yesterday", "3 days ago", then "28 Sep".
  const when = (iso: string) => relativeDay(iso);
  const playedText = (iso?: string) => {
    if (!iso) return 'Not played yet';
    const w = when(iso);
    return `Played ${w === t('Today') || w === t('Yesterday') ? w.toLowerCase() : w}`;
  };
  const mineSessions = sessions.filter((s) => s.childId === child.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const lastSession = mineSessions.find((s) => s.kind !== 'baseline' && s.blocks.length > 1);
  const lastPlayed = (taskId: string) => mineSessions.find((s) => s.blocks.some((b) => b.taskId === taskId))?.startedAt;
  const lastStudioPlay = (activityId: string) =>
    studioPlays.filter((p) => p.activityId === activityId).sort((a, b) => b.playedAt.localeCompare(a.playedAt))[0]?.playedAt;
  const nextQueue = planSession(child, sessions, 'practice');
  const nextSkills = [...new Set(nextQueue.map((id) => TASKS[id].name))];

  return (
    <Screen>
      <T.Display style={{ fontSize: 30 }}>{t('Activity plan')}</T.Display>

      {/* Child picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childScroll} contentContainerStyle={styles.childRow}>
        {children.map((c) => {
          const on = c.id === child.id;
          return (
            <Pressable key={c.id} onPress={() => setChildId(c.id)} style={[styles.childChip, on && styles.childChipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Avatar name={c.name} color={c.color} photo={c.photo} emoji={c.avatarEmoji} size={30} />
              <Text style={[styles.childChipText, on && { color: colors.white }]}>{firstName(c.name)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([
          ['home', 'Home', customs.length],
          ['month', '4 weeks', child.monthPlan ? 4 : 0],
          ['session', 'Session', enabledCount],
          ['tips', 'Tips', actionable],
        ] as const).map(([id, label, count]) => {
          const on = tab === id;
          return (
            <Pressable key={id} onPress={() => setTab(id)} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{t(label)}</Text>
              {count > 0 && (
                <View style={[styles.count, on && styles.countOn]}>
                  <Text style={[styles.countText, on && { color: colors.forest }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {!!applied && (
        <View style={styles.toast}>
          <Feather name="check" size={14} color={colors.white} />
          <Text style={styles.toastText}>{applied}</Text>
        </View>
      )}

      {tab === 'home' && (
        <>
          <Text style={styles.lead}>{t('Activities {{name}} plays at home.', { name: first })}</Text>
          <Pressable onPress={() => nav.navigate('Library', { childId: child.id })} style={styles.addBtn} accessibilityRole="button" accessibilityLabel="Add an activity">
            <View style={styles.addArt}>
              {LIBRARY.slice(0, 3).map((f, i) => (
                <Image key={f.id} source={LIBRARY_ART[f.id]} style={[styles.libArtImg, { left: i * 18, zIndex: 3 - i }]} />
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addTitle}>{t('Add activity')}</Text>
              <Text style={styles.addHint}>{t('Pick by the child’s problem area')}</Text>
            </View>
            <View style={styles.addPlus}>
              <Feather name="plus" size={20} color={colors.forest} />
            </View>
          </Pressable>

          {actionable > 0 && (
            <Pressable onPress={() => setTab('tips')} style={styles.tipBanner} accessibilityRole="button">
              <Text style={{ fontSize: 16 }}>✨</Text>
              <Text style={styles.tipBannerText}>
                {actionable} personalised suggestion{actionable === 1 ? '' : 's'} for {first}
              </Text>
              <Feather name={flipIcon('chevron-right')} size={16} color={colors.forest} />
            </Pressable>
          )}

          <Text style={styles.sectionTitle}>Assigned to {first}</Text>
          {customs.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 28 }}>🌱</Text>
              <Text style={styles.emptyText}>{t('Nothing assigned yet. Tap “Add activity” to choose one.')}</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {customs.map((a, i) => {
                const g = TRAIN_BY_ID[a.taskId as TrainTaskId];
                // Studio games keep their own play log; Train-based activities count game sessions.
                const lib = a.library && isLibraryFamily(a.library.family) ? FAMILY[a.library.family] : null;
                const done = a.studio
                  ? studioPlays.filter((p) => p.activityId === a.id && Date.parse(p.playedAt) > weekStart).length
                  : lib
                    ? libraryPlays.filter((p) => p.activityId === a.id && Date.parse(p.playedAt) > weekStart).length
                    : playedThisWeek(a.taskId);
                const lastLib = lib ? libraryPlays.filter((p) => p.activityId === a.id).reduce<string | null>((t, p) => (!t || p.playedAt > t ? p.playedAt : t), null) : null;
                const meta = a.studio
                  ? TEMPLATE[a.studio.content.template]
                  : lib
                    ? { name: `${MODE_INFO[lib.mode].emoji} ${LEVEL_NAMES[(a.library?.level ?? 1) - 1]}`, tint: lib.tint, icon: lib.emoji }
                    : null;
                const goal = Math.max(1, a.timesPerWeek);
                const open = () =>
                  lib
                    ? nav.navigate('LibraryCustomise', { family: lib.id, childId: child.id, activityId: a.id })
                    : a.studio
                    ? nav.navigate('GameStudio', { childId: child.id, activityId: a.id })
                    : nav.navigate('ActivityBuilder', { childId: child.id, activityId: a.id });
                return (
                  <View key={a.id} style={i > 0 && styles.divider}>
                    <View style={styles.itemRow}>
                      <Pressable onPress={open} style={styles.itemMain} accessibilityRole="button" accessibilityLabel={`Edit ${a.name}`}>
                        {a.hero && !lib ? (
                          <HeroSticker hero={a.hero} size={46} />
                        ) : (
                          <View style={[styles.itemIcon, { backgroundColor: meta?.tint ?? g?.tint ?? colors.sage }]}>
                            {lib ? <Image source={LIBRARY_ART[lib.id]} style={{ width: 30, height: 30 }} /> : <Text style={{ fontSize: 22 }}>{meta?.icon ?? g?.icon ?? '🌱'}</Text>}
                          </View>
                        )}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={[styles.row, { gap: 6 }]}>
                            <Text style={[styles.itemTitle, { flexShrink: 1 }]} numberOfLines={1}>
                              {a.name}
                            </Text>
                            {isDueToday(a.days) && (
                              <View style={styles.todayBadge}>
                                <Text style={styles.todayText}>{t('Today')}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.itemMeta} numberOfLines={1}>
                            {meta ? meta.name : g?.title ?? 'Activity'} · {scheduleLabel(a.days, a.timesPerWeek)}
                          </Text>
                          <Text style={styles.itemDate} numberOfLines={1}>
                            {`Added ${shortDate(a.createdAt)} · ${playedText(a.studio ? lastStudioPlay(a.id) : lib ? lastLib ?? undefined : lastPlayed(a.taskId))}`}
                          </Text>
                          <View style={styles.progressRow}>
                            <View style={styles.track}>
                              <View style={[styles.fill, { width: `${Math.min(1, done / goal) * 100}%` }]} />
                            </View>
                            <Text style={[styles.progressText, done >= goal && { color: colors.forest }]}>
                              {done >= goal ? '✓ Done' : `${done}/${goal}`}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => { setDaysFor(daysFor === a.id ? null : a.id); setCopyFor(null); }}
                        style={[styles.iconBtn, daysFor === a.id && { backgroundColor: colors.forest }]}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Choose days for ${a.name}`}
                      >
                        <Feather name="calendar" size={15} color={daysFor === a.id ? colors.white : colors.forest} />
                      </Pressable>
                      <Pressable
                        onPress={() => { setCopyFor(copyFor === a.id ? null : a.id); setDaysFor(null); }}
                        style={[styles.iconBtn, copyFor === a.id && { backgroundColor: colors.forest }]}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Copy ${a.name} to another child`}
                      >
                        <Feather name="copy" size={15} color={copyFor === a.id ? colors.white : colors.forest} />
                      </Pressable>
                    </View>
                    {daysFor === a.id && (
                      <View style={styles.daysPanel}>
                        <ScheduleEditor
                          value={{ days: a.days ?? [], times: a.timesPerWeek }}
                          onChange={(v) => saveCustomActivity(child.id, { ...a, days: v.days.length ? v.days : undefined, timesPerWeek: v.times })}
                        />
                      </View>
                    )}
                    {copyFor === a.id && (
                      <View style={styles.copyRow}>
                        <Text style={styles.copyLabel}>{t('Copy to')}</Text>
                        {children
                          .filter((c) => c.id !== child.id)
                          .map((c) => (
                            <Pressable key={c.id} onPress={() => copyTo(a, c.id)} style={styles.copyChip} accessibilityRole="button" accessibilityLabel={`Copy to ${c.name}`}>
                              <Avatar name={c.name} color={c.color} photo={c.photo} emoji={c.avatarEmoji} size={22} />
                              <Text style={styles.copyChipText}>{firstName(c.name)}</Text>
                            </Pressable>
                          ))}
                        {children.length < 2 && <Text style={styles.copyLabel}>{t('Add another child first.')}</Text>}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          <Text style={styles.sectionTitle}>{t('Home routine')}</Text>
          <View style={styles.panel}>
            <Text style={styles.panelLabel}>{t('Sessions per week')}</Text>
            <View style={styles.pills}>
              {[0, 2, 3, 4, 5].map((n) => {
                const on = child.homeSessionsPerWeek === n;
                return (
                  <Pressable key={n} onPress={() => updateChild(child.id, { homeSessionsPerWeek: n })} style={[styles.pill, on && styles.pillOn]} accessibilityRole="button">
                    <Text style={[styles.pillText, on && { color: colors.white }]}>{n === 0 ? 'Off' : n}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.panelLabel, { marginTop: 16 }]}>{t('Note for parents')}</Text>
            <TextInput
              value={homeNote}
              onChangeText={setHomeNote}
              onEndEditing={saveNote}
              onBlur={saveNote}
              placeholder="e.g. Two short rounds after school, before screen time."
              placeholderTextColor={colors.inkMuted}
              multiline
              style={styles.input}
            />
          </View>
        </>
      )}

      {tab === 'month' && (
        <MonthPlanEditor
          child={child}
          sessions={sessions}
          onSave={(plan) => {
            updateChild(child.id, { monthPlan: plan });
            setApplied(plan ? t('4-week plan saved — the family will see it on Home') : t('4-week plan removed'));
            setTimeout(() => setApplied(null), 2600);
          }}
        />
      )}

      {tab === 'session' && (
        <>
          <View style={styles.explain}>
            <View style={styles.explainHead}>
              <Text style={{ fontSize: 20 }}>🎯</Text>
              <Text style={styles.explainTitle}>{t('What is a session?')}</Text>
            </View>
            <Text style={styles.explainText}>
              A guided practice run you start from Today or {first}’s profile (parents can start one at home too). It plays the activities ticked
              below back to back — weakest skill first — until the session length is used, adjusting the difficulty of each one as {first} plays.
            </Text>
            <View style={styles.explainFacts}>
              <View style={styles.fact}>
                <Text style={styles.factLabel}>{t('Last session')}</Text>
                <Text style={styles.factValue}>
                  {lastSession ? `${when(lastSession.startedAt)} · ${Math.max(1, Math.round(lastSession.activeSec / 60))} min` : 'None yet'}
                </Text>
              </View>
              <View style={styles.fact}>
                <Text style={styles.factLabel}>{t('Next session')}</Text>
                <Text style={styles.factValue} numberOfLines={2}>
                  {nextQueue.length ? `${nextQueue.length} rounds · ~${child.currentMinutes} min` : 'Tick an activity'}
                </Text>
              </View>
            </View>
            {nextSkills.length > 0 && <Text style={styles.explainHint} numberOfLines={2}>Up next: {nextSkills.slice(0, 4).join(', ')}{nextSkills.length > 4 ? '…' : ''}</Text>}
            <Pressable onPress={() => nav.navigate('Session', { childId: child.id })} disabled={!nextQueue.length} style={[styles.startBtn, !nextQueue.length && { opacity: 0.4 }]} accessibilityRole="button">
              <Feather name="play" size={16} color={colors.white} />
              <Text style={styles.startText}>{t('Start a session now')}</Text>
            </Pressable>
          </View>
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelLabel}>{t('Session length')}</Text>
              <Text style={styles.panelHint}>now {child.currentMinutes} min</Text>
            </View>
            <View style={styles.pills}>
              {[10, 15, 20].map((m) => {
                const on = child.sessionMinutes === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => updateChild(child.id, { sessionMinutes: m, currentMinutes: Math.min(child.currentMinutes, m) })}
                    style={[styles.pill, styles.pillWide, on && styles.pillOn]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.pillText, on && { color: colors.white }]}>{m} min</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.panelHint}>Grows a minute at a time while {first} stays engaged; eases back when attention slips.</Text>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('Activities')}</Text>
            <Text style={styles.sectionHint}>{enabledCount} selected</Text>
          </View>
          <View style={styles.list}>
            {groups.map((g, gi) => (
              <View key={g.domain} style={gi > 0 && styles.divider}>
                <Text style={styles.groupLabel}>{DOMAIN_LABEL[g.domain]}</Text>
                {g.ids.map((id) => {
                  const t = TASKS[id];
                  const state = child.tasks[id] ?? { enabled: false, params: { ...BASE_PARAMS, ...t.defaults }, locked: [], streak: 0 };
                  const on = state.enabled;
                  const ageOk = child.age >= t.ages[0] && child.age <= t.ages[1];
                  return (
                    <View key={id}>
                      <View style={styles.taskRow}>
                        <Pressable onPress={() => setTaskEnabled(child.id, id, !on)} style={styles.taskMain} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={t.name}>
                          <TaskIcon icon={t.icon} tint={t.tint} size={38} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.taskTitle} numberOfLines={1}>
                              {t.name}
                            </Text>
                            <Text style={[styles.itemMeta, !ageOk && { color: colors.danger }]} numberOfLines={1}>
                              {t.scored ? `Level ${taskLevel(t, state.params)} · ` : ''}
                              {playedText(lastPlayed(id))}
                              {ageOk ? '' : ` · Ages ${t.ages[0]}–${t.ages[1]}`}
                            </Text>
                          </View>
                          <View style={[styles.check, on && styles.checkOn]}>{on && <Feather name="check" size={15} color={colors.white} />}</View>
                        </Pressable>
                        <Pressable onPress={() => setOpenInfo(openInfo === id ? null : id)} hitSlop={8} style={styles.infoBtn} accessibilityRole="button" accessibilityLabel={`About ${t.name}`}>
                          <Feather name={openInfo === id ? 'chevron-up' : 'info'} size={16} color={colors.inkMuted} />
                        </Pressable>
                      </View>
                      {openInfo === id && <Text style={styles.taskInfo}>{t.description}</Text>}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
          <Button label="Fine-tune adaptive settings" icon="sliders" variant="soft" onPress={() => nav.navigate('Tuning', { childId: child.id })} style={{ marginTop: 16 }} />
        </>
      )}

      {tab === 'tips' && (
        <>
          <View style={styles.profileCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileTitle}>
                {BAND_LABEL[plan.band]} · working age {plan.effectiveAge}
              </Text>
              <Text style={styles.panelHint}>
                {hasProfile
                  ? child.favouriteCharacters?.length
                    ? `Favourites: ${child.favouriteCharacters.map((c) => c.emoji).join(' ')}`
                    : 'From the learning profile'
                  : `Add ${first}’s learning profile for tailored suggestions.`}
              </Text>
            </View>
            <Pressable onPress={() => nav.navigate('EditChild', { childId: child.id })} style={styles.smallBtn} accessibilityRole="button">
              <Text style={styles.smallBtnText}>{hasProfile ? 'Edit profile' : 'Add profile'}</Text>
            </Pressable>
          </View>
          <View style={styles.list}>
            {plan.suggestions.map((sg, i) => (
              <View key={sg.id} style={[styles.tipRow, i > 0 && styles.divider]}>
                <Text style={styles.tipIcon}>{sg.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskTitle}>{sg.title}</Text>
                  <Text style={styles.tipDetail}>{sg.detail}</Text>
                  <Text style={styles.tipWhy}>{sg.why}</Text>
                </View>
                {sg.change ? (
                  <Pressable onPress={() => apply(sg)} style={styles.smallBtn} accessibilityRole="button" accessibilityLabel={`Apply: ${sg.title}`}>
                    <Text style={styles.smallBtnText}>{t('Apply')}</Text>
                  </Pressable>
                ) : sg.games ? (
                  <Pressable onPress={() => nav.navigate('ActivityBuilder', { childId: child.id })} style={styles.smallBtn} accessibilityRole="button">
                    <Text style={styles.smallBtnText}>{t('Create')}</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  childScroll: { marginTop: 14, marginHorizontal: -20 },
  childRow: { gap: 8, paddingHorizontal: 20 },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 5, paddingRight: 14, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  childChipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  childChipText: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },

  tabs: { flexDirection: 'row', marginTop: 16, padding: 4, borderRadius: 16, backgroundColor: colors.sage },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 12 },
  tabOn: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  tabText: { fontFamily: font.semibold, fontSize: 14, color: colors.inkSoft },
  tabTextOn: { color: colors.ink },
  count: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  countOn: { backgroundColor: colors.mint },
  countText: { fontFamily: font.bold, fontSize: 11, color: colors.inkSoft },

  lead: { fontFamily: font.regular, fontSize: 14, color: colors.inkSoft, marginTop: 16, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 22, backgroundColor: colors.forest },
  addArt: { width: 72, height: 40 },
  addTitle: { fontFamily: font.bold, fontSize: 18, color: colors.white },
  addHint: { fontFamily: font.regular, fontSize: 12.5, color: '#CFE0D5', marginTop: 2 },
  addPlus: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  libBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, padding: 14, borderRadius: 20, backgroundColor: '#EEF3FF', borderWidth: 1, borderColor: '#D5E0FA' },
  libTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  libArt: { width: 72, height: 40 },
  libArtImg: { position: 'absolute', width: 36, height: 36, top: 2 },
  libHint: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  action: { flex: 1, padding: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: 2 },
  actionPrimary: { backgroundColor: colors.forest, borderColor: colors.forest },
  actionEmoji: { fontSize: 24, marginBottom: 6 },
  actionTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  actionHint: { fontFamily: font.regular, fontSize: 12, color: colors.inkSoft },

  tipBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 14, backgroundColor: colors.mint },
  tipBannerText: { flex: 1, fontFamily: font.semibold, fontSize: 13.5, color: colors.forest },

  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink, marginTop: 24, marginBottom: 10 },
  sectionHint: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft },
  list: { borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  empty: { alignItems: 'center', gap: 6, padding: 22, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  emptyText: { fontFamily: font.regular, fontSize: 13.5, color: colors.inkSoft, textAlign: 'center' },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center' },
  todayBadge: { backgroundColor: colors.lime, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  todayText: { fontFamily: font.bold, fontSize: 11, color: colors.forestDeep },
  daysPanel: { marginTop: 10, padding: 12, borderRadius: 16, backgroundColor: colors.bg },
  itemMeta: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, marginTop: 1 },
  itemDate: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkMuted, marginTop: 2 },
  explain: { marginTop: 16, marginBottom: 12, padding: 16, borderRadius: 20, backgroundColor: colors.mint, gap: 10 },
  explainHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  explainTitle: { fontFamily: font.bold, fontSize: 16, color: colors.forest },
  explainText: { fontFamily: font.regular, fontSize: 13.5, lineHeight: 20, color: colors.ink },
  explainFacts: { flexDirection: 'row', gap: 8 },
  fact: { flex: 1, padding: 10, borderRadius: 14, backgroundColor: colors.card },
  factLabel: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkMuted },
  factValue: { fontFamily: font.bold, fontSize: 14, color: colors.ink, marginTop: 2 },
  explainHint: { fontFamily: font.medium, fontSize: 12.5, color: colors.forest },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 22, backgroundColor: colors.forest },
  startText: { fontFamily: font.semibold, fontSize: 14.5, color: colors.white },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.sage, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3, backgroundColor: colors.leaf },
  progressText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.inkSoft, minWidth: 40, textAlign: 'right' },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  copyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12, padding: 10, borderRadius: 14, backgroundColor: colors.mint },
  copyLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.forest },
  copyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingLeft: 4, paddingRight: 10, borderRadius: 999, backgroundColor: colors.card },
  copyChipText: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },

  panel: { padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  panelHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  panelLabel: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink, marginBottom: 10 },
  panelHint: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, marginTop: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minWidth: 48, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  pillWide: { flex: 1 },
  pillOn: { backgroundColor: colors.forest },
  pillText: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  input: { minHeight: 76, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, fontFamily: font.regular, fontSize: 15, color: colors.ink, textAlignVertical: 'top', backgroundColor: colors.bg },

  groupLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.8, color: colors.inkMuted, textTransform: 'uppercase', marginTop: 14, marginBottom: 2 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  taskTitle: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  taskInfo: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginLeft: 50, marginBottom: 10 },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  infoBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, marginBottom: 12, padding: 14, borderRadius: 18, backgroundColor: colors.mint },
  profileTitle: { fontFamily: font.bold, fontSize: 15, color: colors.forest },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  tipIcon: { fontSize: 20, width: 26, textAlign: 'center' },
  tipDetail: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.inkSoft, marginTop: 2 },
  tipWhy: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkMuted, marginTop: 4 },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.forest },
  smallBtnText: { fontFamily: font.semibold, fontSize: 13, color: colors.white },

  toast: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 12, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.forest },
  toastText: { fontFamily: font.medium, fontSize: 12.5, color: colors.white },
});
