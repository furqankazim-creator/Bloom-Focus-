import { flipIcon } from '../../components/ui';
import { Feather } from '@expo/vector-icons';
import { t } from '../../i18n';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LIBRARY_ART } from '../../library/art';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Confetti } from '../../components/Confetti';
import { FAMILY, LEVEL_NAMES, MODE_INFO, RATING_STARS, isLibraryFamily } from '../../library/catalog';
import { hasPrintable } from '../../library/printables';
import type { RootProps } from '../../navigation/types';
import { postToConversation } from '../../services/messaging';
import { therapistLabel, uid } from '../../store/seed';
import { useChild, useStore } from '../../store/useStore';
import { colors, font } from '../../theme';
import { printSheet } from '../../library/print';
import { firstName } from '../helpers';
import { heroesFor } from '../../engine/heroes';

type Rating = 'easy' | 'ok' | 'hard';
const RATINGS: { id: Rating; emoji: string; label: string }[] = [
  { id: 'easy', emoji: '😄', label: 'Easy' },
  { id: 'ok', emoji: '🙂', label: 'Just right' },
  { id: 'hard', emoji: '😓', label: 'Hard' },
];

/** Flashcards for a paper / flashcard activity: one step per card, then "how did it go?". */
export default function LibraryStepsScreen({ route, navigation }: RootProps<'LibrarySteps'>) {
  const { childId, activityId, preview } = route.params;
  const child = useChild(childId);
  const role = useStore((s) => s.role) ?? 'parent';
  const recordLibraryPlay = useStore((s) => s.recordLibraryPlay);
  const activity = activityId ? child?.customActivities?.find((a) => a.id === activityId) : undefined;
  const familyId = activity?.library?.family ?? route.params.family ?? '';
  const f = isLibraryFamily(familyId) ? FAMILY[familyId] : undefined;
  const level = activity?.library?.level ?? route.params.level ?? 1;
  const [i, setI] = useState(0);
  const [started] = useState(() => Date.now());
  const [done, setDone] = useState<Rating | null>(null);
  const [sent, setSent] = useState(false);

  if (!child || !f) return null;
  const first = firstName(child.name);
  // Card 0 = what you need, then one card per step, then the "how did it go" card.
  const cards = f.steps.length + 2;
  const last = i === cards - 1;
  const mode = MODE_INFO[f.mode];

  const finish = async (rating: Rating) => {
    setDone(rating);
    if (preview || !activity) return;
    recordLibraryPlay({
      id: uid(),
      childId: child.id,
      activityId: activity.id,
      family: f.id,
      level,
      playedAt: new Date().toISOString(),
      activeSec: Math.round((Date.now() - started) / 1000),
      accuracy: null,
      stars: RATING_STARS[rating],
      parentRating: rating,
    });
    if (role !== 'parent') return;
    try {
      await postToConversation(child.id, 'parent', { text: `${first} finished ${f.name} (${LEVEL_NAMES[level - 1]}). It felt ${rating === 'ok' ? 'just right' : rating} ${RATINGS.find((r) => r.id === rating)?.emoji}` });
      setSent(true);
    } catch {
      // The go is still saved on this device.
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.close} hitSlop={8} accessibilityLabel="Close">
          <Feather name="x" size={20} color={colors.inkSoft} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activity?.name || t(f.name)}
          </Text>
          <Text style={styles.headerSub}>
            {mode.emoji} {t(mode.label)} · {t(LEVEL_NAMES[level - 1])} · {t('{{n}} min', { n: f.minutes })}
          </Text>
        </View>
      </View>

      <View style={styles.progress}>
        {Array.from({ length: cards }, (_, k) => (
          <View key={k} style={[styles.pdot, k <= i && { backgroundColor: f.color }]} />
        ))}
      </View>

      <View style={styles.cardWrap}>
        <View style={[styles.card, { borderColor: f.tint }]}>
          {i === 0 && (
            <>
              <Text style={styles.kicker}>{t('BEFORE YOU START')}</Text>
              <Image source={LIBRARY_ART[f.id]} style={{ width: 96, height: 96, alignSelf: 'center' }} />
              <Text style={styles.big}>{t(f.summary)}</Text>
              {!!f.materials && <Text style={styles.small}>🧰 {t('You need:')} {t(f.materials)}</Text>}
              {!!activity?.instructions && <Text style={styles.small}>💬 {therapistLabel(child)}: “{activity.instructions}”</Text>}
              <Text style={styles.small}>{t('Sit next to {{name}}. Read each card, let {{name}} try, and help only when needed.', { name: first })}</Text>
              {hasPrintable(f.id) && (
                <Pressable onPress={() => printSheet(f.id, level, child.name, activity?.library?.custom ?? route.params.custom, heroesFor(child, activity)[0], activity?.name)} style={styles.print} accessibilityRole="button">
                  <Feather name="printer" size={16} color={colors.forest} />
                  <Text style={styles.printText}>{t('Print the colour sheet ({{level}})', { level: t(LEVEL_NAMES[level - 1]) })}</Text>
                </Pressable>
              )}
            </>
          )}
          {i > 0 && !last && (
            <>
              <Text style={[styles.kicker, { color: f.color }]}>
                {t('STEP {{i}} OF {{n}}', { i, n: f.steps.length })}
              </Text>
              <View style={[styles.stepCircle, { backgroundColor: f.tint }]}>
                <Text style={[styles.stepNum, { color: f.color }]}>{i}</Text>
              </View>
              <Text style={styles.big}>{t(f.steps[i - 1])}</Text>
            </>
          )}
          {last &&
            (done ? (
              <>
                {done !== 'hard' && <Confetti />}
                <Text style={{ fontSize: 60, textAlign: 'center' }}>🌟</Text>
                <Text style={styles.big}>{t('Well done, {{name}}!', { name: first })}</Text>
                <Text style={styles.small}>
                  {preview ? t('Preview — nothing was saved.') : sent ? t('{{who}} has been told how it went.', { who: therapistLabel(child) }) : t('Saved.')}
                  {done === 'hard' && !preview ? ` ${t('Next time it will be a little easier.')}` : ''}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.kicker}>{t('ALL DONE?')}</Text>
                <Text style={styles.big}>{t('How did it go for {{name}}?', { name: first })}</Text>
                <View style={styles.ratings}>
                  {RATINGS.map((r) => (
                    <Pressable key={r.id} onPress={() => finish(r.id)} style={styles.rating} accessibilityRole="button">
                      <Text style={{ fontSize: 34 }}>{r.emoji}</Text>
                      <Text style={styles.ratingText}>{t(r.label)}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ))}
        </View>
      </View>

      <View style={styles.nav}>
        <Pressable onPress={() => setI(Math.max(0, i - 1))} disabled={i === 0} style={[styles.navBtn, i === 0 && { opacity: 0.4 }]} accessibilityRole="button">
          <Feather name={flipIcon('arrow-left')} size={20} color={colors.forest} />
          <Text style={styles.navText}>{t('Back')}</Text>
        </Pressable>
        {last ? (
          <Pressable onPress={() => navigation.goBack()} style={[styles.navBtn, styles.navMain]} accessibilityRole="button">
            <Text style={[styles.navText, { color: colors.white }]}>{done ? t('Finish') : t('Close')}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setI(i + 1)} style={[styles.navBtn, styles.navMain, { backgroundColor: f.color }]} accessibilityRole="button">
            <Text style={[styles.navText, { color: colors.white }]}>{i === 0 ? t('Start') : t('Next step')}</Text>
            <Feather name={flipIcon('arrow-right')} size={20} color={colors.white} />
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.soft },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: font.bold, fontSize: 18, color: colors.ink },
  headerSub: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, marginTop: 1 },
  progress: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 6 },
  pdot: { width: 22, height: 6, borderRadius: 3, backgroundColor: '#DCDAD2' },
  cardWrap: { flex: 1, padding: 16, justifyContent: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 28, padding: 24, gap: 14, borderWidth: 3, minHeight: 360, justifyContent: 'center' },
  kicker: { fontFamily: font.bold, fontSize: 12, letterSpacing: 1.5, color: colors.inkSoft, textAlign: 'center' },
  stepCircle: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  stepNum: { fontFamily: font.heavy, fontSize: 40 },
  big: { fontFamily: font.bold, fontSize: 22, lineHeight: 30, color: colors.ink, textAlign: 'center' },
  small: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.inkSoft, textAlign: 'center' },
  print: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 14, backgroundColor: colors.sage },
  printText: { fontFamily: font.semibold, fontSize: 14, color: colors.forest },
  ratings: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  rating: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: colors.bg, borderRadius: 18, paddingVertical: 14 },
  ratingText: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  nav: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  navBtn: { flex: 1, height: 56, borderRadius: 18, backgroundColor: colors.sage, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  navMain: { flex: 2, backgroundColor: colors.forest },
  navText: { fontFamily: font.bold, fontSize: 16, color: colors.forest },
});
