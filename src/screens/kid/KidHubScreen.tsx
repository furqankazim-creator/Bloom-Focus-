import { currentWeek } from '../../engine/monthPlan';
import { flipIcon } from '../../components/ui';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Confetti } from '../../components/Confetti';
import { HeroSticker } from '../../components/hero/HeroSticker';
import { KidBackdrop } from '../../components/kid/KidBackdrop';
import { KID_ART } from '../../components/kid/kidArt';
import { HERO_PRESETS, heroesFor } from '../../engine/heroes';
import { personalize } from '../../engine/personalize';
import { BASE_PARAMS } from '../../engine/tasks';
import { TRAIN_IDS, gameDurationSec, type TrainTaskId } from '../../engine/trainTasks';
import { TRAIN_GAME } from '../../games/train/meta';
import { FUN_GAMES, type FunGameInfo } from '../../games/fun';
import type { RootProps } from '../../navigation/types';
import { isDueToday, isOnDay } from '../../engine/schedule';
import { LIBRARY_ART } from '../../library/art';
import { FAMILY, isLibraryFamily, type LibraryFamilyId } from '../../library/catalog';
import { openPlanStep } from '../planChain';
import { t } from '../../i18n';
import { useChild, useStore } from '../../store/useStore';
import { lightColors as colors, font } from '../../theme';
import type { Child, CustomActivity, Feeling, Session } from '../../types';
import { dayStreak, firstName } from '../helpers';

const native = Platform.OS !== 'web';

const FEELINGS: { id: Feeling; label: string; bg: string; reply: (name: string) => string }[] = [
  { id: 'happy', label: 'Happy', bg: '#FFF2C2', reply: (n) => t('Yay! I love that happy face, {{name}}! 😊', { name: n }) },
  { id: 'excited', label: 'Excited', bg: '#FFE1F3', reply: () => t('Woohoo! Let’s use that super energy!') },
  { id: 'calm', label: 'Calm', bg: '#DDF6EA', reply: () => t('Nice and calm — perfect for focusing.') },
  { id: 'tired', label: 'Tired', bg: '#E3E7FF', reply: () => t('Feeling sleepy? We’ll take it nice and slow.') },
  { id: 'worried', label: 'Worried', bg: '#FFE7D6', reply: () => t('It’s okay to feel worried. I’m right here with you. 💙') },
  { id: 'grumpy', label: 'Grumpy', bg: '#FFDDE2', reply: () => t('Grumpy days happen! A few calm breaths can help.') },
];
const GENTLE: Feeling[] = ['tired', 'worried', 'grumpy'];
const TRAINING_SIZE = 4;


/** A game on today's list: a Focus game, or a Skill Builder the therapist assigned (`family`). */
type TrainingItem = { taskId: string; custom?: CustomActivity; family?: LibraryFamilyId; today?: boolean };

/**
 * Today's training: the Train games the therapist assigned first, then games suggested for the
 * child's profile, then the ones played least recently. Uses play from before today so the list
 * stays the same all day as games get done.
 */
function todaysTraining(child: Child, sessions: Session[], since: number, calm: boolean, now = new Date()): TrainingItem[] {
  const items: TrainingItem[] = [];
  const add = (taskId: string, custom?: CustomActivity, family?: LibraryFamilyId) => {
    // Activities set for other days stay off today's list.
    if (custom && !isOnDay(custom.days, now)) return;
    if (items.length < TRAINING_SIZE && !items.some((i) => i.taskId === taskId)) items.push({ taskId, custom, family, today: isDueToday(custom?.days, now) });
  };
  const playable = (a: CustomActivity): { taskId: string; family?: LibraryFamilyId } | null => {
    if (a.studio) return null;
    const fam = a.library?.family;
    if (fam && isLibraryFamily(fam)) return FAMILY[fam].mode === 'app' ? { taskId: `library-${fam}`, family: fam } : null;
    return TRAIN_IDS.includes(a.taskId as TrainTaskId) ? { taskId: a.taskId } : null;
  };
  // 1. Anything the therapist set for today (this weekday) comes first.
  for (const a of child.customActivities ?? []) {
    const p = playable(a);
    if (p && isDueToday(a.days, now)) add(p.taskId, a, p.family);
  }
  // 2. This week's games from the 4-week plan.
  for (const id of currentWeek(child.monthPlan)?.week.games ?? []) add(id);
  // 3. The therapist's home plan from the last clinic session.
  for (const g of child.homePlan?.games ?? []) {
    if (!TRAIN_IDS.includes(g.taskId as TrainTaskId)) continue;
    add(g.taskId, g.customId ? child.customActivities?.find((a) => a.id === g.customId) : undefined);
  }
  // 4. Other assigned activities (any day).
  for (const a of child.customActivities ?? []) {
    const p = playable(a);
    if (p) add(p.taskId, a, p.family);
  }
  for (const id of personalize(child, calm).suggestions.find((s) => s.games)?.games ?? []) add(id);
  const before = sessions.filter((s) => s.childId === child.id && Date.parse(s.startedAt) < since);
  const lastPlayed = (id: TrainTaskId) => before.reduce((t, s) => (s.blocks.some((b) => b.taskId === id) ? Math.max(t, Date.parse(s.startedAt)) : t), 0);
  for (const id of [...TRAIN_IDS].sort((a, b) => lastPlayed(a) - lastPlayed(b))) add(id);
  return items;
}
const RECENT_MS = 2 * 60 * 60 * 1000;

