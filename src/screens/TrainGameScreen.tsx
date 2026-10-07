import { Feather } from '@expo/vector-icons';
import { t } from '../i18n';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ProgressBar, flipIcon } from '../components/ui';
import { blockAccuracy, taskLevel } from '../engine/adaptive';
import { BASE_PARAMS } from '../engine/tasks';
import { GameResult, useTicker } from '../games/common';
import { BlockResultCard } from '../components/BlockResultCard';
import { GameEnvContext } from '../games/train/shared';
import { WORLDS, heroLines, heroesFor, sceneFor, worldOf } from '../engine/heroes';
import { HeroBuddy } from '../components/hero/HeroBuddy';
import { HeroScene } from '../components/hero/HeroScene';
import { HeroSays, HeroSticker } from '../components/hero/HeroSticker';
import type { Character } from '../types';
import { SUPPORT_LEVELS, resultCard } from '../services/noteCards';
import { postToConversation } from '../services/messaging';
import { TRAIN_GAME, adaptTrain, gameDurationSec, starsFor, trainTaskDef } from '../games/train/meta';
import type { RootProps } from '../navigation/types';
import { uid } from '../store/seed';
import { useChild, useStore } from '../store/useStore';
import { lightColors as colors, font } from '../theme';
import type { BlockResult } from '../types';
import { firstName } from './helpers';
import { TherapistBar } from '../components/TherapistBar';
import { nudgeParams, planTitle } from '../engine/clinic';
import { openPlanStep } from './planChain';

type Phase = 'intro' | 'countdown' | 'play' | 'result';

export const headline = (stars: number) => t(['Good try!', 'Nice effort!', 'Great job!', 'Amazing!'][stars]);
export const cheerEmoji = (stars: number) => ['💪', '💪', '🌟', '🎉'][stars];

