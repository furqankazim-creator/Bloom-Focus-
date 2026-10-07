import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { HeroSticker } from '../../components/hero/HeroSticker';
import { HERO_PRESETS, sameHero } from '../../engine/heroes';
import { shuffle } from '../../engine/studio';
import { playSound } from '../../services/sounds';
import { lightColors as colors, font } from '../../theme';
import type { Character } from '../../types';
import type { FunGameProps } from './shared';

const PAIRS = 6;
type Card = { key: number; hero: Character; pair: number };

function deal(heroes: Character[]): Card[] {
  // The child's own heroes first, then random built-in heroes.
  const pool = [...heroes, ...shuffle(HERO_PRESETS).filter((p) => !heroes.some((h) => sameHero(h, p)))].slice(0, PAIRS);
  return shuffle(pool.flatMap((hero, pair) => [{ key: pair * 2, hero, pair }, { key: pair * 2 + 1, hero, pair }]));
}

/** Flip two cards to find matching heroes. */
export default function HeroMemory({ heroes, onWin }: FunGameProps) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(Math.floor((Math.min(width, 480) - 56) / 3), 120);
  const [cards, setCards] = useState(() => deal(heroes));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const flip = (i: number) => {
    if (open.length === 2 || open.includes(i) || matched.includes(cards[i].pair)) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    setMoves((m) => m + 1);
    const [a, b] = next;
    if (cards[a].pair === cards[b].pair) {
      playSound('chime');
      const done = [...matched, cards[a].pair];
      setTimeout(() => {
        setMatched(done);
        setOpen([]);
        if (done.length === PAIRS) onWin(`You found all ${PAIRS} pairs in ${moves + 1} moves!`);
      }, 450);
    } else {
      setTimeout(() => setOpen([]), 900);
    }
  };

  const restart = () => {
    setCards(deal(heroes));
    setOpen([]);
    setMatched([]);
    setMoves(0);
  };
  useEffect(restart, [heroes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ alignItems: 'center', paddingTop: 8 }}>
      <View style={styles.bar}>
        <Text style={styles.barText}>
          🧩 {matched.length}/{PAIRS} pairs
        </Text>
        <Text style={styles.barText}>
          {moves} {moves === 1 ? 'move' : 'moves'}
        </Text>
      </View>
      <View style={[styles.grid, { width: cardW * 3 + 24 }]}>
        {cards.map((c, i) => (
          <FlipCard key={c.key} card={c} size={cardW} faceUp={open.includes(i) || matched.includes(c.pair)} matched={matched.includes(c.pair)} onPress={() => flip(i)} />
        ))}
      </View>
    </View>
  );
}

function FlipCard({ card, size, faceUp, matched, onPress }: { card: Card; size: number; faceUp: boolean; matched: boolean; onPress: () => void }) {
  const turn = useRef(new Animated.Value(faceUp ? 1 : 0)).current;
  const [showFace, setShowFace] = useState(faceUp);
  useEffect(() => {
    Animated.timing(turn, { toValue: faceUp ? 1 : 0, duration: 260, useNativeDriver: Platform.OS !== 'web' }).start();
    // Swap the face half way through the turn.
    const t = setTimeout(() => setShowFace(faceUp), 130);
    return () => clearTimeout(t);
  }, [faceUp, turn]);
  const scaleX = turn.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.02, 1] });
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={faceUp ? card.hero.name : 'Hidden card'}>
      <Animated.View style={[styles.card, { width: size, height: size * 1.18, transform: [{ scaleX }] }, showFace ? styles.face : styles.back, matched && styles.matched]}>
        {showFace ? (
          <>
            <HeroSticker hero={card.hero} size={size * 0.68} />
            <Text style={styles.name} numberOfLines={1}>
              {card.hero.name}
            </Text>
          </>
        ) : (
          <Text style={[styles.mark, { fontSize: size * 0.42 }]}>?</Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  barText: { fontFamily: font.bold, fontSize: 15, color: colors.ink, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.85)', overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 3 },
  back: { backgroundColor: '#B9A8FF', borderColor: '#FFFFFF' },
  face: { backgroundColor: '#FFFFFF', borderColor: '#E6E1FF' },
  matched: { borderColor: '#7DD3A0', backgroundColor: '#F0FBF4' },
  mark: { fontFamily: font.heavy, color: '#FFFFFF', textShadowColor: 'rgba(80,60,180,0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  name: { fontFamily: font.semibold, fontSize: 11, color: colors.ink, maxWidth: '90%' },
});
