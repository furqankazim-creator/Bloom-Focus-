import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { t } from '../../i18n';
import { font } from '../../theme';
import { linksFor } from '../speech/data';
import { rng, storyRounds } from '../speech/rounds';
import { Dots, PictureTile, Prompt, type TileState } from '../speech/ui';
import { HearButton, HearYourself, say, speechLang } from '../speech/voice';
import { GameBar, LibraryGameProps, Sheet, secondsSince, useCheer, useSheetTheme } from './shared';

const ASK = { en: 'What happens first? Put the pictures in order.', ar: 'ماذا يحدث أولاً؟ رتّب الصور.', ur: 'پہلے کیا ہوتا ہے؟ تصویریں ترتیب سے لگائیں۔' } as const;
const TELL = { en: 'Now tell the story!', ar: 'الآن احكِ القصة!', ur: 'اب کہانی سنائیں!' } as const;

/**
 * Story Steps — put 3 to 5 picture cards in order, then tell the story using
 * "first / next / last" (sequencing and narrative).
 */
export default function StorySteps({ seed, onDone, config: cfg }: LibraryGameProps) {
  const theme = useSheetTheme();
  const cheer = useCheer();
  const lang = speechLang();
  const { width } = useWindowDimensions();
  const rounds = useMemo(() => storyRounds({ steps: cfg.steps, stories: cfg.stories }, rng(seed)), [seed, cfg.steps, cfg.stories]);
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [states, setStates] = useState<Record<number, TileState>>({});
  const [errors, setErrors] = useState(0);
  const [telling, setTelling] = useState(false);
  const rd = rounds[i];

  useEffect(() => {
    const id = setTimeout(() => say(ASK[lang]), 350);
    return () => clearTimeout(id);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rd) return null;
  const n = rd.order.length;
  const links = linksFor(n, lang);
  const storyText = rd.order.map((s, k) => `${links[k]}, ${rd.story.steps[s].text[lang]}.`).join(' ');

  const tap = (stepIndex: number) => {
    if (telling || placed.includes(stepIndex)) return;
    const want = rd.order[placed.length];
    if (stepIndex !== want) {
      cheer(false);
      setErrors((e) => e + 1);
      setStates((s) => ({ ...s, [stepIndex]: 'wrong' }));
      setTimeout(() => setStates((s) => ({ ...s, [stepIndex]: 'idle' })), 500);
      return;
    }
    cheer(true);
    say(rd.story.steps[stepIndex].text[lang]);
    const next = [...placed, stepIndex];
    setPlaced(next);
    setStates((s) => ({ ...s, [stepIndex]: 'faded' }));
    if (next.length === n) setTimeout(() => {
      setTelling(true);
      say(TELL[lang]);
    }, 900);
  };

  const finish = () => {
    if (i + 1 >= rounds.length) return onDone({ accuracy: Math.max(0, 1 - errors / (rounds.length * n)), activeSec: secondsSince(start.current) });
    setI(i + 1);
    setPlaced([]);
    setStates({});
    setTelling(false);
  };

  const slot = Math.min(96, Math.floor((Math.min(width, 520) - 56 - (n - 1) * 8) / n));
  const tile = Math.min(130, Math.floor((Math.min(width, 520) - 40 - 2 * 10) / 3));

  return (
    <View>
      <GameBar left={rd.story.title[lang]} right={rounds.length > 1 ? t(`Story ${i + 1} of ${rounds.length}`) : undefined} />
      {rounds.length > 1 && <Dots total={rounds.length} done={i} />}

      {!telling ? (
        <>
          <Prompt text={ASK[lang]} speak={ASK[lang]} />
          {/* The story line: slots filled in order */}
          <View style={styles.slots}>
            {rd.order.map((_, k) => {
              const s = placed[k];
              return (
                <View key={k} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={[styles.slot, { width: slot, height: slot, borderColor: s !== undefined ? theme.color : '#C9CEDF', backgroundColor: s !== undefined ? theme.tint : '#FFFFFF' }]}>
                    {s !== undefined ? <Text style={{ fontSize: slot * 0.5 }}>{rd.story.steps[s].emoji}</Text> : <Text style={[styles.slotNum, { color: theme.color }]}>{k + 1}</Text>}
                  </View>
                  <Text style={styles.link} numberOfLines={1}>{links[k]}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.cards}>
            {rd.shuffled.map((s) => (
              <PictureTile key={s} emoji={rd.story.steps[s].emoji} size={tile} state={states[s] ?? 'idle'} onPress={() => tap(s)} a11y={rd.story.steps[s].text[lang]} />
            ))}
          </View>
        </>
      ) : (
        <Sheet>
          <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
            <Text style={styles.tellTitle}>{TELL[lang]}</Text>
            <HearButton text={storyText} color={theme.color} size={48} label={t('Hear the story')} />
          </View>
          {rd.order.map((s, k) => (
            <View key={s} style={[styles.tellRow, k > 0 && styles.tellDivider]}>
              <View style={[styles.tellNum, { backgroundColor: theme.color }]}>
                <Text style={styles.tellNumText}>{k + 1}</Text>
              </View>
              <Text style={{ fontSize: 34 }}>{rd.story.steps[s].emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tellLink, { color: theme.color }]}>{links[k]}…</Text>
                <Text style={styles.tellText}>{rd.story.steps[s].text[lang]}</Text>
              </View>
            </View>
          ))}
          {cfg.tell !== false && (
            <View style={{ marginTop: 14 }}>
              <Text style={styles.tellHint}>{t('Record the child telling it, then play it back.')}</Text>
              <HearYourself color={theme.color} resetKey={i} />
            </View>
          )}
          <Pressable onPress={finish} style={({ pressed }) => [styles.next, { backgroundColor: theme.color }, pressed && { opacity: 0.85 }]} accessibilityRole="button">
            <Text style={styles.nextText}>{i + 1 >= rounds.length ? t('Finish') : t('Next story')}</Text>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </Pressable>
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  slots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 18 },
  slot: { borderRadius: 18, borderWidth: 2.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  slotNum: { fontFamily: font.heavy, fontSize: 24, opacity: 0.6 },
  link: { fontFamily: font.semibold, fontSize: 11, color: '#6B7290', maxWidth: 90 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  tellTitle: { fontFamily: font.heavy, fontSize: 21, color: '#2E3352', flex: 1 },
  tellRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  tellDivider: { borderTopWidth: 1, borderTopColor: '#EEF0F5' },
  tellNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tellNumText: { fontFamily: font.bold, fontSize: 13, color: '#FFFFFF' },
  tellLink: { fontFamily: font.bold, fontSize: 12.5 },
  tellText: { fontFamily: font.semibold, fontSize: 16, color: '#2E3352', marginTop: 1 },
  tellHint: { fontFamily: font.medium, fontSize: 12.5, color: '#6B7290', textAlign: 'center', marginBottom: 8 },
  next: { marginTop: 16, height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextText: { fontFamily: font.heavy, fontSize: 16, color: '#FFFFFF' },
});