/**
 * The child's start flow: "How are you feeling?" → "Have you done your training?" →
 * today's training path, then the Fun Zone (unlocked once training is done).
 */
export default function KidHubScreen({ route, navigation }: RootProps<'KidHub'>) {
  const { childId } = route.params;
  const child = useChild(childId);
  const sessions = useStore((s) => s.sessions);
  const libraryPlays = useStore((s) => s.libraryPlays);
  const calmMode = useStore((s) => s.calmMode);
  // Calm mode or "Reduce motion" both skip the animations.
  const calm = useStore((s) => s.calmMode || s.settings.reduceMotion);
  const funLimit = useStore((s) => s.settings.funLimit);
  const funTime = useStore((s) => s.funTime);
  const funLeftSec = funLimit ? Math.max(0, funLimit * 60 - (funTime.day === new Date().toDateString() ? funTime.sec : 0)) : Infinity;
  const checkIns = useStore((s) => s.kidCheckIns);
  const addKidCheckIn = useStore((s) => s.addKidCheckIn);

  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const mine = sessions.filter((s) => s.childId === childId);
  const training = child ? todaysTraining(child, sessions, midnight.getTime(), calmMode) : [];
  const playedToday = (t: TrainingItem) =>
    t.family
      ? libraryPlays.some((p) => p.activityId === t.custom?.id && Date.parse(p.playedAt) >= midnight.getTime())
      : mine.some((s) => Date.parse(s.startedAt) >= midnight.getTime() && s.blocks.some((b) => b.taskId === t.taskId));
  const doneCount = training.filter((t) => playedToday(t)).length;
  // Training counts as done once every game on today's list has been played.
  const trainedToday = training.length > 0 && doneCount === training.length;
  // Celebrate if training gets finished while this screen is open.
  const [trainedAtStart] = useState(trainedToday);
  const celebrate = trainedToday && !trainedAtStart;

  const recent = [...checkIns].reverse().find((c) => c.childId === childId && Date.now() - Date.parse(c.at) < RECENT_MS);
  const [stage, setStage] = useState<'feel' | 'check' | 'plan'>(recent ? 'plan' : 'feel');
  const [feeling, setFeeling] = useState<Feeling | null>(recent?.feeling ?? null);
  const [bubble, setBubble] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (celebrate) scroll.current?.scrollTo({ y: 0, animated: true });
  }, [celebrate]);

  if (!child) return null;
  const first = firstName(child.name);
  const hero = heroesFor(child, child.customActivities?.[0])[0] ?? HERO_PRESETS.find((h) => h.id === 'bamboo-bao')!;
  const gentle = !!feeling && GENTLE.includes(feeling);
  const feelInfo = FEELINGS.find((f) => f.id === feeling);
  const streak = dayStreak(mine);
  const paramsOf = (t: TrainingItem) => (t.custom && !t.custom.adaptive ? t.custom.params : child.tasks[t.taskId as TrainTaskId]?.params ?? BASE_PARAMS);
  // Skill Builders take about half their full worksheet time on the phone.
  const secondsOf = (t: TrainingItem) => (t.family ? (FAMILY[t.family].minutes * 60) / 2 : gameDurationSec(t.taskId as TrainTaskId, paramsOf(t)));
  const minutes = Math.max(1, Math.round(training.reduce((n, t) => n + secondsOf(t), 0) / 60));

  const pickFeeling = (f: (typeof FEELINGS)[number]) => {
    setFeeling(f.id);
    addKidCheckIn(childId, f.id);
    setBubble(f.reply(first));
    setTimeout(() => {
      setBubble(null);
      setStage('check');
    }, 1700);
  };

  /** Plays today's games one after another, starting with the first one not done yet (or all again). */
  const startTraining = () => {
    const todo = trainedToday ? training : training.filter((t) => !playedToday(t));
    // Focus games and Skill Builders play one after another.
    openPlanStep(
      navigation,
      childId,
      todo.map((t) => ({ taskId: t.taskId, ...(t.custom ? { customId: t.custom.id } : {}), ...(t.family ? { level: t.custom?.library?.level ?? 1 } : {}) })),
    );
  };
  const openFun = (g: FunGameInfo) => {
    if (!trainedToday && !g.alwaysOpen) {
      setBubble(t('Finish your training first, then come and play! 💪'));
      setTimeout(() => setBubble(null), 2200);
      return;
    }
    // Daily Fun Zone limit from Settings (the Calm Corner stays open).
    if (!g.alwaysOpen && funLeftSec <= 0) {
      setBubble(t('That’s all the fun time for today — see you tomorrow! 🌙'));
      setTimeout(() => setBubble(null), 2400);
      return;
    }
    navigation.navigate('FunGame', { childId, game: g.id });
  };

  const heroLine =
    bubble ??
    (stage === 'feel'
      ? t('Hi {{name}}! 👋 How are you feeling right now?', { name: first })
      : stage === 'check'
        ? trainedToday
          ? t('You already did your training today, superstar! ⭐')
          : t('Have you done your training today?')
        : celebrate
          ? t('You did it, {{name}}! Training complete — the Fun Zone is open! 🎉', { name: first })
          : trainedToday
            ? t('Great job today! Pick something fun to play. 🎈')
            : gentle
              ? t('Let’s take it slow today. Start whenever you’re ready.')
              : t('Here’s your training for today, {{name}}. Let’s go!', { name: first }));

  return (
    <KidBackdrop calm={calm}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <Pressable onPress={() => navigation.goBack()} style={styles.close} hitSlop={8} accessibilityLabel="Close">
            <Feather name="x" size={20} color={colors.ink} />
          </Pressable>
          <Text style={styles.topTitle}>{t('{{name}}’s space', { name: first })}</Text>
          <View style={styles.streak}>
            <Image source={KID_ART.fire} style={{ width: 20, height: 20 }} />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        </View>

        <ScrollView ref={scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {celebrate && <Confetti count={30} />}
          <BouncyHero hero={hero} text={heroLine} calm={calm} size={stage === 'plan' ? 84 : 118} />

          {stage === 'feel' && (
            <View style={styles.feelGrid}>
              {FEELINGS.map((f, i) => (
                <PopIn key={f.id} delay={i * 70} calm={calm} style={styles.feelCell}>
                  <Pressable
                    onPress={() => pickFeeling(f)}
                    style={({ pressed }) => [styles.feel, { backgroundColor: f.bg }, feeling === f.id && styles.feelOn, pressed && { transform: [{ scale: 0.95 }] }]}
                    accessibilityRole="button"
                    accessibilityLabel={t('I feel {{feeling}}', { feeling: t(f.label) })}
                  >
                    <Image source={KID_ART[f.id]} style={{ width: 62, height: 62 }} />
                    <Text style={styles.feelText}>{t(f.label)}</Text>
                  </Pressable>
                </PopIn>
              ))}
            </View>
          )}

          {stage === 'check' && (
            <PopIn calm={calm} style={{ alignSelf: 'stretch', gap: 12 }}>
              {trainedToday ? (
                <>
                  <BigButton label={t('Go to the Fun Zone')} emoji="🎈" colors={['#8C7CF6', '#6F5DE8']} onPress={() => setStage('plan')} />
                  <BigButton label={t('Train again')} emoji="💪" light onPress={startTraining} />
                </>
              ) : (
                <>
                  <BigButton label={t('Not yet — let’s do it!')} emoji="🚀" colors={['#4FC08D', '#2E9E6B']} onPress={() => setStage('plan')} />
                  <BigButton
                    label={t('Yes, I did!')}
                    emoji="🎉"
                    light
                    onPress={() => {
                      setBubble(t('Hmm, I can’t see it yet! Let’s do it together — it only takes about {{min}} minutes.', { min: minutes }));
                      setTimeout(() => {
                        setBubble(null);
                        setStage('plan');
                      }, 2600);
                    }}
                  />
                </>
              )}
              {gentle && (
                <Pressable onPress={() => navigation.navigate('FunGame', { childId, game: 'breathe' })} style={styles.calmCard} accessibilityRole="button">
                  <Image source={KID_ART.wind} style={{ width: 44, height: 44 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.calmTitle}>{t('Visit the Calm Corner first?')}</Text>
                    <Text style={styles.calmText}>{t('Five slow breaths with {{hero}}', { hero: hero.name })}</Text>
                  </View>
                  <Feather name={flipIcon('chevron-right')} size={20} color="#4A5BA8" />
                </Pressable>
              )}
            </PopIn>
          )}

          {stage === 'plan' && (
            <>
              {feelInfo && (
                <Pressable onPress={() => setStage('feel')} style={styles.moodChip} accessibilityRole="button" accessibilityLabel={t('Change how I feel')}>
                  <Image source={KID_ART[feelInfo.id]} style={{ width: 22, height: 22 }} />
                  <Text style={styles.moodText}>{t('Feeling {{feeling}}', { feeling: t(feelInfo.label).toLowerCase() })}</Text>
                  <Text style={styles.moodChange}>{t('change')}</Text>
                </Pressable>
              )}

              {celebrate && (
                <PopIn calm={calm} style={styles.celebrate}>
                  <Image source={KID_ART.party} style={{ width: 52, height: 52 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.celebrateTitle}>{t('Training complete!')}</Text>
                    <Text style={styles.celebrateText}>{t('The Fun Zone is unlocked. Go have fun! 🎈')}</Text>
                  </View>
                </PopIn>
              )}

              {/* Today's training path */}
              <View style={styles.sectionHead}>
                <Text style={styles.section}>{t('Today’s training')}</Text>
                <Text style={styles.sectionHint}>
                  {t('{{done}}/{{total}} done · ~{{min}} min', { done: doneCount, total: training.length, min: minutes })}
                </Text>
              </View>
              <View style={styles.path}>
                {training.map((item, i) => {
                  const lib = item.family ? FAMILY[item.family] : null;
                  const tg = !lib ? TRAIN_GAME[item.taskId as TrainTaskId] : null;
                  const g = lib ? { title: lib.name, skill: lib.skill, tint: lib.tint, icon: lib.emoji } : tg!;
                  const done = playedToday(item);
                  const last = i === training.length - 1;
                  return (
                    <PopIn key={`${item.taskId}-${item.custom?.id ?? ''}`} delay={i * 80} calm={calm} style={styles.stepRow}>
                      <View style={styles.rail}>
                        <View style={[styles.node, done && styles.nodeDone]}>{done && <Feather name="check" size={14} color={colors.white} />}</View>
                        {!last && <View style={[styles.railLine, done && { backgroundColor: '#7DD3A0' }]} />}
                      </View>
                      <View style={[styles.stepCard, done && styles.stepDone]}>
                        <View style={{ flex: 1 }}>
                          {item.today && !done && (
                            <View style={styles.todayTag}>
                              <Text style={styles.todayTagText}>📅 {t('Today')}</Text>
                            </View>
                          )}
                          <Text style={styles.stepTitle}>{item.custom?.name ?? t(g.title)}</Text>
                          <Text style={styles.stepSkill}>{(item.custom ? t('From {{who}} · {{skill}}', { who: child.therapistName ?? t('your therapist'), skill: t(g.skill) }) : t(g.skill)).toUpperCase()}</Text>
                        </View>
                        <LinearGradient colors={[g.tint, '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stepArt}>
                          {lib ? <Image source={LIBRARY_ART[lib.id]} style={{ width: 44, height: 44 }} /> : item.custom?.hero ? <HeroSticker hero={item.custom.hero} size={50} /> : <Text style={{ fontSize: 32 }}>{g.icon}</Text>}
                        </LinearGradient>
                      </View>
                    </PopIn>
                  );
                })}
              </View>
              <BigButton
                label={trainedToday ? t('Train again') : doneCount > 0 ? t('Keep going · {{n}} left', { n: training.length - doneCount }) : t('Start training · {{min}} min', { min: minutes })}
                emoji={trainedToday ? '💪' : '🚀'}
                colors={trainedToday ? undefined : ['#4FC08D', '#2E9E6B']}
                light={trainedToday}
                onPress={startTraining}
              />

              {/* Fun Zone */}
              <View style={[styles.sectionHead, { marginTop: 26 }]}>
                <Text style={styles.section}>🎈 {t('Fun Zone')}</Text>
                <Text style={styles.sectionHint}>{!trainedToday ? t('Unlocks after training') : funLeftSec === Infinity ? t('Unlocked!') : funLeftSec <= 0 ? t('Done for today') : t('{{n}} min left today', { n: Math.ceil(funLeftSec / 60) })}</Text>
              </View>
              <View style={styles.funGrid}>
                {FUN_GAMES.map((g, i) => {
                  const locked = !trainedToday && !g.alwaysOpen;
                  return (
                    <PopIn key={g.id} delay={i * 80} calm={calm} style={styles.funCell}>
                      <Pressable onPress={() => openFun(g)} style={({ pressed }) => [pressed && { transform: [{ scale: 0.96 }] }]} accessibilityRole="button" accessibilityLabel={`${t(g.title)}${locked ? `, ${t('locked')}` : ''}`}>
                        <LinearGradient colors={g.tint} style={styles.funCard}>
                          <Image source={g.art} style={[{ width: 58, height: 58 }, locked && { opacity: 0.45 }]} />
                          <Text style={styles.funTitle}>{t(g.title)}</Text>
                          <Text style={styles.funBlurb}>{locked ? t('Finish training first') : t(g.blurb)}</Text>
                          {locked && <Image source={KID_ART.lock} style={styles.lock} />}
                          {g.alwaysOpen && !trainedToday && <Text style={styles.open}>{t('Open anytime')}</Text>}
                        </LinearGradient>
                      </Pressable>
                    </PopIn>
                  );
                })}
              </View>
              <Text style={styles.grownups}>{t('Grown-ups: Fun Zone games are just for fun — they aren’t scored or sent to the therapist.')}</Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </KidBackdrop>
  );
}

/** The hero with a speech bubble, gently bobbing. The bubble pops when the text changes. */
function BouncyHero({ hero, text, calm, size }: { hero: Parameters<typeof HeroSticker>[0]['hero']; text: string; calm: boolean; size: number }) {
  const bob = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -8, duration: 1100, useNativeDriver: native }),
        Animated.timing(bob, { toValue: 0, duration: 1100, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, bob]);
  useEffect(() => {
    pop.setValue(0.85);
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: native }).start();
  }, [text, pop]);
  return (
    <View style={styles.heroWrap}>
      <Animated.View style={[styles.bubble, { transform: [{ scale: pop }] }]}>
        <Text style={styles.bubbleText}>{text}</Text>
        <View style={styles.tail} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY: bob }] }}>
        <HeroSticker hero={hero} size={size} showName />
      </Animated.View>
    </View>
  );
}

