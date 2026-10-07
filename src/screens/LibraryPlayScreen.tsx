import { Feather } from '@expo/vector-icons';
import { t } from '../i18n';
import React, { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LIBRARY_ART } from '../library/art';
import { GameCheer, SheetTheme } from '../library/games/shared';
import { configFor } from '../library/settings';
import { HeroBuddy } from '../components/hero/HeroBuddy';
import { HeroScene } from '../components/hero/HeroScene';
import { printSheet } from '../library/print';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Confetti } from '../components/Confetti';
import { HeroSays } from '../components/hero/HeroSticker';
import { heroLines, heroesFor, sceneFor } from '../engine/heroes';
import { FAMILY, LEVEL_NAMES, isLibraryFamily, starsFor } from '../library/catalog';
import { LIBRARY_GAMES } from '../library/games';
import type { LibraryResult } from '../library/games/shared';
import type { RootProps } from '../navigation/types';
import { postToConversation } from '../services/messaging';
import { therapistLabel, uid } from '../store/seed';
import { useChild, useStore } from '../store/useStore';
import { lightColors as colors, font } from '../theme';
import { firstName } from './helpers';
import { TherapistBar } from '../components/TherapistBar';
import { formatDuration, planTitle } from '../engine/clinic';
import { openPlanStep } from './planChain';

