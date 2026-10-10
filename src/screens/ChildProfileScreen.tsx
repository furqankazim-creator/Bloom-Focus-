import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { DomainBars } from '../components/charts';
import { LineChart } from '../components/LineChart';
import { NotesThread } from '../components/NotesThread';
import { Avatar, Button, IconButton, Screen, TaskIcon, TopBar } from '../components/ui';
import { STATUS, childPulse } from '../engine/childStatus';
import { FEELING_EMOJI } from '../engine/clinic';
import { currentWeek } from '../engine/monthPlan';
import { attentionProfile, profileSentence, sessionAccuracy } from '../engine/profile';
import { DOMAIN_LABEL, TASKS } from '../engine/tasks';
import { TRAIN_BY_ID } from '../engine/trainTasks';
import { dateLocale, t } from '../i18n';
import type { RootProps } from '../navigation/types';
import { shareReport } from '../services/report';
import { useChild, useStore } from '../store/useStore';
import { colors, font } from '../theme';
import { childStats, shortDate } from './helpers';

type Tab = 'overview' | 'sessions' | 'visits' | 'family';

/** One child: status, key numbers and actions up top; details in tabs underneath. */
export default function ChildProfileScreen({ route, navigation }: RootProps<'ChildProfile'>) {
  const child = useChild(route.params.childId);
  const sessions = useStore((s) => s.sessions);
  const role = useStore((s) => s.role);
  const removeChild = useStore((s) => s.removeChild);
  const notes = useStore((s) => s.notes);
  const checkIns = useStore((s) => s.kidCheckIns);
  const gapDays = useStore((s) => s.settings.alertGapDays);
  const allVisits = useStore((s) => s.clinicVisits);
  const [tab, setTab] = useState<Tab>('overview');
  const [exporting, setExporting] = useState(false);
  if (!child) return null;

  const therapist = role === 'therapist';
  const first = child.name.split(' ')[0];
  const visits = allVisits.filter((v) => v.childId === child.id && v.status === 'done').sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const st = childStats(child, sessions);
  const pulse = childPulse(sessions, child.id, gapDays);
  const status = STATUS[pulse.status];
  const profile = attentionProfile(st.sessions);
  const mood = [...checkIns].reverse().find((k) => k.childId === child.id)?.feeling;
  const plan = currentWeek(child.monthPlan);
  const unread = notes.filter((n) => n.childId === child.id && n.from !== role && !n.readAt).length;
  const chart = st.sessions
    .slice(0, 10)
    .reverse()
    .map((s) => ({ s, a: sessionAccuracy(s) }))
    .filter((x) => x.a !== null)
    .map((x) => ({ value: Math.round((x.a as number) * 100), label: new Date(x.s.startedAt).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }) }));

  const exportPdf = async () => {
    setExporting(true);
    try {
      await shareReport(child, sessions, notes);
    } catch {
      Alert.alert(t('Could not create the report'), t('Please try again.'));
    } finally {
      setExporting(false);
    }
  };

  const remove = () => {
    const go = () => {
      navigation.goBack();
      removeChild(child.id);
    };
    const title = t('Remove this profile?');
    const body = t('{{name}}’s sessions and notes will be deleted from this device.', { name: child.name });
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${body}`)) go();
      return;
    }
    Alert.alert(title, body, [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Remove'), style: 'destructive', onPress: go },
    ]);
  };

  const startSession = () => (therapist ? navigation.navigate('ClinicSession', { childId: child.id }) : navigation.navigate('Session', { childId: child.id }));
  const TABS: { id: Tab; label: string; n?: number }[] = [
    { id: 'overview', label: t('Overview') },
    { id: 'sessions', label: t('Sessions'), n: st.count },
    ...(therapist ? [{ id: 'visits' as Tab, label: t('Visits'), n: visits.length }] : []),
    { id: 'family', label: t('Family'), n: unread || undefined },
  ];

  return (
    <Screen>
      <TopBar
        title={t('Child profile')}
        onBack={() => navigation.goBack()}
        right={therapist && <IconButton icon="edit-2" label="Edit profile" bg="transparent" color={colors.ink} onPress={() => navigation.navigate('EditChild', { childId: child.id })} />}
      />

      {/* Hero */}
      <LinearGradient colors={[colors.forestDeep, '#2B5A43']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.glow, { backgroundColor: child.color }]} />
        <View style={[styles.row, { gap: 16 }]}>
          <View style={[styles.heroRing, { borderColor: status.color }]}>
            <Avatar name={child.name} color={child.color} photo={child.photo} emoji={child.avatarEmoji} size={78} />
            {mood && (
              <View style={styles.moodBubble}>
                <Text style={{ fontSize: 16 }}>{FEELING_EMOJI[mood]}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName} numberOfLines={2}>{child.name}</Text>
            <Text style={styles.heroMeta}>
              {t('{{n}} years', { n: child.age })} · {t('Joined {{date}}', { date: new Date(child.createdAt).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short', year: 'numeric' }) })}
            </Text>
          </View>
        </View>
        <View style={styles.heroChips}>
          <View style={styles.heroChip}>
            <Feather name="crosshair" size={12} color={colors.white} />
            <Text style={styles.heroChipText}>{t(DOMAIN_LABEL[child.focus])}</Text>
          </View>
          <View style={[styles.heroChip, { backgroundColor: status.bg }]}>
            <View style={[styles.dot, { backgroundColor: status.color }]} />
            <Text style={[styles.heroChipText, { color: status.color }]}>{t(status.label)}</Text>
          </View>
          {therapist && (
            <Pressable
              onPress={() => Share.share({ message: t('Bloom Focus family code for {{name}}: {{code}}', { name: first, code: child.familyCode }) })}
              style={styles.heroChip}
              accessibilityRole="button"
              accessibilityLabel={t('Share code')}
            >
              <Feather name="key" size={12} color={colors.lime} />
              <Text style={[styles.heroChipText, { color: colors.lime, letterSpacing: 1.5 }]}>{child.familyCode}</Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={startSession} style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Feather name="play" size={18} color={colors.onPastel} />
          <Text style={styles.startText}>{therapist ? t('Start clinic session') : t('Start a practice session')}</Text>
        </Pressable>
        <View style={styles.quick}>
          {therapist && <Quick icon="layers" label={t('Plan')} onPress={() => navigation.navigate('Tabs', { screen: 'Plan', params: { childId: child.id } })} />}
          {therapist && <Quick icon="sliders" label={t('Tuning')} onPress={() => navigation.navigate('Tuning', { childId: child.id })} />}
          <Quick icon="message-circle" label={t('Message')} badge={unread} onPress={() => navigation.navigate('Tabs', { screen: 'Notes', params: { childId: child.id } })} />
          <Quick icon="file-text" label={exporting ? t('Preparing…') : t('Report')} onPress={() => void exportPdf()} />
        </View>
      </LinearGradient>

      {/* Key numbers */}
      <View style={styles.kpis}>
        <Kpi value={pulse.recent === null ? '—' : `${Math.round(pulse.recent * 100)}%`} label={t('Accuracy')} delta={pulse.trend} tint={colors.mint} />
        <Kpi value={String(st.count)} label={t('Sessions')} tint={colors.warm} />
        <Kpi value={pulse.streak ? `🔥 ${pulse.streak}` : '—'} label={t('Day streak')} tint={colors.blush} />
      </View>

      {/* Starting check */}
      {!child.baselineAt && (
        <View style={styles.baseline}>
          <Text style={{ fontSize: 26 }}>🧭</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.baselineTitle}>{t('Start with a starting check')}</Text>
            <Text style={styles.baselineBody}>{t('One short round of each activity places {{name}} at the right level.', { name: first })}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Session', { childId: child.id, mode: 'baseline' })} style={styles.baselineBtn} accessibilityRole="button">
            <Text style={styles.baselineBtnText}>{t('Run')}</Text>
          </Pressable>
        </View>
      )}

      {/* Level progress */}
      <View style={styles.levelCard}>
        <Ring value={st.level / 10} label={String(st.level)} />
        <View style={{ flex: 1 }}>
          <View style={[styles.row, { gap: 8 }]}>
            <TaskIcon icon={st.task.icon} tint={colors.sage} size={26} />
            <Text style={styles.levelTitle} numberOfLines={1}>{t('{{game}} level', { game: t(st.task.name) })}</Text>
          </View>
          <View style={[styles.row, { gap: 4, marginTop: 8 }]}>
            {Array.from({ length: st.streakNeeded }).map((_, i) => (
              <View key={i} style={[styles.step, i < st.streak && { backgroundColor: colors.leaf }]} />
            ))}
          </View>
          <Text style={styles.levelHint}>
            {t('{{done}} of {{need}} strong rounds (85%+) to level up', { done: st.streak, need: st.streakNeeded })} · {t('{{now}} of {{max}} min sessions', { now: child.currentMinutes, max: child.sessionMinutes })}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tb) => {
          const on = tab === tb.id;
          return (
            <Pressable key={tb.id} onPress={() => setTab(tb.id)} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>{tb.label}</Text>
              {!!tb.n && <Text style={[styles.tabCount, on && { color: colors.forest }]}>{tb.n}</Text>}
            </Pressable>
          );
        })}
      </View>

      {tab === 'overview' && (
        <>
          <Card title={t('Accuracy over time')} sub={t('Last {{n}} sessions · dashed line = 85% level-up mark', { n: chart.length })}>
            {chart.length >= 2 ? (
              <LineChart data={chart} max={100} ticks={[0, 50, 100]} unit="%" target={85} targetLabel="85%" height={150} />
            ) : (
              <Text style={styles.muted}>{t('A chart appears after two sessions.')}</Text>
            )}
          </Card>

          <Card title={t('This week')}>
            <View style={[styles.row, { gap: 6 }]}>
              {[t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat'), t('Sun')].map((d, i) => {
                const on = pulse.weekDays.includes(i);
                const today = i === (new Date().getDay() + 6) % 7;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                    <View style={[styles.dayDot, on && styles.dayDotOn, today && styles.dayDotToday]}>
                      {on && <Feather name="check" size={14} color={colors.white} />}
                    </View>
                    <Text style={[styles.dayLabel, today && { color: colors.forest, fontFamily: font.bold }]} numberOfLines={1}>{d}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          {plan && (
            <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Plan', params: { childId: child.id } })} accessibilityRole="button">
              <Card title={`🗓️ ${t('Week {{n}} of 4', { n: plan.index + 1 })}`} sub={plan.week.goal}>
                <View style={styles.games}>
                  {plan.week.games.map((g) => (
                    <View key={g} style={styles.game}>
                      <Text style={{ fontSize: 15 }}>{TRAIN_BY_ID[g].icon}</Text>
                      <Text style={styles.gameText}>{t(TRAIN_BY_ID[g].title)}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </Pressable>
          )}

          <Card title={t('Attention profile')} sub={profileSentence(child, profile)}>
            <DomainBars profile={profile} />
          </Card>
        </>
      )}

      {tab === 'sessions' && (
        <View style={styles.list}>
          {st.sessions.slice(0, 12).map((s, i) => {
            const acc = sessionAccuracy(s);
            const task = TASKS[s.blocks.find((b) => b.accuracy !== null)?.taskId ?? s.blocks[0]?.taskId ?? 'starWatch'];
            const names = s.blocks.map((b) => t(TASKS[b.taskId].name)).filter((n, j, a) => a.indexOf(n) === j && n !== t('Feelings Check-in')).slice(0, 2).join(' + ');
            return (
              <Pressable key={s.id} onPress={() => navigation.navigate('Summary', { sessionId: s.id })} style={[styles.sessionRow, i > 0 && styles.divider]} accessibilityRole="button">
                <TaskIcon icon={task.icon} tint={colors.sage} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle} numberOfLines={1}>{names || t('Check-in')}</Text>
                  <Text style={styles.sessionMeta}>
                    {shortDate(s.startedAt)} · {s.by === 'parent' ? t('at home') : t('in clinic')} · {t('{{n}} min', { n: Math.max(1, Math.round(s.activeSec / 60)) })}
                  </Text>
                </View>
                <View style={[styles.accPill, { backgroundColor: acc === null ? colors.soft : acc >= 0.85 ? '#E3F4E3' : acc >= 0.65 ? '#FFF3D6' : '#FCE6E1' }]}>
                  <Text style={[styles.accText, { color: acc === null ? colors.inkSoft : acc >= 0.85 ? '#2E7D57' : acc >= 0.65 ? '#8A6212' : '#B5533C' }]}>{acc === null ? '—' : `${Math.round(acc * 100)}%`}</Text>
                </View>
              </Pressable>
            );
          })}
          {st.count === 0 && <Text style={[styles.muted, { padding: 16 }]}>{t('No sessions yet. Start one above.')}</Text>}
        </View>
      )}

      {tab === 'visits' && (
        <View style={{ gap: 10, marginTop: 14 }}>
          {visits.map((v) => (
            <View key={v.id} style={styles.visit}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={styles.visitDate}>{new Date(v.startedAt).toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                {v.goalResult && (
                  <View style={[styles.goalPill, { backgroundColor: v.goalResult === 'met' ? '#E3F4E3' : v.goalResult === 'partly' ? '#FFF3D6' : '#FCE6E1' }]}>
                    <Text style={styles.goalText}>{v.goalResult === 'met' ? `🎯 ${t('Goal met')}` : v.goalResult === 'partly' ? `🌱 ${t('Partly met')}` : `💪 ${t('Not yet')}`}</Text>
                  </View>
                )}
              </View>
              {!!v.goal && <Text style={styles.visitGoal}>{v.goal}</Text>}
              {v.ratings && (
                <View style={{ gap: 6, marginTop: 10 }}>
                  {([['Attention', v.ratings.attention], ['Engagement', v.ratings.engagement], ['Calm', v.ratings.calm]] as const).map(([k, n]) => (
                    <View key={k} style={[styles.row, { gap: 10 }]}>
                      <Text style={styles.rateLabel}>{t(k)}</Text>
                      <View style={styles.rateTrack}>
                        <View style={[styles.rateFill, { width: `${(n / 5) * 100}%` }]} />
                      </View>
                      <Text style={styles.rateNum}>{n}/5</Text>
                    </View>
                  ))}
                </View>
              )}
              {!!v.note && <Text style={styles.visitNote}>“{v.note}”</Text>}
              {!!v.nextGoal && (
                <Text style={styles.visitNext}>
                  <Text style={{ fontFamily: font.bold }}>{t('Next:')}</Text> {v.nextGoal}
                </Text>
              )}
            </View>
          ))}
          {visits.length === 0 && (
            <View style={[styles.list, { padding: 18, alignItems: 'center' }]}>
              <Text style={styles.muted}>{t('No clinic visits logged yet.')}</Text>
            </View>
          )}
        </View>
      )}

      {tab === 'family' && (
        <>
          {therapist && (
            <Card title={t('Family access')} sub={t('Parents enter this code when they choose “I’m a parent”.')}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={styles.code}>{child.familyCode}</Text>
                <Button label="Share code" icon="share-2" variant="light" onPress={() => Share.share({ message: t('Bloom Focus family code for {{name}}: {{code}}', { name: first, code: child.familyCode }) })} />
              </View>
            </Card>
          )}
          <Text style={styles.section}>{t('Recent family messages')}</Text>
          <NotesThread childId={child.id} limit={6} />
        </>
      )}

      {therapist && <Button label="Remove local profile" icon="trash-2" variant="danger" onPress={remove} style={{ marginTop: 28 }} />}
      <Text style={styles.privacy}>
        <Feather name="lock" size={11} /> {t('Demo profiles stay on this device. Do not use this demo for clinical records.')}
      </Text>
    </Screen>
  );
}

function Ring({ value, label, size = 62 }: { value: number; label: string; size?: number }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.sage} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.forest} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * Math.max(0.001, value)} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={styles.ringNum}>{label}</Text>
      <Text style={styles.ringOf}>/10</Text>
    </View>
  );
}

function Quick({ icon, label, badge, onPress }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; badge?: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickBtn, pressed && { opacity: 0.75 }]} accessibilityRole="button">
      <View>
        <Feather name={icon} size={18} color={colors.white} />
        {!!badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.quickText} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function Kpi({ value, label, delta, tint }: { value: string; label: string; delta?: number | null; tint: string }) {
  return (
    <View style={[styles.kpi, { backgroundColor: tint }]}>
      <View style={[styles.row, { gap: 5 }]}>
        <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        {!!delta && <Text style={[styles.delta, { color: delta > 0 ? '#2E7D57' : colors.danger }]}>{delta > 0 ? '▲' : '▼'}{Math.abs(delta)}</Text>}
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {!!sub && <Text style={styles.cardSub}>{sub}</Text>}
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  hero: { borderRadius: 28, padding: 18, overflow: 'hidden' },
  glow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, opacity: 0.18, top: -80, right: -60 },
  heroRing: { padding: 3, borderRadius: 46, borderWidth: 3 },
  moodBubble: { position: 'absolute', right: -6, bottom: -4, width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  heroName: { fontFamily: font.heavy, fontSize: 25, lineHeight: 30, color: colors.white, letterSpacing: -0.5 },
  heroMeta: { fontFamily: font.medium, fontSize: 13, color: colors.onDark, marginTop: 4 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16 },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.13)' },
  heroChipText: { fontFamily: font.semibold, fontSize: 12, color: colors.white },
  dot: { width: 7, height: 7, borderRadius: 4 },
  startBtn: { marginTop: 18, height: 50, borderRadius: 16, backgroundColor: colors.lime, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  startText: { fontFamily: font.bold, fontSize: 15.5, color: colors.onPastel },
  quick: { flexDirection: 'row', gap: 8, marginTop: 10 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 5, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)' },
  quickText: { fontFamily: font.semibold, fontSize: 11.5, color: colors.white },
  badge: { position: 'absolute', top: -6, right: -10, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: font.bold, fontSize: 9.5, color: '#FFFFFF' },

  kpis: { flexDirection: 'row', gap: 10, marginTop: 14 },
  kpi: { flex: 1, minWidth: 0, padding: 12, borderRadius: 18 },
  kpiValue: { fontFamily: font.heavy, fontSize: 21, color: colors.ink },
  kpiLabel: { fontFamily: font.medium, fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },
  delta: { fontFamily: font.bold, fontSize: 11 },

  baseline: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: 20, backgroundColor: colors.lime },
  baselineTitle: { fontFamily: font.bold, fontSize: 15, color: '#1E3A2F' },
  baselineBody: { fontFamily: font.regular, fontSize: 12.5, color: '#1E3A2F', marginTop: 2 },
  baselineBtn: { paddingHorizontal: 16, height: 38, borderRadius: 12, backgroundColor: '#2F5D46', justifyContent: 'center' },
  baselineBtnText: { fontFamily: font.bold, fontSize: 14, color: '#FFFFFF' },

  levelCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14, padding: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  levelTitle: { flex: 1, fontFamily: font.bold, fontSize: 15, color: colors.ink },
  step: { flex: 1, height: 7, borderRadius: 4, backgroundColor: colors.border },
  levelHint: { fontFamily: font.regular, fontSize: 12, color: colors.inkSoft, marginTop: 7 },
  ringNum: { fontFamily: font.heavy, fontSize: 19, color: colors.ink, marginTop: -2 },
  ringOf: { fontFamily: font.medium, fontSize: 9.5, color: colors.inkMuted, marginTop: -3 },

  tabs: { flexDirection: 'row', marginTop: 20, padding: 4, borderRadius: 16, backgroundColor: colors.sage },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 38, borderRadius: 12, paddingHorizontal: 4 },
  tabOn: { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  tabText: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft },
  tabTextOn: { color: colors.ink },
  tabCount: { fontFamily: font.bold, fontSize: 11, color: colors.inkMuted },

  card: { marginTop: 14, padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontFamily: font.heavy, fontSize: 16.5, color: colors.ink },
  cardSub: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, marginTop: 3 },
  muted: { fontFamily: font.regular, fontSize: 13.5, color: colors.inkSoft },
  dayDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  dayDotOn: { backgroundColor: colors.leaf },
  dayDotToday: { borderWidth: 2, borderColor: colors.forest },
  dayLabel: { fontFamily: font.medium, fontSize: 10.5, color: colors.inkMuted },
  games: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  game: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.soft },
  gameText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },

  list: { marginTop: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  sessionTitle: { fontFamily: font.bold, fontSize: 14.5, color: colors.ink },
  sessionMeta: { fontFamily: font.regular, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  accPill: { minWidth: 52, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, alignItems: 'center' },
  accText: { fontFamily: font.bold, fontSize: 13.5 },

  visit: { padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  visitDate: { fontFamily: font.heavy, fontSize: 15.5, color: colors.ink },
  goalPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  goalText: { fontFamily: font.bold, fontSize: 12, color: '#1E3A2F' },
  visitGoal: { fontFamily: font.medium, fontSize: 13.5, color: colors.ink, marginTop: 6 },
  rateLabel: { width: 84, fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },
  rateTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.soft, overflow: 'hidden' },
  rateFill: { height: '100%', borderRadius: 4, backgroundColor: colors.leaf },
  rateNum: { width: 28, fontFamily: font.bold, fontSize: 12, color: colors.ink, textAlign: 'right' },
  visitNote: { fontFamily: font.regular, fontStyle: 'italic', fontSize: 13, color: colors.inkSoft, marginTop: 10 },
  visitNext: { fontFamily: font.regular, fontSize: 13, color: colors.forest, marginTop: 6 },

  code: { fontFamily: font.heavy, fontSize: 26, letterSpacing: 4, color: colors.ink },
  section: { fontFamily: font.heavy, fontSize: 17, color: colors.ink, marginTop: 22, marginBottom: 10 },
  privacy: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkMuted, textAlign: 'center', marginTop: 14 },
});
