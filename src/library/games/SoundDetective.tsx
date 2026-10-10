import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { t } from '../../i18n';
import { EN_SOUND } from '../speech/data';
import { rng, soundRounds } from '../speech/rounds';
import { Dots, PictureTile, Praise, Prompt, type TileState } from '../speech/ui';
import { say, speechLang } from '../speech/voice';
import { GameBar, LibraryGameProps, secondsSince, useCheer } from './shared';

/** Sound Detective — which picture starts with this sound? (phonological awareness). */
export default function SoundDetective({ seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const lang = speechLang();
  const { width } = useWindowDimensions();
  const rounds = useMemo(() => soundRounds({ rounds: cfg.rounds, choices: cfg.choices, tricky: cfg.tricky }, lang, rng(seed)), [seed, cfg.rounds, cfg.choices, cfg.tricky, lang]);
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [states, setStates] = useState<Record<string, TileState>>({});
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState(false);
  const [done, setDone] = useState(false);
  const rd = rounds[i];

  const sound = rd ? (lang === 'en' ? EN_SOUND[rd.letter] ?? rd.letter : rd.letter) : '';
  const question = lang === 'en' ? `Which one starts with “${rd?.letter}”?` : lang === 'ar' ? `أيها يبدأ بحرف «${rd?.letter}»؟` : `کون سی چیز «${rd?.letter}» سے شروع ہوتی ہے؟`;
  const spoken = lang === 'en' ? `Which one starts with ${sound}?` : question;

  useEffect(() => {
    if (!rd) return;
    const id = setTimeout(() => say(spoken), 350);
    return () => clearTimeout(id);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (id: string) => {
    if (!rd || done) return;
    const word = rd.options.find((o) => o.id === id)!;
    if (id !== rd.answer.id) {
      cheer(false);
      setMissed(true);
      say(word[lang]);
      setStates((s) => ({ ...s, [id]: 'wrong' }));
      setTimeout(() => setStates((s) => ({ ...s, [id]: 'faded' })), 450);
      return;
    }
    cheer(true);
    say(word[lang]);
    const score = firstTry + (missed ? 0 : 1);
    setFirstTry(score);
    setStates((s) => ({ ...s, [id]: 'right' }));
    setDone(true);
    setTimeout(() => {
      if (i + 1 >= rounds.length) return onDone({ accuracy: score / rounds.length, activeSec: secondsSince(start.current) });
      setI(i + 1);
      setStates({});
      setMissed(false);
      setDone(false);
    }, 1300);
  };
  if (!rd) return null;
  const cols = rd.options.length === 3 ? 3 : 2;
  const size = Math.min(150, Math.floor((Math.min(width, 520) - 40 - (cols - 1) * 12) / cols));

  return (
    <View>
      <GameBar left={t(`Sound ${i + 1} of ${rounds.length}`)} right={t('Listen for the first sound')} />
      <Dots total={rounds.length} done={i} />
      <Prompt big={rd.letter} text={question} speak={spoken} />
      <View style={styles.grid}>
        {rd.options.map((o) => (
          <PictureTile key={o.id} emoji={o.emoji} label={done || states[o.id] ? o[lang] : undefined} state={states[o.id] ?? 'idle'} size={size} onPress={() => tap(o.id)} a11y={o[lang]} />
        ))}
      </View>
      {done && <Praise text={t('Yes! “{{word}}” starts with “{{sound}}”', { word: rd.answer[lang], sound: rd.letter })} />}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
});