/** Plays an Activity Library game: intro → game → results (moves the level for assigned activities). */
export default function LibraryPlayScreen({ route, navigation }: RootProps<'LibraryPlay'>) {
  const { childId, activityId, preview, visitId, next = [] } = route.params;
  const child = useChild(childId);
  const role = useStore((s) => s.role) ?? 'parent';
  const recordLibraryPlay = useStore((s) => s.recordLibraryPlay);
  const addVisitLibraryPlay = useStore((s) => s.addVisitLibraryPlay);
  const libraryVersions = useStore((s) => s.libraryVersions);
  const version = libraryVersions.find((v) => v.id === (route.params.versionId ?? activity?.library?.versionId));
  const activity = activityId ? child?.customActivities?.find((a) => a.id === activityId) : undefined;
  const familyId = activity?.library?.family ?? route.params.family ?? '';
  const f = isLibraryFamily(familyId) ? FAMILY[familyId] : undefined;
  const level = activity?.library?.level ?? route.params.level ?? 1;
  const calmMode = useStore((s) => s.calmMode);
  // Settings: the assigned activity's own, or the ones passed in for a preview.
  const custom = activity?.library?.custom ?? route.params.custom ?? version?.custom;
  const [cheer, setCheer] = useState<{ key: number; mood: 'good' | 'oops' | 'idle'; msg: string | null }>({ key: 0, mood: 'idle', msg: null });
  const streak = useRef(0);
  useEffect(() => {
    if (!cheer.msg) return;
    const t = setTimeout(() => setCheer((c) => ({ ...c, msg: null })), 1400);
    return () => clearTimeout(t);
  }, [cheer.key]); // eslint-disable-line react-hooks/exhaustive-deps
  // The buddy talks on the first hit, on streaks and now and then, so it encourages without nagging.
  const onCheer = (good: boolean) => {
    streak.current = good ? streak.current + 1 : 0;
    const n = streak.current;
    setCheer((c) => ({
      key: c.key + 1,
      mood: good ? 'good' : 'oops',
      msg: !good ? heroLines.oops() : n >= 3 && n % 3 === 0 ? heroLines.streak(n) : n === 1 || Math.random() < 0.3 ? heroLines.good() : null,
    }));
  };
  const [phase, setPhase] = useState<'intro' | 'play' | 'result'>('intro');
  const [seed, setSeed] = useState(() => Date.now());
  const [result, setResult] = useState<{ stars: number; accuracy: number | null; levelChange: number; activeSec: number } | null>(null);
  const [sent, setSent] = useState<'idle' | 'sent' | 'error'>('idle');
  const Game = f ? LIBRARY_GAMES[f.id] : undefined;

  if (!child || !f || !Game) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.title}>{t('This activity isn’t available')}</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('Go back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
  const first = firstName(child.name);
  const heroes = activity ? heroesFor(child, activity) : route.params.heroes ?? (version?.heroes.length ? version.heroes : heroesFor(child));
  const hero = heroes[0];
  const scene = sceneFor(child, activity ?? (route.params.scene ? { scene: route.params.scene } : version ? { scene: version.scene } : undefined), calmMode);
  const config = configFor(f.id, level, custom);
  const title = activity?.name || version?.name || t(f.name);
  const inPlan = !!visitId || next.length > 0;
  const nextTitle = next[0] ? planTitle(child, next[0], libraryVersions) : undefined;
  const goNext = () => (openPlanStep(navigation, child.id, next, { visitId, replace: true }) ? undefined : navigation.goBack());

  const finish = (r: LibraryResult) => {
    const stars = starsFor(r.accuracy);
    let levelChange = 0;
    if (!preview && (activity || visitId)) {
      const playId = uid();
      if (visitId) addVisitLibraryPlay(visitId, playId);
      ({ levelChange } = recordLibraryPlay({
        id: playId,
        childId: child.id,
        // Clinic-only plays (not assigned for home) are tagged with the visit.
        activityId: activity?.id ?? `visit-${visitId}`,
        family: f.id,
        level,
        playedAt: new Date().toISOString(),
        activeSec: r.activeSec,
        accuracy: r.accuracy,
        stars,
      }));
    }
    setResult({ stars, accuracy: r.accuracy, levelChange, activeSec: r.activeSec });
    setSent('idle');
    setPhase('result');
  };

  const again = () => {
    setSeed(Date.now());
    setResult(null);
    setPhase('play');
  };

  const tell = async () => {
    if (!result) return;
    try {
      await postToConversation(child.id, role, {
        text: `${first} played ${f.name} (${LEVEL_NAMES[level - 1]}): ${'⭐'.repeat(result.stars)}${result.accuracy !== null ? ` · ${Math.round(result.accuracy * 100)}%` : ''} in ${formatDuration(result.activeSec)}.`,
      });
      setSent('sent');
    } catch {
      setSent('error');
    }
  };

  return (
    <SheetTheme.Provider value={{ color: f.color, tint: f.tint }}>
    <LinearGradient colors={[f.tint, '#FFFDF8']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 0.6 }} style={{ flex: 1 }}>
    <SafeAreaView style={[styles.screen, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <HeroScene heroes={heroes} scene={phase === 'play' ? scene : 'off'}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.close} hitSlop={8} accessibilityLabel="Close">
          <Feather name="x" size={20} color={colors.inkSoft} />
        </Pressable>
        <Image source={LIBRARY_ART[f.id]} style={{ width: 30, height: 30 }} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.levelPill, { backgroundColor: f.tint }]}>
          <Text style={[styles.levelPillText, { color: f.color }]}>{t(LEVEL_NAMES[level - 1])}</Text>
        </View>
        {phase === 'play' && hero && <HeroBuddy hero={hero} message={cheer.msg} cheerKey={cheer.key} mood={cheer.mood} calm={calmMode} />}
      </View>

      {phase === 'intro' && (
        <ScrollView contentContainerStyle={styles.body}>
          {hero ? (
            <HeroSays hero={hero} text={heroLines.hello(hero, first, title)} size={96} />
          ) : (
            <View style={[styles.bigIcon, { backgroundColor: '#FFFFFFCC' }]}>
              <Image source={LIBRARY_ART[f.id]} style={{ width: 84, height: 84 }} />
            </View>
          )}
          <Text style={[styles.skill, { color: f.color }]}>{t(f.skill).toUpperCase()}</Text>
          <Text style={styles.title}>{title}</Text>
          <View style={[styles.howCard, { borderColor: f.color + '33' }]}>
            {f.steps.map((s, i) => (
              <View key={i} style={styles.howRow}>
                <View style={[styles.howNum, { backgroundColor: f.tint }]}>
                  <Text style={[styles.howNumText, { color: f.color }]}>{i + 1}</Text>
                </View>
                <Text style={styles.howText}>{t(s)}</Text>
              </View>
            ))}
          </View>
          {!!activity?.instructions && <Text style={styles.note}>💬 {therapistLabel(child)}: “{activity.instructions}”</Text>}
          <Pressable onPress={() => setPhase('play')} style={[styles.start, { backgroundColor: f.color }]} accessibilityRole="button">
            <Feather name="play" size={20} color={colors.white} />
            <Text style={styles.startText}>{t('Start')}</Text>
          </Pressable>
          <Pressable onPress={() => printSheet(f.id, level, child.name, custom, hero, activity?.name)} style={styles.printBtn} accessibilityRole="button">
            <Feather name="printer" size={16} color={f.color} />
            <Text style={[styles.printText, { color: f.color }]}>{t('Print a colour sheet instead')}</Text>
          </Pressable>
        </ScrollView>
      )}

      {phase === 'play' && (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={{ alignSelf: 'stretch' }}>
            <GameCheer.Provider value={onCheer}>
              <Game key={seed} level={level} seed={seed} config={config} onDone={finish} />
            </GameCheer.Provider>
          </View>
        </ScrollView>
      )}

      {phase === 'result' && result && (
        <ScrollView contentContainerStyle={[styles.body, { paddingTop: 30 }]}>
          {result.stars >= 3 && <Confetti />}
          {hero ? <HeroSays hero={hero} text={heroLines.done(result.stars, first)} size={92} /> : <Text style={{ fontSize: 60 }}>{['💪', '💪', '🌟', '🎉'][result.stars]}</Text>}
          <Text style={styles.stars}>{'⭐'.repeat(result.stars)}{'☆'.repeat(3 - result.stars)}</Text>
          <Text style={styles.title}>{t(['Good try!', 'Nice effort!', 'Great job!', 'Amazing!'][result.stars])}</Text>
          <Text style={styles.meta}>
            {result.accuracy !== null ? `${t('{{n}}% correct', { n: Math.round(result.accuracy * 100) })} · ` : ''}
            {formatDuration(result.activeSec)}
          </Text>
          {result.levelChange !== 0 && (
            <View style={[styles.levelUp, result.levelChange < 0 && { backgroundColor: colors.sage }]}>
              <Text style={styles.levelUpText}>
                {result.levelChange > 0 ? `⬆️ ${t('Next time: {{level}}!', { level: t(LEVEL_NAMES[Math.min(2, level)]) })}` : t('Next time a bit easier: {{level}}', { level: t(LEVEL_NAMES[Math.max(0, level - 2)]) })}
              </Text>
            </View>
          )}
          {inPlan && (
            <Pressable onPress={goNext} style={[styles.start, { backgroundColor: f.color }]} accessibilityRole="button">
              <Feather name={nextTitle ? 'arrow-right' : 'check'} size={18} color={colors.white} />
              <Text style={styles.startText}>{nextTitle ? t('Next game: {{game}}', { game: t(nextTitle) }) : visitId ? t('Finish & wrap up') : t('Finish 🎉')}</Text>
            </Pressable>
          )}
          <Pressable onPress={again} style={inPlan ? styles.secondary : [styles.start, { backgroundColor: f.color }]} accessibilityRole="button">
            <Feather name="rotate-ccw" size={18} color={inPlan ? colors.forest : colors.white} />
            <Text style={inPlan ? styles.secondaryText : styles.startText}>{t('Play again')}</Text>
          </Pressable>
          {role === 'parent' && !preview && (
            <Pressable onPress={tell} disabled={sent === 'sent'} style={styles.secondary} accessibilityRole="button">
              <Text style={styles.secondaryText}>{sent === 'sent' ? t('Sent to {{who}} ✓', { who: therapistLabel(child) }) : sent === 'error' ? t('Couldn’t send — try again') : t('Tell {{who}}', { who: therapistLabel(child) })}</Text>
            </Pressable>
          )}
          {!inPlan && (
            <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button">
              <Text style={styles.backText}>{t('Done')}</Text>
            </Pressable>
          )}
        </ScrollView>
      )}
      {visitId && phase !== 'result' && (
        <TherapistBar visitId={visitId} taskId={`library-${f.id}`} level={LEVEL_NAMES[level - 1]} canTune={false} onTune={() => {}} onSkip={goNext} hasNext={next.length > 0} />
      )}
      </HeroScene>
    </SafeAreaView>
    </LinearGradient>
    </SheetTheme.Provider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F5EF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFFCC', alignItems: 'center', justifyContent: 'center' },
  headerEmoji: { fontSize: 22 },
  headerTitle: { flex: 1, fontFamily: font.bold, fontSize: 18, color: colors.ink },
  levelPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  levelPillText: { fontFamily: font.bold, fontSize: 12 },
  body: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 40, gap: 10, maxWidth: 560, width: '100%', alignSelf: 'center' },
  bigIcon: { width: 110, height: 110, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  skill: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.4, marginTop: 10 },
  title: { fontFamily: font.heavy, fontSize: 26, color: colors.ink, textAlign: 'center' },
  howCard: { alignSelf: 'stretch', backgroundColor: colors.white, borderRadius: 22, padding: 16, gap: 12, marginTop: 6, borderWidth: 2 },
  howRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  howNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  howNumText: { fontFamily: font.bold, fontSize: 14 },
  howText: { flex: 1, fontFamily: font.medium, fontSize: 15.5, lineHeight: 22, color: colors.ink },
  note: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  start: { alignSelf: 'stretch', height: 58, borderRadius: 20, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  startText: { fontFamily: font.bold, fontSize: 18, color: colors.white },
  stars: { fontSize: 34, marginTop: 6 },
  meta: { fontFamily: font.medium, fontSize: 15, color: colors.inkSoft },
  levelUp: { backgroundColor: '#FFF3C4', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  levelUpText: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  secondary: { alignSelf: 'stretch', height: 52, borderRadius: 18, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secondaryText: { fontFamily: font.bold, fontSize: 16, color: colors.forest },
  back: { paddingVertical: 12 },
  printBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  printText: { fontFamily: font.semibold, fontSize: 15 },
  backText: { fontFamily: font.semibold, fontSize: 16, color: colors.inkSoft },
});
