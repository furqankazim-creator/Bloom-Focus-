import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { t } from '../../i18n';
import { whichIs } from '../speech/data';
import { questionRounds, rng } from '../speech/rounds';
import { Dots, PictureTile, Praise, Prompt, type TileState } from '../speech/ui';
import { say, speechLang } from '../speech/voice';
import { GameBar, LibraryGameProps, secondsSince, useCheer } from './shared';

const YES = { en: 'Yes!', ar: 'نعم!', ur: 'جی ہاں!' } as const;

/** Question Time — answer who / what / where questions by tapping the right picture. */
export default function QuestionTime({ seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const lang = speechLang();
  const { width } = useWindowDimensions();
  const rounds = useMemo(() => questionRounds({ rounds: cfg.rounds, kind: cfg.kind, choices: cfg.choices }, rng(seed)), [seed, cfg.rounds, cfg.kind, cfg.choices]);
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [states, setStates] = useState<Record<string, TileState>>({});
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState(false);
  const [done, setDone] = useState(false);
  const rd = rounds[i];
  const question = !rd ? '' : 'word' in rd.question ? whichIs[lang].replace('{{x}}', rd.question.word[lang]) : rd.question[lang];

  useEffect(() => {
    if (!question) return;
    const id = setTimeout(() => say(question), 350);
    return () => clearTimeout(id);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (id: string) => {
    if (!rd || done) return;
    if (id !== rd.answer.id) {
      cheer(false);
      setMissed(true);
      setStates((s) => ({ ...s, [id]: 'wrong' }));
      setTimeout(() => setStates((s) => ({ ...s, [id]: 'faded' })), 450);
      return;
    }
    cheer(true);
    const score = firstTry + (missed ? 0 : 1);
    setFirstTry(score);
    setStates((s) => ({ ...s, [id]: 'right' }));
    setDone(true);
    say(`${YES[lang]} ${rd.answer[lang]}`);
    setTimeout(() => {
      if (i + 1 >= rounds.length) return onDone({ accuracy: score / rounds.length, activeSec: secondsSince(start.current) });
      setI(i + 1);
      setStates({});
      setMissed(false);
      setDone(false);
    }, 1500);
  };
  if (!rd) return null;
  const cols = rd.options.length === 3 ? 3 : 2;
  const size = Math.min(150, Math.floor((Math.min(width, 520) - 40 - (cols - 1) * 12) / cols));
  const showText = cfg.showText !== false;

  return (
    <View>
      <GameBar left={t(`Question ${i + 1} of ${rounds.length}`)} right={t('Listen, then tap')} />
      <Dots total={rounds.length} done={i} />
      <Prompt text={showText ? question : undefined} speak={question} />
      <View style={styles.grid}>
        {rd.options.map((o) => (
          <PictureTile key={o.id} emoji={o.emoji} label={done && o.id === rd.answer.id ? o[lang] : undefined} state={states[o.id] ?? 'idle'} size={size} onPress={() => tap(o.id)} a11y={o[lang]} />
        ))}
      </View>
      {done && <Praise text={`${YES[lang]} ${rd.answer.emoji} ${rd.answer[lang]}`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
});