export default function TrainGameScreen({ route, navigation }: RootProps<'TrainGame'>) {
  const { childId, taskId, customId, next = [], visitId } = route.params;
  const child = useChild(childId);
  const role = useStore((s) => s.role) ?? 'parent';
  const calmMode = useStore((s) => s.calmMode);
  const custom = customId ? child?.customActivities?.find((a) => a.id === customId) : undefined;
  // A fixed custom activity always plays at the therapist's settings; adaptive ones grow with the child.
  const fixed = !!custom && !custom.adaptive;
  const heroes = heroesFor(child, custom);
  const hero = heroes[0] ?? null;
  const scene = sceneFor(child, custom, calmMode);
  // Night worlds (e.g. Space) need light text when the scene is bold.
  const onDark = scene === 'bold' && !!hero && !!WORLDS[worldOf(hero)].dark;
  const ink = onDark ? colors.white : undefined;
  const [cheer, setCheer] = useState<{ key: number; mood: 'good' | 'oops' | 'idle'; msg: string | null }>({ key: 0, mood: 'idle', msg: null });
  // The buddy's speech bubble fades after a moment.
  useEffect(() => {
    if (!cheer.msg) return;
    const t = setTimeout(() => setCheer((c) => ({ ...c, msg: null })), 1400);
    return () => clearTimeout(t);
  }, [cheer.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const onCheer = (kind: 'good' | 'bad', streak: number) =>
    setCheer((c) => ({
      key: c.key + 1,
      mood: kind === 'good' ? 'good' : 'oops',
      // Talk on the first hit, on streaks, and now and then, so it encourages without nagging.
      msg:
        kind === 'bad'
          ? heroLines.oops()
          : streak >= 3 && streak % 3 === 0
            ? heroLines.streak(streak)
            : streak === 1 || Math.random() < 0.35
              ? heroLines.good()
              : null,
    }));
  const [shared, setShared] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const recordSession = useStore((s) => s.recordSession);
  const addVisitSession = useStore((s) => s.addVisitSession);
  const libraryVersions = useStore((s) => s.libraryVersions);
  const setTaskParam = useStore((s) => s.setTaskParam);
  const meta = TRAIN_GAME[taskId];
  const task = trainTaskDef(taskId);

  const [phase, setPhase] = useState<Phase>('intro');
  const [count, setCount] = useState(3);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ block: BlockResult; stars: number } | null>(null);
  const startedAt = useRef(Date.now());
  const lastSession = useRef<string | null>(null);

  // Params are captured when a round starts so a mid-game store update can't change the difficulty.
  const paramsNow = () => (fixed && custom ? custom.params : child?.tasks?.[taskId]?.params ?? BASE_PARAMS);
  const [params, setParams] = useState(paramsNow);
  const durationSec = params ? gameDurationSec(taskId, params) : 30;

  useTicker(paused || phase !== 'play', (dt) => setElapsedMs((e) => e + dt), 200);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (count === 0) {
      const t = setTimeout(() => setPhase('play'), 550);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, count]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'play') {
        setPaused(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [phase]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && phase === 'play') setPaused(true);
    });
    return () => sub.remove();
  }, [phase]);

  if (!child || !params || !meta) return null;
  const first = firstName(child.name);

  const start = () => {
    setParams(paramsNow());
    setShared('idle');
    setElapsedMs(0);
    setCount(3);
    setPaused(false);
    setResult(null);
    setRound((n) => n + 1);
    startedAt.current = Date.now();
    setPhase('countdown');
  };

  const finish = (res: GameResult) => {
    const saved = child.tasks[taskId] ?? { enabled: true, params: BASE_PARAMS, locked: [], streak: 0 };
    const state = fixed ? { ...saved, params } : saved;
    const metrics = { ...res, completed: true };
    const a = adaptTrain(taskId, state, metrics);
    const block: BlockResult = {
      taskId,
      params: state.params,
      metrics,
      accuracy: a.accuracy,
      // Fixed activities don't move the difficulty, so report no changes.
      changes: fixed ? [] : a.changes,
      summary: a.summary,
      levelBefore: taskLevel(task, state.params),
      levelAfter: fixed ? taskLevel(task, state.params) : taskLevel(task, a.next.params),
    };
    const stars = starsFor(blockAccuracy(metrics));
    const sessionId = uid();
    recordSession(
      {
        id: sessionId,
        childId: child.id,
        startedAt: new Date(startedAt.current).toISOString(),
        activeSec: res.activeSec,
        by: role,
        blocks: [block],
        observation: 'stayed',
        rewards: stars,
        kind: 'practice',
      },
      fixed ? {} : { [taskId]: a.next },
    );
    lastSession.current = sessionId;
    if (visitId) addVisitSession(visitId, sessionId);
    setResult({ block, stars });
    setPhase('result');
  };

  const quit = () => navigation.goBack();
  // The next game can be a Focus game or a Skill Builder.
  const goNext = () => (openPlanStep(navigation, childId, next, { visitId, replace: true }) ? undefined : quit());
  const left = Math.max(0, Math.ceil(durationSec - elapsedMs / 1000));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeroScene heroes={heroes} scene={scene}>
      {phase !== 'result' && (
        <>
          <View style={styles.header}>
            <Pressable
              onPress={() => (phase === 'play' ? setPaused(true) : quit())}
              style={styles.close}
              hitSlop={8}
              accessibilityLabel={phase === 'play' ? t('Pause') : t('Close')}
            >
              <Feather name="x" size={20} color={colors.inkSoft} />
            </Pressable>
            <Text style={styles.headerIcon}>{meta.icon}</Text>
            <Text style={[styles.title, ink && { color: ink }]} numberOfLines={1}>
              {custom?.name ?? t(meta.title)}
            </Text>
            <Text style={[styles.timer, ink && { color: ink }]}>{phase === 'play' ? `${left}s` : `${durationSec}s`}</Text>
            {phase === 'play' && hero && <HeroBuddy hero={hero} message={cheer.msg} cheerKey={cheer.key} mood={cheer.mood} calm={calmMode} />}
          </View>
          <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
            <ProgressBar value={phase === 'play' ? Math.min(1, elapsedMs / (durationSec * 1000)) : 0} color={meta.color} height={5} />
          </View>
        </>
      )}

      {phase === 'intro' && (
        <View style={styles.center}>
          {hero ? (
            <HeroSays hero={hero} text={heroLines.hello(hero, first, custom?.name ?? meta.title)} size={104} />
          ) : (
            <View style={[styles.introIcon, { backgroundColor: meta.tint }]}>
              <Text style={{ fontSize: 52, lineHeight: 64 }}>{meta.icon}</Text>
            </View>
          )}
          <Text style={[styles.introSkill, ink && { color: ink }]}>
            {meta.icon} {custom ? t('FROM YOUR THERAPIST') : t(meta.skill).toUpperCase()}
          </Text>
          <Text style={[styles.introTitle, ink && { color: ink }]}>{custom?.name ?? t(meta.title)}</Text>
          {!!custom?.instructions && (
            <View style={[styles.howCard, styles.therapistCard]}>
              <Text style={styles.therapistLabel}>
                {t('Therapist’s note')}{custom.supportLevel ? ` · ${SUPPORT_LEVELS.find((l) => l.value === custom.supportLevel)?.emoji} ${t(SUPPORT_LEVELS.find((l) => l.value === custom.supportLevel)?.label ?? '')}` : ''}
              </Text>
              <Text style={styles.howText}>{custom.instructions}</Text>
            </View>
          )}
          <View style={styles.howCard}>
            {meta.howTo.map((raw, i) => {
              // Tap the Stars uses the hero as its target, so the how-to should say so.
              const line = hero && taskId === 'starWatch' ? t(raw).replace(/a star ⭐/i, `${hero.name} ${hero.emoji}`).replace('⭐', hero.emoji) : t(raw);
              return (
                <View key={i} style={styles.howRow}>
                  <View style={[styles.howNum, { backgroundColor: meta.tint }]}>
                    <Text style={[styles.howNumText, { color: meta.color }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.howText}>{line}</Text>
                </View>
              );
            })}
          </View>
          <Text style={[styles.introMeta, ink && { color: ink }]}>
            {t('Level {{n}} · {{sec}} seconds', { n: taskLevel(task, params), sec: durationSec })}
          </Text>
          <Pressable onPress={start} style={[styles.startBtn, { backgroundColor: meta.color }]} accessibilityRole="button">
            <Feather name="play" size={20} color={colors.white} />
            <Text style={styles.startText}>{t('Start')}</Text>
          </Pressable>
        </View>
      )}

      {phase === 'countdown' && (
        <View style={styles.center}>
          {hero && <HeroSticker hero={hero} size={110} showName style={{ marginBottom: 18 }} />}
          <Text style={[styles.countLabel, ink && { color: ink }]}>{hero ? `${heroLines.ready()} ` : ''}{t('Get ready, {{name}}!', { name: first })}</Text>
          <Text key={count} style={[styles.count, { color: meta.color }]}>
            {count === 0 ? t('Go!') : count}
          </Text>
        </View>
      )}

      {phase === 'play' && (
        <View style={[styles.gameWrap, onDark && styles.darkPanel]}>
          <GameEnvContext.Provider value={{ calm: calmMode, young: child.age <= 6, onFrustrated: () => {}, hero, heroes, onCheer }}>
            <meta.Game
              key={round}
              params={params}
              durationSec={durationSec}
              paused={paused}
              onCorrect={() => {}}
              onDone={finish}
            />
          </GameEnvContext.Provider>
        </View>
      )}

      {phase === 'result' && result && (
        <Results
          name={first}
          color={meta.color}
          block={result.block}
          stars={result.stars}
          hero={hero}
          ink={ink}
          shareState={role === 'parent' ? shared : undefined}
          onShare={async () => {
            const session = useStore.getState().sessions.find((x) => x.id === lastSession.current);
            if (!session) return;
            setShared('sending');
            try {
              await postToConversation(child.id, role, { text: '', card: resultCard(session, result.block, result.stars, custom ? { title: custom.name, heroEmoji: custom.hero?.emoji } : undefined) });
              setShared('sent');
            } catch {
              setShared('error');
            }
          }}
          onProgress={() => navigation.navigate('Tabs', { screen: 'Progress' })}
          onAgain={start}
          onBack={quit}
          inTraining={!!route.params.next}
          nextTitle={next[0] ? planTitle(child, next[0], libraryVersions) : undefined}
          clinic={!!visitId}
          onNext={goNext}
        />
      )}

      {visitId && phase !== 'result' && (
        <TherapistBar
          visitId={visitId}
          taskId={taskId}
          level={taskLevel(task, params)}
          canTune={phase === 'intro' && !fixed}
          onTune={(delta) => {
            // The therapist's change is kept on the child's level, so home practice continues from it.
            const tuned = nudgeParams(taskId, params, delta);
            setTaskParam(child.id, taskId, meta.adapts, tuned[meta.adapts]);
            setParams(tuned);
          }}
          onSkip={goNext}
          hasNext={!!next[0]}
        />
      )}

      {paused && phase === 'play' && (
        <View style={styles.overlay}>
          <View style={styles.pauseCard}>
            <Text style={{ fontSize: 40, lineHeight: 50 }}>⏸️</Text>
            <Text style={styles.pauseTitle}>{t('Paused')}</Text>
            <Text style={styles.pauseSub}>{t('Take a breath. The timer is stopped.')}</Text>
            <Button label={t('Keep playing')} icon="play" onPress={() => setPaused(false)} style={{ alignSelf: 'stretch', marginTop: 18 }} />
            <Button label={t('Quit game')} icon="x" variant="soft" onPress={quit} style={{ alignSelf: 'stretch', marginTop: 10 }} />
          </View>
        </View>
      )}
      </HeroScene>
    </SafeAreaView>
  );
}

