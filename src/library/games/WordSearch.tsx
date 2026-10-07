import { t } from '../../i18n';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import WordSearchGame from '../../games/studio/WordSearchGame';
import { font } from '../../theme';
import { LibraryGameProps, Sheet, pick, rng , useCheer } from './shared';

// Word lists from the therapist's sheets (Days 5 and 12).
const THEMES = [
  { title: 'Spring', words: ['BEE', 'EGG', 'FROG', 'WORM', 'LEAF', 'NEST', 'SUN', 'BIRD'] },
  { title: 'Space', words: ['MOON', 'STAR', 'MARS', 'NOVA', 'AXIS', 'COMET', 'ORBIT', 'BLACK', 'LIGHT', 'VOID', 'DUST', 'SUN', 'SKY', 'SHIP', 'ROCK'] },
  { title: 'Visit a Museum', words: ['ARTS', 'BOOKS', 'CULTURE', 'DINOSAUR', 'DISCOVER', 'DISPLAYS', 'EXPLORE', 'FILMS', 'FOSSILS', 'FUN', 'HALLS', 'HISTORY', 'LEARN', 'RELICS', 'TALKS', 'TOURS'] },
  { title: 'Vacation', words: ['AIRPORT', 'BEACH', 'FLIGHT', 'FUN', 'HOLIDAY', 'HOTEL', 'MOTEL', 'PACK', 'POOL', 'RELAX', 'TICKET', 'TRAVEL', 'TRIP', 'WINDOW'] },
];

/** Days 5 & 12: themed word searches, bigger and with more directions as the level rises. */
export default function WordSearch({ level, seed, onDone, config: cfg }: LibraryGameProps) {
  const cheer = useCheer();
  const named = THEMES.find((t) => t.title.toLowerCase().includes(String(cfg.theme ?? '').toLowerCase()) && cfg.theme);
  const base = named ?? (level === 1 ? THEMES[0] : level === 2 ? THEMES[1] : pick(THEMES.slice(2), rng(seed)));
  const own: string[] = (cfg.words ?? []).filter(Boolean);
  const theme = own.length ? { title: 'My', words: own } : base;
  return (
    <View>
      <Sheet style={{ alignItems: 'center', paddingBottom: 6 }}>
        <Text style={styles.title}>{t(`${theme.title} Word Search`)}</Text>
        <WordSearchGame content={{ template: 'wordsearch', words: theme.words }} level={cfg.grid ?? [2, 3, 4][level - 1] ?? 2} onDone={(r) => onDone({ accuracy: r.accuracy, activeSec: r.activeSec })} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.heavy, fontSize: 22, color: '#2A2F45', marginBottom: 10 },
});
