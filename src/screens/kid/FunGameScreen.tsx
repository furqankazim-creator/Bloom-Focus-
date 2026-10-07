import { flipIcon } from '../../components/ui';
import { Feather } from '@expo/vector-icons';
import { t } from '../../i18n';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Confetti } from '../../components/Confetti';
import { HeroSays, HeroSticker } from '../../components/hero/HeroSticker';
import { KidBackdrop } from '../../components/kid/KidBackdrop';
import { HERO_PRESETS, heroesFor } from '../../engine/heroes';
import { FUN_GAME } from '../../games/fun';
import type { RootProps } from '../../navigation/types';
import { useChild, useStore } from '../../store/useStore';
import { lightColors as colors, font } from '../../theme';
import { firstName } from '../helpers';

/** One Fun Zone game: just for fun, nothing is scored or sent to the adaptive engine. */
export default function FunGameScreen({ route, navigation }: RootProps<'FunGame'>) {
  const { childId, game } = route.params;
  const child = useChild(childId);
  const calm = useStore((s) => s.calmMode);
  const info = FUN_GAME[game];
  const [round, setRound] = useState(0);
  const [win, setWin] = useState<string | null>(null);
  // Count time spent here toward the daily Fun Zone limit (the Calm Corner doesn't count).
  const addFunTime = useStore((s) => s.addFunTime);
  useEffect(() => {
    if (game === 'breathe') return;
    const start = Date.now();
    return () => addFunTime((Date.now() - start) / 1000);
  }, [game, addFunTime]);
  if (!child || !info) return null;
  const heroes = heroesFor(child, child.customActivities?.[0]);
  const list = heroes.length ? heroes : [HERO_PRESETS.find((h) => h.id === 'bamboo-bao')!];
  const { Game } = info;

  return (
    <KidBackdrop calm={calm}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.close} hitSlop={8} accessibilityLabel="Back to the Fun Zone">
            <Feather name={flipIcon('arrow-left')} size={20} color={colors.ink} />
          </Pressable>
          <Image source={info.art} style={{ width: 30, height: 30 }} />
          <Text style={styles.title}>{t(info.title)}</Text>
          <HeroSticker hero={list[0]} size={40} />
        </View>
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <Game key={round} heroes={list} calm={calm} onWin={setWin} />
        </View>
        {win && (
          <View style={styles.overlay}>
            <Confetti />
            <View style={styles.winCard}>
              <HeroSays hero={list[0]} text={t('Yay, {{name}}! {{win}}', { name: firstName(child.name), win: t(win) })} size={92} />
              <Pressable
                onPress={() => {
                  setWin(null);
                  setRound((r) => r + 1);
                }}
                style={styles.primary}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>{t('Play again')}</Text>
              </Pressable>
              <Pressable onPress={() => navigation.goBack()} style={styles.secondary} accessibilityRole="button">
                <Text style={styles.secondaryText}>{t('Back to the Fun Zone')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </KidBackdrop>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: font.heavy, fontSize: 20, color: colors.ink },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,40,70,0.25)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  winCard: { width: '100%', maxWidth: 380, alignItems: 'center', padding: 22, borderRadius: 30, backgroundColor: '#FFFDF8', gap: 6 },
  primary: { alignSelf: 'stretch', height: 52, borderRadius: 26, backgroundColor: '#7C6CF2', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  primaryText: { fontFamily: font.bold, fontSize: 17, color: colors.white },
  secondary: { paddingVertical: 12 },
  secondaryText: { fontFamily: font.semibold, fontSize: 15, color: colors.inkSoft },
});
