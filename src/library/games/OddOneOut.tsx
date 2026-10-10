import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { t } from '../../i18n';
import { oddRounds, rng } from '../speech/rounds';
import { Dots, PictureTile, Praise, Prompt, type TileState } from '../speech/ui';
import { say, speechLang } from '../speech/voice';
import { GameBar, LibraryGameProps, secondsSince, useCheer } from './shared';

const ASK = { en: 'Which one doesn’t belong?', ar: 'أيها لا ينتمي إلى المجموعة؟', ur: 'کون سی چیز الگ ہے؟' } as const;
const WHY = {
  en: (odd: string, g: string) => `${odd} doesn’t belong. The others are ${g}.`,
  ar: (odd: string, g: string) => `${odd} لا ينتمي. البقية ${g}.`,
  ur: (odd: string, g: string) => `${odd} الگ ہے۔ باقی سب ${g} ہیں۔`,
};

/** Odd One Out — find the picture that doesn't fit, then hear why (categories & vocabulary). */
export default function OddOneOut({ seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const lang = speechLang();
  const { width } = useWindowDimensions();
  const rounds = useMemo(() => oddRounds({ rounds: cfg.rounds, kind: cfg.kind }, rng(seed)), [seed, cfg.rounds, cfg.kind]);
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [states, setStates] = useState<Record<string, TileState>>({});
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState(false);
  const [done, setDone] = useState(false);
  const rd = rounds[i];

  useEffect(() => {
    const id = setTimeout(() => say(ASK[lang]), 350);
    return () => clearTimeout(id);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const tap = (id: string) => {
    if (!rd || done) return;
    if (id !== rd.odd.id) {
      cheer(false);
      setMissed(true);
      setStates((s) => ({ ...s, [id]: 'wrong' }));
      setTimeout(() => setStates((s) => ({ ...s, [id]: 'idle' })), 500);
      return;
    }
    cheer(true);
    const score = firstTry + (missed ? 0 : 1);
    setFirstTry(score);
    setStates(Object.fromEntries(rd.items.map((x) => [x.id, x.id === id ? 'right' : 'picked'])));
    setDone(true);
    say(WHY[lang](rd.odd[lang], rd.group[lang]));
    setTimeout(() => {
      if (i + 1 >= rounds.length) return onDone({ accuracy: score / rounds.length, activeSec: secondsSince(start.current) });
      setI(i + 1);
      setStates({});
      setMissed(false);
      setDone(false);
    }, 2600);
  };
  if (!rd) return null;
  const size = Math.min(150, Math.floor((Math.min(width, 520) - 40 - 12) / 2));

  return (
    <View>
      <GameBar left={t(`Round ${i + 1} of ${rounds.length}`)} right={t('Three go together')} />
      <Dots total={rounds.length} done={i} />
      <Prompt text={ASK[lang]} speak={ASK[lang]} />
      <View style={styles.grid}>
        {rd.items.map((x) => (
          <PictureTile key={x.id} emoji={x.emoji} label={x[lang]} state={states[x.id] ?? 'idle'} size={size} onPress={() => tap(x.id)} />
        ))}
      </View>
      {done && <Praise text={WHY[lang](rd.odd[lang], rd.group[lang])} />}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
});
