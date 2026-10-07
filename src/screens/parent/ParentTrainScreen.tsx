import { Feather } from '@expo/vector-icons';
import { t } from '../../i18n';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Screen, T, flipIcon } from '../../components/ui';
import { taskLevel } from '../../engine/adaptive';
import { BASE_PARAMS } from '../../engine/tasks';
import { TRAIN_GAMES, describeParams, trainTaskDef } from '../../games/train/meta';
import { useStore } from '../../store/useStore';
import { colors, font } from '../../theme';
import { firstName } from '../helpers';

type CategoryFilter = 'all' | 'attention' | 'memory' | 'speed' | 'inhibition' | 'flexibility';

const CATEGORIES: { id: CategoryFilter; label: string; icon: string }[] = [
  { id: 'all', label: 'All Activities', icon: '🌟' },
  { id: 'attention', label: 'Attention', icon: '🎯' },
  { id: 'memory', label: 'Memory', icon: '🧠' },
  { id: 'speed', label: 'Speed', icon: '⚡' },
  { id: 'inhibition', label: 'Impulse Control', icon: '🛑' },
  { id: 'flexibility', label: 'Flexibility', icon: '🔀' },
];

export default function ParentTrainScreen() {
  const nav = useNavigation<any>();
  const { parentChildId, children, sessions } = useStore();
  const child = children.find((c) => c.id === parentChildId) || children[0];
  const [selectedCat, setSelectedCat] = useState<CategoryFilter>('all');

  if (!child) return null;
  const first = firstName(child.name);

  /** Latest accuracy for a game, from the child's saved history. */
  const lastScore = (taskId: string) => {
    for (let i = sessions.length - 1; i >= 0; i--) {
      const s = sessions[i];
      if (s.childId !== child.id) continue;
      const b = s.blocks.find((x) => x.taskId === taskId && x.accuracy !== null);
      if (b && b.accuracy !== null) return Math.round(b.accuracy * 100);
    }
    return null;
  };

  const filteredGames = TRAIN_GAMES.filter((g) => {
    if (selectedCat === 'all') return true;
    return g.category === selectedCat;
  });

  return (
    <Screen scroll>
      <T.H1 style={{ fontSize: 28, marginBottom: 4 }}>{t('Focus Library')}</T.H1>
      <T.Body style={{ color: colors.inkSoft, fontSize: 15, marginBottom: 16 }}>
        {t('{{n}} focus games that adapt as {{name}} plays. Pick one to start.', { n: TRAIN_GAMES.length, name: first })}
      </T.Body>

      {/* Category Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20, marginBottom: 18 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCat === cat.id;
          const count = cat.id === 'all' ? TRAIN_GAMES.length : TRAIN_GAMES.filter((g) => g.category === cat.id).length;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCat(cat.id)}
              style={[styles.catPill, active && styles.catPillActive]}
            >
              <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
              <Text style={[styles.catPillText, active && styles.catPillTextActive]}>{t(cat.label)}</Text>
              <View style={[styles.countBadge, active && styles.countBadgeActive]}>
                <Text style={[styles.countBadgeText, active && styles.countBadgeTextActive]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Game Cards List */}
      <View style={{ gap: 12 }}>
        {filteredGames.map((g) => {
          const params = child.tasks?.[g.id]?.params ?? BASE_PARAMS;
          const lvl = taskLevel(trainTaskDef(g.id), params);
          const last = lastScore(g.id);

          return (
            <Card
              key={g.id}
              onPress={() => nav.navigate('TrainGame', { childId: child.id, taskId: g.id })}
              style={styles.gameCard}
            >
              <View style={[styles.iconBox, { backgroundColor: g.tint }]}>
                <Text style={{ fontSize: 28, lineHeight: 34 }}>{g.icon}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 16, color: colors.ink }}>{t(g.title)}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t('Lvl {{n}}', { n: lvl })}</Text>
                  </View>
                </View>

                <Text style={{ fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, marginBottom: 4 }}>
                  {t(g.skill)} · {t(g.subtitle)}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.inkMuted }}>
                    {describeParams(g.id, params)}
                  </Text>
                  {last !== null && (
                    <View style={styles.scorePill}>
                      <Text style={styles.scorePillText}>{t('{{n}}% last score', { n: last })}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.playArrow}>
                <Feather name={flipIcon('arrow-right')} size={18} color={colors.forest} />
              </View>
            </Card>
          );
        })}
      </View>

      {/* Adaptation explanation card */}
      <Card style={styles.infoCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={{ fontSize: 18 }}>⚙️</Text>
          <Text style={{ fontFamily: font.bold, fontSize: 15, color: colors.forest }}>{t('How the games adapt')}</Text>
        </View>
        <Text style={{ fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, lineHeight: 20 }}>
          {t('Each game has its own difficulty ladder. When {{name}} scores 85% or more on two rounds in a row, it gets a little harder. If things feel hard, it eases back to keep practice encouraging.', { name: first })}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catPillActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  catPillText: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors.ink,
  },
  catPillTextActive: {
    color: colors.white,
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countBadgeText: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.inkSoft,
  },
  countBadgeTextActive: {
    color: colors.white,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: colors.sage,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontFamily: font.bold,
    fontSize: 11,
    color: colors.forest,
  },
  scorePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  scorePillText: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: '#D97706',
  },
  playArrow: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F0F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    marginTop: 24,
    backgroundColor: '#F2F6F3',
    borderColor: colors.mint,
    padding: 18,
    borderRadius: 20,
    marginBottom: 50,
  },
});
