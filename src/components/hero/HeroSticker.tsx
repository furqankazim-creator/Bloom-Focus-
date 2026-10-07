import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { WORLDS, presetFor, worldOf } from '../../engine/heroes';
import { HERO_ART } from './heroArt';
import { lightColors as colors, font } from '../../theme';
import type { Character } from '../../types';

/**
 * A hero drawn as a collectible sticker: world-coloured badge, white frame, soft shadow
 * and an optional name ribbon. Photo heroes fill the badge.
 */
export function HeroSticker({
  hero,
  size = 64,
  showName = false,
  style,
}: {
  hero: Character;
  size?: number;
  showName?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const world = WORLDS[worldOf(hero)];
  const radius = size * 0.32;
  const border = Math.max(2, Math.round(size * 0.05));
  const preset = presetFor(hero);
  const art = preset?.id ? HERO_ART[preset.id] : undefined;
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <View style={[styles.shadow, { width: size, height: size, borderRadius: radius }]}>
        <LinearGradient
          colors={world.sky}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.badge, { width: size, height: size, borderRadius: radius, borderWidth: border }]}
        >
          {hero.image ? (
            <Image source={{ uri: hero.image }} style={{ width: size - border * 2, height: size - border * 2, borderRadius: radius - border }} />
          ) : art ? (
            <>
              <View style={[styles.glow, { width: size * 0.78, height: size * 0.78, borderRadius: size * 0.39, opacity: world.dark ? 0.16 : 0.5 }]} />
              {/* The emoji sits underneath, so the badge is never empty while the 3D picture loads. */}
              {!loaded && <Text style={{ position: 'absolute', fontSize: size * 0.5, lineHeight: size * 0.66, textAlign: 'center' }}>{preset?.emoji ?? hero.emoji}</Text>}
              <Image source={art} onLoad={() => setLoaded(true)} style={{ width: size * 0.8, height: size * 0.8 }} resizeMode="contain" accessibilityLabel={hero.name} />
            </>
          ) : (
            <>
              {/* A soft glow behind the character makes it pop like a sticker. */}
              <View style={[styles.glow, { width: size * 0.7, height: size * 0.7, borderRadius: size * 0.35, opacity: world.dark ? 0.18 : 0.55 }]} />
              <Text style={{ fontSize: size * 0.56, lineHeight: size * 0.72, textAlign: 'center' }}>{hero.emoji}</Text>
            </>
          )}
        </LinearGradient>
      </View>
      {showName && (
        <View style={[styles.ribbon, { backgroundColor: world.accent, marginTop: -size * 0.12, paddingHorizontal: Math.max(6, size * 0.12) }]}>
          <Text style={[styles.ribbonText, { fontSize: Math.max(10, Math.min(14, size * 0.17)) }]} numberOfLines={1}>
            {hero.name}
          </Text>
        </View>
      )}
    </View>
  );
}

/** The hero with a speech bubble above it: used on game intro and result screens. */
export function HeroSays({ hero, text, size = 96 }: { hero: Character; text: string; size?: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{text}</Text>
        <View style={styles.tail} />
      </View>
      <HeroSticker hero={hero} size={size} showName />
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { shadowColor: '#1E3A2F', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4, backgroundColor: colors.white },
  badge: { alignItems: 'center', justifyContent: 'center', borderColor: colors.white, overflow: 'hidden' },
  glow: { position: 'absolute', backgroundColor: colors.white },
  ribbon: { borderRadius: 999, paddingVertical: 2, borderWidth: 2, borderColor: colors.white, maxWidth: 140 },
  ribbonText: { fontFamily: font.bold, color: colors.white, textAlign: 'center' },
  bubble: {
    maxWidth: 280,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 12,
  },
  bubbleText: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21, color: colors.ink, textAlign: 'center' },
  tail: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    width: 14,
    height: 14,
    backgroundColor: colors.white,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
});
