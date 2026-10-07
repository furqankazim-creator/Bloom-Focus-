import { t } from '../i18n';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TEMPLATE, levelName, starsFromAccuracy } from '../engine/studio';
import { WORLDS, heroLines, heroesFor, sceneFor, worldOf } from '../engine/heroes';
import { HeroScene } from '../components/hero/HeroScene';
import { HeroBuddy } from '../components/hero/HeroBuddy';
import { HeroSays } from '../components/hero/HeroSticker';
import { STUDIO_GAMES } from '../games/studio';
import type { StudioResult } from '../games/studio/shared';
import type { RootProps } from '../navigation/types';
import { postToConversation } from '../services/messaging';
import { uid } from '../store/seed';
import { useChild, useStore } from '../store/useStore';
import { lightColors as colors, font } from '../theme';
import { firstName } from './helpers';

/** Plays one therapist-made Game Studio game: intro → game → results (and share). */
export default function StudioPlayScreen({ route, navigation }: RootProps<'StudioPlay'>) {
  const { childId, activityId, preview } = route.params;
  const child = useChild(childId);
  const role = useStore((s) => s.role) ?? 'parent';
  const recordStudioPlay = useStore((s) => s.recordStudioPlay);
  const calmMode = useStore((s) => s.calmMode);
  const activity = child?.customActivities?.find((a) => a.id === activityId);
  const [phase, setPhase] = useState<'intro' | 'play' | 'result'>('intro');
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<{ stars: number; accuracy: number | null; levelChange: number; playId: string; activeSec: number; level: number } | null>(null);
  const [shared, setShared] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!child || !activity?.studio) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.title}>{t('This game isn’t on this device')}</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('Go back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const game = activity.studio;
  const info = TEMPLATE[game.content.template];
  const Game = STUDIO_GAMES[game.content.template];
  const first = firstName(child.name);
  const heroes = heroesFor(child, activity);
  const hero = heroes[0];
  const scene = sceneFor(child, activity, calmMode);
  const ink = scene === 'bold' && hero && WORLDS[worldOf(hero)].dark ? colors.white : undefined;

  const finish = (r: StudioResult) => {
    const stars = starsFromAccuracy(r.accuracy);
    const playId = uid();
    let levelChange = 0;
    if (!preview) {
      ({ levelChange } = recordStudioPlay({
        id: playId,
        childId: child.id,
        activityId: activity.id,
        template: game.content.template,
        playedAt: new Date().toISOString(),
        activeSec: r.activeSec,
        accuracy: r.accuracy,
        stars,
        level: game.level,
        ...(r.strokes ? { strokes: r.strokes } : {}),
      }));
    }
    setResult({ stars, accuracy: r.accuracy, levelChange, playId, activeSec: r.activeSec, level: game.level });
    setShared('idle');
    setPhase('result');
  };

  const share = async () => {
    if (!result) return;
    setShared('sending');
    try {
      await postToConversation(child.id, role, {
        text: '',
        card: {
          type: 'studio',
          activityId: activity.id,
          template: game.content.template,
          title: activity.name,
          playId: result.playId,
          accuracy: result.accuracy,
          stars: result.stars,
          activeSec: result.activeSec,
          level: result.level,
        },
      });
      setShared('sent');
    } catch {
      setShared('error');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeroScene heroes={heroes} scene={scene}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.close} hitSlop={8} accessibilityLabel="Close">
          <Feather name="x" size={20} color={colors.inkSoft} />
        </Pressable>
        <Text style={{ fontSize: 18 }}>{activity.hero?.emoji ?? info.icon}</Text>
        <Text style={[styles.headerTitle, ink && { color: ink }]} numberOfLines={1}>
          {activity.name}
        </Text>
        {preview && <Text style={styles.previewTag}>{t('Preview')}</Text>}
        {phase === 'play' && hero && <HeroBuddy hero={hero} message={null} cheerKey={0} mood="idle" calm={calmMode} />}
      </View>

      {phase === 'intro' && (
        <ScrollView contentContainerStyle={styles.center}>
          {hero ? (
            <HeroSays hero={hero} text={heroLines.hello(hero, first, activity.name)} size={100} />
          ) : (
            <View style={[styles.icon, { backgroundColor: info.tint }]}>
              <Text style={{ fontSize: 56 }}>{info.icon}</Text>
            </View>
          )}
          <Text style={[styles.kicker, { color: info.color }]}>{preview ? `${t('PREVIEW')} · ` : ''}{t('FROM YOUR THERAPIST')}</Text>
          <Text style={[styles.title, ink && { color: ink }]}>{activity.name}</Text>
          <Text style={[styles.meta, ink && { color: ink }]}>
            {t(info.name)}
            {info.levelled ? ` · ${t(levelName(game.level))}` : ''}
          </Text>
          <View style={styles.note}>
            <Text style={styles.noteText}>{activity.instructions || t(info.instructions)}</Text>
          </View>
          <Pressable onPress={() => setPhase('play')} style={[styles.primary, { backgroundColor: info.color }]} accessibilityRole="button">
            <Feather name="play" size={20} color={colors.white} />
            <Text style={styles.primaryText}>{t('Start')}</Text>
          </Pressable>
        </ScrollView>
      )}

      {phase === 'play' && (
        <ScrollView
          contentContainerStyle={[{ padding: 16, paddingBottom: 40 }, ink && styles.darkPanel]}
          scrollEnabled={game.content.template !== 'worksheet'}
        >
          <Game key={round} content={game.content} level={game.level} onDone={finish} />
        </ScrollView>
      )}

      {phase === 'result' && result && (
        <ScrollView contentContainerStyle={styles.center}>
          {hero ? <HeroSays hero={hero} text={heroLines.done(result.stars, first)} size={100} /> : <Text style={{ fontSize: 60 }}>{result.stars === 3 ? '🎉' : '🌟'}</Text>}
          <Text style={styles.title}>
            {t(game.content.template === 'worksheet' ? 'Worksheet finished!' : ['', 'Good try!', 'Nice work!', 'Amazing!'][result.stars])}
          </Text>
          <Text style={styles.stars}>
            {'⭐'.repeat(result.stars)}
            <Text style={{ opacity: 0.2 }}>{'⭐'.repeat(3 - result.stars)}</Text>
          </Text>
          {result.accuracy !== null && <Text style={styles.meta}>{Math.round(result.accuracy * 100)}% · {result.activeSec}s</Text>}
          {result.levelChange !== 0 && (
            <Text style={styles.level}>
              {t(result.levelChange > 0 ? '⬆ Next time will be a little harder' : '⬇ Next time will be a little easier')}
            </Text>
          )}
          <Text style={styles.meta}>{preview ? t('Preview only — nothing was saved.') : t('{{name}} played {{game}}.', { name: first, game: activity.name })}</Text>
          {!preview && role === 'parent' && (
            <Pressable onPress={() => void share()} disabled={shared === 'sending' || shared === 'sent'} style={[styles.primary, styles.share]} accessibilityRole="button">
              <Feather name={shared === 'sent' ? 'check' : 'send'} size={18} color={colors.forest} />
              <Text style={[styles.primaryText, { color: colors.forest }]}>
                {t(shared === 'sent' ? 'Shared with therapist' : shared === 'sending' ? 'Sharing…' : shared === 'error' ? 'Try sharing again' : game.content.template === 'worksheet' ? 'Send worksheet to therapist' : 'Share with therapist')}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              setRound((r) => r + 1);
              setPhase('intro');
            }}
            style={[styles.primary, { backgroundColor: info.color }]}
            accessibilityRole="button"
          >
            <Feather name="rotate-ccw" size={18} color={colors.white} />
            <Text style={styles.primaryText}>{t('Play again')}</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} style={styles.secondary} accessibilityRole="button">
            <Text style={styles.secondaryText}>{t('Done')}</Text>
          </Pressable>
        </ScrollView>
      )}
      </HeroScene>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBFAF7' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EEECE6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: font.heavy, fontSize: 17, color: colors.ink },
  // In night worlds the game sits on a light panel so its text stays readable.
  darkPanel: { margin: 12, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.94)' },
  previewTag: { fontFamily: font.bold, fontSize: 11, color: colors.white, backgroundColor: colors.inkSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  icon: { width: 110, height: 110, borderRadius: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  hero: { position: 'absolute', right: -10, bottom: -10, width: 46, height: 46, borderRadius: 23, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  kicker: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.4 },
  title: { fontFamily: font.heavy, fontSize: 26, color: colors.ink, textAlign: 'center' },
  meta: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft, textAlign: 'center' },
  note: { alignSelf: 'stretch', maxWidth: 480, marginTop: 14, padding: 16, borderRadius: 18, backgroundColor: colors.mint },
  noteText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', maxWidth: 420, height: 54, borderRadius: 27, marginTop: 14 },
  primaryText: { fontFamily: font.bold, fontSize: 17, color: colors.white },
  share: { backgroundColor: colors.mint },
  secondary: { paddingVertical: 14 },
  secondaryText: { fontFamily: font.semibold, fontSize: 15, color: colors.inkSoft },
  stars: { fontSize: 34, letterSpacing: 4, marginVertical: 6 },
  level: { fontFamily: font.semibold, fontSize: 14, color: colors.forest, marginTop: 4 },
});
