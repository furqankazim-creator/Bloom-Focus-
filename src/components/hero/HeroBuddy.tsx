import { useStore } from '../../store/useStore';
import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { lightColors as colors, font } from '../../theme';
import type { Character } from '../../types';
import { HeroSticker } from './HeroSticker';

const native = Platform.OS !== 'web';

/**
 * The hero during play: gently bobs, hops when the child gets one right, wobbles on a miss,
 * and shows a short speech bubble. `cheerKey` changes on every reaction.
 */
export function HeroBuddy({
  hero,
  message,
  cheerKey,
  mood,
  calm,
  size = 44,
}: {
  hero: Character;
  message: string | null;
  cheerKey: number;
  mood: 'good' | 'oops' | 'idle';
  calm: boolean;
  size?: number;
}) {
  // "Hero speech bubbles" off in Settings keeps the hero quiet.
  const talk = useStore((s) => s.settings.heroTalk);
  if (!talk) message = null;
  const bob = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const tilt = useRef(new Animated.Value(0)).current;

  // Idle bob (skipped in calm mode).
  useEffect(() => {
    if (calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 900, useNativeDriver: native }),
        Animated.timing(bob, { toValue: 0, duration: 900, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, bob]);

  // React to each answer.
  useEffect(() => {
    if (!cheerKey) return;
    if (mood === 'good') {
      pop.setValue(1);
      Animated.sequence([
        Animated.timing(pop, { toValue: calm ? 1.08 : 1.25, duration: 140, useNativeDriver: native }),
        Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: native }),
      ]).start();
    } else if (mood === 'oops' && !calm) {
      tilt.setValue(0);
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 90, useNativeDriver: native }),
        Animated.timing(tilt, { toValue: -1, duration: 90, useNativeDriver: native }),
        Animated.timing(tilt, { toValue: 0, duration: 90, useNativeDriver: native }),
      ]).start();
    }
  }, [cheerKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const rotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-10deg', '10deg'] });
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={{ transform: [{ translateY: bob }, { scale: pop }, { rotate }] }}>
        <HeroSticker hero={hero} size={size} />
      </Animated.View>
      {!!message && (
        <View key={cheerKey} style={[styles.bubble, mood === 'good' ? styles.good : mood === 'oops' ? styles.oops : null]}>
          <Text style={styles.text} numberOfLines={2}>
            <Text style={styles.name}>{hero.name}: </Text>
            {message}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'flex-end' },
  bubble: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 6,
    width: 190,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderTopRightRadius: 4,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  good: { borderColor: '#9FDDBE', backgroundColor: '#F1FBF5' },
  oops: { borderColor: '#F3C9B8', backgroundColor: '#FFF6F1' },
  text: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 18, color: colors.ink },
  name: { fontFamily: font.bold },
});