function Results({
  name,
  color,
  block,
  stars,
  hero,
  ink,
  shareState,
  onShare,
  onProgress,
  onAgain,
  onBack,
  inTraining,
  nextTitle,
  onNext,
  clinic,
}: {
  name: string;
  color: string;
  block: BlockResult;
  stars: number;
  hero: Character | null;
  /** Light text for night-world scenes. */
  ink?: string;
  /** Parents only: state of "Share with therapist". */
  shareState?: 'idle' | 'sending' | 'sent' | 'error';
  onShare: () => void;
  onProgress: () => void;
  onAgain: () => void;
  onBack: () => void;
  /** Part of today's training from the start flow: offer the next game (or finish). */
  inTraining?: boolean;
  nextTitle?: string;
  onNext: () => void;
  /** Played in a clinic session: the last game leads to the therapist's wrap-up. */
  clinic?: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.results} showsVerticalScrollIndicator={false}>
      {hero ? <HeroSays hero={hero} text={heroLines.done(stars, name)} size={104} /> : <Text style={{ fontSize: 56, lineHeight: 68 }}>{cheerEmoji(stars)}</Text>}
      <Text style={[styles.resEyebrow, ink && { color: ink }]}>{t('Session complete')}</Text>
      <Text style={[styles.resTitle, ink && { color: ink }]}>{headline(stars)}</Text>
      <View style={styles.starsRow}>
        {[0, 1, 2].map((i) => (
          <Text key={i} style={[styles.star, i >= stars && { opacity: 0.2 }]}>
            ⭐
          </Text>
        ))}
      </View>
      <Text style={[styles.resSub, ink && { color: ink }]}>
        {stars === 1 ? t('{{name}} earned 1 star', { name }) : t('{{name}} earned {{n}} stars', { name, n: stars })}
      </Text>

      <View style={{ alignSelf: 'stretch', marginTop: 28 }}>
        <BlockResultCard block={block} />
      </View>

      {inTraining && (
        <Pressable onPress={onNext} style={[styles.primary, { backgroundColor: color }]} accessibilityRole="button">
          <Text style={styles.primaryText}>{nextTitle ? t('Next game: {{game}}', { game: t(nextTitle) }) : clinic ? t('Finish & wrap up') : t('Finish training 🎉')}</Text>
          <Feather name={flipIcon('arrow-right')} size={18} color={colors.white} />
        </Pressable>
      )}
      <Pressable onPress={onAgain} style={[styles.primary, inTraining ? styles.share : { backgroundColor: color }, inTraining && { marginTop: 10 }]} accessibilityRole="button">
        <Feather name="rotate-ccw" size={18} color={inTraining ? colors.forest : colors.white} />
        <Text style={[styles.primaryText, inTraining && { color: colors.forest }]}>{t('Play again')}</Text>
      </Pressable>
      {shareState && (
        <Pressable
          onPress={onShare}
          disabled={shareState === 'sending' || shareState === 'sent'}
          style={[styles.primary, styles.share, shareState === 'sent' && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Feather name={shareState === 'sent' ? 'check' : 'send'} size={18} color={colors.forest} />
          <Text style={[styles.primaryText, { color: colors.forest }]}>
            {t(shareState === 'sent' ? 'Shared with therapist' : shareState === 'sending' ? 'Sharing…' : shareState === 'error' ? 'Try sharing again' : 'Share with therapist')}
          </Text>
        </Pressable>
      )}
      {!inTraining && (
        <Pressable onPress={onProgress} style={[styles.primary, { backgroundColor: colors.forest, marginTop: 10 }]} accessibilityRole="button">
          <Text style={styles.primaryText}>{t('See progress')}</Text>
          <Feather name={flipIcon('arrow-right')} size={18} color={colors.white} />
        </Pressable>
      )}
      <Pressable onPress={onBack} style={{ paddingVertical: 14 }} accessibilityRole="button">
        <Text style={styles.backText}>{inTraining ? t('Stop for now') : t('Back to training')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBFAF7' },
  // Note: the hero scene paints the background under everything else.
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEECE6', alignItems: 'center', justifyContent: 'center' },
  headerIcon: { fontSize: 18, lineHeight: 24 },
  title: { flex: 1, fontFamily: font.heavy, fontSize: 17, color: colors.ink },
  timer: { fontFamily: font.semibold, fontSize: 14, color: colors.inkMuted, minWidth: 32, textAlign: 'right' },
  // In night worlds the game sits on a light panel so its text stays readable.
  darkPanel: { marginHorizontal: 10, marginBottom: 10, paddingTop: 12, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.94)' },
  gameWrap: { flex: 1, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  introIcon: { width: 104, height: 104, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  heroBadge: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLine: { marginTop: 8, fontFamily: font.semibold, fontSize: 15, color: colors.forest },
  therapistCard: { backgroundColor: colors.mint, borderColor: colors.mint, gap: 6, marginTop: 14 },
  therapistLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.8, color: colors.forest },
  share: { marginTop: 10, backgroundColor: colors.mint },
  introSkill: { marginTop: 18, fontFamily: font.bold, fontSize: 12, letterSpacing: 1.6, color: colors.inkMuted },
  introTitle: { marginTop: 4, fontFamily: font.heavy, fontSize: 28, color: colors.ink },
  howCard: {
    alignSelf: 'stretch',
    marginTop: 22,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  howNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  howNumText: { fontFamily: font.heavy, fontSize: 14 },
  howText: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink, lineHeight: 21 },
  introMeta: { marginTop: 16, fontFamily: font.medium, fontSize: 13, color: colors.inkMuted },
  startBtn: {
    marginTop: 20,
    alignSelf: 'stretch',
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startText: { fontFamily: font.bold, fontSize: 18, color: colors.white },
  countLabel: { fontFamily: font.semibold, fontSize: 18, color: colors.inkSoft },
  count: { fontFamily: font.heavy, fontSize: 96, lineHeight: 116, marginTop: 8 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30,58,47,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pauseCard: { width: '100%', maxWidth: 380, backgroundColor: colors.white, borderRadius: 24, padding: 24, alignItems: 'center' },
  pauseTitle: { fontFamily: font.heavy, fontSize: 24, color: colors.ink, marginTop: 6 },
  pauseSub: { fontFamily: font.regular, fontSize: 15, color: colors.inkSoft, marginTop: 4, textAlign: 'center' },
  results: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 36, paddingBottom: 24 },
  resEyebrow: { marginTop: 10, fontFamily: font.medium, fontSize: 14, color: colors.inkSoft },
  resTitle: { fontFamily: font.heavy, fontSize: 28, color: colors.ink, marginTop: 2 },
  starsRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  star: { fontSize: 30, lineHeight: 38 },
  resSub: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, marginTop: 6 },
  primary: {
    alignSelf: 'stretch',
    marginTop: 20,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontFamily: font.bold, fontSize: 16, color: colors.white },
  backText: { fontFamily: font.semibold, fontSize: 15, color: colors.inkSoft },
});
