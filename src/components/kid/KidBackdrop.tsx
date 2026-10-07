import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

const native = Platform.OS !== 'web';

// Soft shapes that drift slowly; positions are fractions of the screen.
const BLOBS = [
  { x: 0.08, y: 0.12, size: 90, color: '#FFD9E8', delay: 0 },
  { x: 0.78, y: 0.08, size: 120, color: '#D6ECFF', delay: 600 },
  { x: 0.82, y: 0.52, size: 80, color: '#E3F7D9', delay: 1200 },
  { x: 0.05, y: 0.62, size: 110, color: '#FFF1C9', delay: 300 },
  { x: 0.45, y: 0.86, size: 70, color: '#E9E0FF', delay: 900 },
];
const CLOUDS = [
  { y: 0.18, size: 34, from: -0.2, dur: 26000 },
  { y: 0.4, size: 26, from: 0.3, dur: 32000 },
];

/** Light pastel sky with gently drifting blobs and clouds. Never blocks touches. */
export function KidBackdrop({ calm = false, children }: { calm?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.fill}>
      <LinearGradient colors={['#EAF5FF', '#FFF7EE', '#FDF1FA']} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {BLOBS.map((b, i) => (
          <Blob key={i} {...b} calm={calm} />
        ))}
        {!calm && CLOUDS.map((c, i) => <Cloud key={i} {...c} />)}
      </View>
      {children}
    </View>
  );
}

function Blob({ x, y, size, color, delay, calm }: { x: number; y: number; size: number; color: string; delay: number; calm: boolean }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (calm) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(t, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [calm, delay, t]);
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  return (
    <Animated.View
      style={[
        styles.blob,
        { left: `${x * 100}%`, top: `${y * 100}%`, width: size, height: size, borderRadius: size / 2, backgroundColor: color, transform: [{ translateY }, { scale }] },
      ]}
    />
  );
}

function Cloud({ y, size, from, dur }: { y: number; size: number; from: number; dur: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [dur, t]);
  const { width } = useWindowDimensions();
  // Transforms (not `left`) so the native driver can run it.
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [from * width, (from + 1.3) * width] });
  return <Animated.Text style={[styles.cloud, { top: `${y * 100}%`, fontSize: size, left: 0, transform: [{ translateX }] }]}>☁️</Animated.Text>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#F4F9FF' },
  blob: { position: 'absolute', opacity: 0.7 },
  cloud: { position: 'absolute', opacity: 0.55 },
});