/** Fades and slides children in, optionally after a delay. */
function PopIn({ children, delay = 0, calm, style }: { children: React.ReactNode; delay?: number; calm: boolean; style?: object }) {
  const a = useRef(new Animated.Value(calm ? 1 : 0)).current;
  useEffect(() => {
    if (calm) return;
    Animated.timing(a, { toValue: 1, duration: 380, delay, useNativeDriver: native }).start();
  }, [a, calm, delay]);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

function BigButton({ label, emoji, onPress, colors: grad, light }: { label: string; emoji: string; onPress: () => void; colors?: [string, string]; light?: boolean }) {
  const inner = (
    <>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={[styles.bigText, light && { color: colors.ink }]}>{label}</Text>
    </>
  );
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.bigWrap, pressed && { transform: [{ scale: 0.97 }] }]} accessibilityRole="button" accessibilityLabel={label}>
      {light || !grad ? (
        <View style={[styles.big, styles.bigLight]}>{inner}</View>
      ) : (
        <LinearGradient colors={grad} style={styles.big}>
          {inner}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, fontFamily: font.heavy, fontSize: 18, color: colors.ink },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.9)' },
  streakText: { fontFamily: font.heavy, fontSize: 15, color: '#E0661F' },
  body: { paddingHorizontal: 18, paddingBottom: 40, alignItems: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' },

  heroWrap: { alignItems: 'center', marginTop: 6, marginBottom: 18 },
  bubble: { maxWidth: 330, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22, backgroundColor: '#FFFFFF', marginBottom: 14, shadowColor: '#5B6BA8', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  bubbleText: { fontFamily: font.bold, fontSize: 17, lineHeight: 24, color: colors.ink, textAlign: 'center' },
  tail: { position: 'absolute', bottom: -7, alignSelf: 'center', width: 16, height: 16, backgroundColor: '#FFFFFF', transform: [{ rotate: '45deg' }] },

  feelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  feelCell: { width: '30%', minWidth: 96 },
  feel: { alignItems: 'center', paddingVertical: 14, borderRadius: 24, borderWidth: 3, borderColor: '#FFFFFF', gap: 6 },
  feelOn: { borderColor: '#7C6CF2' },
  feelText: { fontFamily: font.bold, fontSize: 15, color: colors.ink },

  bigWrap: { alignSelf: 'stretch' },
  big: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 62, borderRadius: 31 },
  bigLight: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#E4E7F5' },
  bigText: { fontFamily: font.heavy, fontSize: 18, color: colors.white },
  calmCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: '#E6EEFF' },
  calmTitle: { fontFamily: font.bold, fontSize: 15, color: '#3A4A96' },
  calmText: { fontFamily: font.medium, fontSize: 13, color: '#5D6BB0' },

  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', marginBottom: 12 },
  moodText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  moodChange: { fontFamily: font.semibold, fontSize: 13, color: '#7C6CF2' },
  celebrate: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', padding: 14, borderRadius: 22, backgroundColor: '#FFF4D6', marginBottom: 8 },
  celebrateTitle: { fontFamily: font.heavy, fontSize: 17, color: '#A0610A' },
  celebrateText: { fontFamily: font.medium, fontSize: 13.5, color: '#8A5A12' },

  sectionHead: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 },
  section: { fontFamily: font.heavy, fontSize: 20, color: colors.ink },
  sectionHint: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft },
  path: { alignSelf: 'stretch', marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  rail: { width: 28, alignItems: 'center' },
  node: { width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, borderColor: '#9BB8E8', backgroundColor: '#FFFFFF', marginTop: 34, alignItems: 'center', justifyContent: 'center' },
  nodeDone: { backgroundColor: '#3CB878', borderColor: '#3CB878' },
  railLine: { flex: 1, width: 2.5, backgroundColor: '#C9D7F0', marginVertical: 2 },
  stepCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingLeft: 16, marginBottom: 10, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#D9E6FA' },
  stepDone: { borderColor: '#9BE0BC' },
  todayTag: { alignSelf: 'flex-start', backgroundColor: '#FFE58A', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 3 },
  todayTagText: { fontFamily: font.bold, fontSize: 11, color: '#7A5A00' },
  stepTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  stepSkill: { fontFamily: font.semibold, fontSize: 10.5, letterSpacing: 0.8, color: colors.inkMuted, marginTop: 3 },
  stepArt: { width: 74, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  funGrid: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  funCell: { width: '47.5%', flexGrow: 1 },
  funCard: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 10, borderRadius: 26, gap: 4, borderWidth: 3, borderColor: '#FFFFFF' },
  funTitle: { fontFamily: font.heavy, fontSize: 15.5, color: colors.ink, marginTop: 4 },
  funBlurb: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkSoft },
  lock: { position: 'absolute', top: 10, right: 10, width: 28, height: 28 },
  open: { position: 'absolute', top: 10, right: 10, fontFamily: font.bold, fontSize: 10.5, color: '#3A4A96', backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  grownups: { fontFamily: font.regular, fontSize: 12, color: colors.inkMuted, textAlign: 'center', marginTop: 18 },
});
