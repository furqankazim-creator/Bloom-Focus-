import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { t } from '../../i18n';
import { font } from '../../theme';
import { COLOUR_HEX, CONTAINER_EMOJI, instructionText, type Container, type Obj } from '../speech/data';
import { OBJ_SHAPE, listenRounds, matches, rng } from '../speech/rounds';
import { Dots, PictureTile, Praise, Prompt, type TileState } from '../speech/ui';
import { say, speechLang } from '../speech/voice';
import { GameBar, LibraryGameProps, ShapeGlyph, secondsSince, useCheer } from './shared';

const GREAT = { en: 'Great listening!', ar: 'استماع رائع!', ur: 'بہت اچھا سنا!' } as const;
const key = (o: Obj) => `${o.kind}-${o.colour}-${o.size}`;

/**
 * Listen & Do — follow a spoken instruction with 1, 2 or 3 key words
 * ("Touch the star" → "Touch the red star" → "Put the small red star in the box").
 */
export default function ListenDo({ seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const lang = speechLang();
  const { width } = useWindowDimensions();
  const rounds = useMemo(() => listenRounds({ rounds: cfg.rounds, keyWords: cfg.keyWords, containers: cfg.containers }, rng(seed)), [seed, cfg.rounds, cfg.keyWords, cfg.containers]);
  const start = useRef(Date.now());
  const [i, setI] = useState(0);
  const [states, setStates] = useState<Record<string, TileState>>({});
  const [held, setHeld] = useState<Obj | null>(null);
  const [errors, setErrors] = useState(0);
  const [done, setDone] = useState(false);
  const rd = rounds[i];
  const text = rd ? instructionText(rd.ins, lang) : '';
  const showText = cfg.showText !== false;

  useEffect(() => {
    if (!text) return;
    const id = setTimeout(() => say(text, { rate: 0.8 }), 400);
    return () => clearTimeout(id);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const win = () => {
    cheer(true);
    setDone(true);
    say(GREAT[lang]);
    setTimeout(() => {
      if (i + 1 >= rounds.length) return onDone({ accuracy: Math.max(0, 1 - errors / (rounds.length * 2)), activeSec: secondsSince(start.current) });
      setI(i + 1);
      setStates({});
      setHeld(null);
      setDone(false);
    }, 1300);
  };
  const miss = (k: string) => {
    cheer(false);
    setErrors((e) => e + 1);
    setStates((s) => ({ ...s, [k]: 'wrong' }));
    setTimeout(() => setStates((s) => ({ ...s, [k]: held && key(held) === k ? 'picked' : 'idle' })), 500);
  };

  const tapObject = (o: Obj) => {
    if (!rd || done) return;
    if (!matches(o, rd.ins)) return miss(key(o));
    if (!rd.ins.container) {
      setStates({ [key(o)]: 'right' });
      return win();
    }
    setHeld(o);
    setStates({ [key(o)]: 'picked' });
  };
  const tapContainer = (c: Container) => {
    if (!rd || done) return;
    if (!held) return miss(c);
    if (c !== rd.ins.container) return miss(c);
    setStates({ [key(held)]: 'right', [c]: 'right' });
    win();
  };
  if (!rd) return null;

  const cols = rd.objects.length > 4 ? 3 : 2;
  const size = Math.min(140, Math.floor((Math.min(width, 520) - 40 - (cols - 1) * 10) / cols));
  const step = rd.ins.container ? (held ? 2 : 1) : 0;

  return (
    <View>
      <GameBar left={t(`Round ${i + 1} of ${rounds.length}`)} right={t('Listen carefully')} />
      <Dots total={rounds.length} done={i} />
      <Prompt text={showText ? text : undefined} speak={text}>
        {step > 0 && <Text style={styles.step}>{step === 1 ? t('Tap the thing first…') : t('…now tap where it goes')}</Text>}
      </Prompt>
      <View style={styles.grid}>
        {rd.objects.map((o) => (
          <PictureTile key={key(o)} size={size} state={states[key(o)] ?? 'idle'} onPress={() => tapObject(o)} a11y={`${o.size} ${o.colour} ${o.kind}`}>
            <ShapeGlyph kind={OBJ_SHAPE[o.kind]} size={o.size === 'big' ? size * 0.62 : size * 0.34} color={COLOUR_HEX[o.colour]} fill stroke={3} />
          </PictureTile>
        ))}
      </View>
      {rd.containers.length > 0 && (
        <View style={[styles.grid, styles.containers]}>
          {rd.containers.map((c) => (
            <PictureTile key={c} emoji={CONTAINER_EMOJI[c]} size={Math.min(110, size)} state={states[c] ?? 'idle'} onPress={() => tapContainer(c)} a11y={c} />
          ))}
        </View>
      )}
      {done && <Praise text={GREAT[lang]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  containers: { marginTop: 16, paddingTop: 16, borderTopWidth: 2, borderTopColor: '#E3E6EE', borderStyle: 'dashed' },
  step: { fontFamily: font.semibold, fontSize: 13.5, color: '#4A5170', marginTop: 4 },
});
