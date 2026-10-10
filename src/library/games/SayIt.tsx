import { Feather } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../../i18n';
import { font } from '../../theme';
import { rng, sayItDeck } from '../speech/rounds';
import { Dots } from '../speech/ui';
import { HearButton, HearYourself, speechLang } from '../speech/voice';
import { GameBar, LibraryGameProps, Sheet, secondsSince, useCheer, useSheetTheme } from './shared';

/**
 * Say It! — naming practice. The child names the picture out loud, can hear the word modelled
 * and record themselves to hear it back. A grown-up taps "Said it" or "Skip".
 */
export default function SayIt({ seed, onDone, config: cfg }: LibraryGameProps) {
  const theme = useSheetTheme();
  const cheer = useCheer();
  const lang = speechLang();
  const deck = useMemo(() => sayItDeck({ words: cfg.own?.length ? 'own' : cfg.words, count: cfg.count, own: cfg.own }, lang, rng(seed)), [seed, cfg.words, cfg.count, cfg.own, lang]);
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [said, setSaid] = useState(0);
  const [reveal, setReveal] = useState(!!cfg.showWord);
  const card = deck[i];

  const next = (ok: boolean) => {
    cheer(ok);
    const total = said + (ok ? 1 : 0);
    if (ok) setSaid(total);
    if (i + 1 >= deck.length) return onDone({ accuracy: deck.length ? total / deck.length : null, activeSec: secondsSince(start.current) });
    setI(i + 1);
    setReveal(!!cfg.showWord);
  };
  if (!card) return null;

  return (
    <View>
      <GameBar left={t(`Card ${i + 1} of ${deck.length}`)} right={t('Say it out loud')} />
      <Dots total={deck.length} done={i} />
      <Sheet style={{ alignItems: 'center', paddingVertical: 22 }}>
        <Text style={styles.ask}>{card.isAction ? t('What is happening?') : cfg.own?.length ? t('Say this word') : t('What is this?')}</Text>
        <View style={[styles.card, { borderColor: theme.color + '55', backgroundColor: theme.tint }]}>
          <Text style={styles.emoji}>{card.emoji}</Text>
        </View>
        {reveal ? (
          <Text style={[styles.word, { color: theme.color }]}>{card.word}</Text>
        ) : (
          <Pressable onPress={() => setReveal(true)} style={styles.showWord} accessibilityRole="button">
            <Feather name="eye" size={15} color={theme.color} />
            <Text style={[styles.showWordText, { color: theme.color }]}>{t('Show the word')}</Text>
          </Pressable>
        )}
        <View style={styles.tools}>
          <HearButton text={card.word} color={theme.color} size={54} label={t('Hear the word')} />
          {cfg.record !== false && <HearYourself color={theme.color} resetKey={i} />}
        </View>
      </Sheet>
      <Text style={styles.adult}>{t('Grown-up: tap when the child has had a go')}</Text>
      <View style={styles.actions}>
        <Pressable onPress={() => next(false)} style={({ pressed }) => [styles.skip, pressed && { opacity: 0.8 }]} accessibilityRole="button">
          <Text style={styles.skipText}>{t('Skip')}</Text>
        </Pressable>
        <Pressable onPress={() => next(true)} style={({ pressed }) => [styles.said, { backgroundColor: theme.color }, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Feather name="check" size={20} color="#FFFFFF" />
          <Text style={styles.saidText}>{t('Said it!')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ask: { fontFamily: font.heavy, fontSize: 21, color: '#2E3352', marginBottom: 14, textAlign: 'center' },
  card: { width: 200, height: 200, borderRadius: 40, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 112, lineHeight: 134 },
  word: { fontFamily: font.heavy, fontSize: 32, marginTop: 14, textAlign: 'center' },
  showWord: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 12, paddingVertical: 6 },
  showWordText: { fontFamily: font.semibold, fontSize: 14 },
  tools: { alignItems: 'center', gap: 12, marginTop: 16 },
  adult: { fontFamily: font.medium, fontSize: 12.5, color: '#6B7290', textAlign: 'center', marginTop: 14 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  skip: { height: 56, paddingHorizontal: 22, borderRadius: 18, backgroundColor: '#EEF0F5', alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: font.bold, fontSize: 16, color: '#4A5170' },
  said: { flex: 1, height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saidText: { fontFamily: font.heavy, fontSize: 18, color: '#FFFFFF' },
});
