import { Feather } from '@expo/vector-icons';
import { createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getLang, t } from '../../i18n';
import { lightColors as colors, font } from '../../theme';
import type { Lang } from './data';

const VOICE: Record<Lang, string> = { en: 'en-US', ar: 'ar-SA', ur: 'ur-PK' };

/** The language the activity content and voice use (follows the app language). */
export const speechLang = (): Lang => getLang();

/** Says a word or sentence aloud, slowly and clearly, in the app language. */
export function say(text: string, opts: { rate?: number; lang?: Lang } = {}) {
  try {
    Speech.stop();
    Speech.speak(text, { language: VOICE[opts.lang ?? speechLang()], rate: opts.rate ?? 0.85, pitch: 1.05 });
  } catch {
    // No voice on this device — the words are on screen too.
  }
}
export const stopSaying = () => {
  try {
    Speech.stop();
  } catch {}
};

/** A round "hear it" button. */
export function HearButton({ text, color, size = 56, label }: { text: string; color: string; size?: number; label?: string }) {
  return (
    <Pressable onPress={() => say(text)} style={({ pressed }) => [styles.hear, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }, pressed && { opacity: 0.8 }]} accessibilityRole="button" accessibilityLabel={label ?? t('Hear it')}>
      <Feather name="volume-2" size={size * 0.42} color="#FFFFFF" />
    </Pressable>
  );
}

/**
 * Record the child saying it, then play it back so they hear themselves — a core speech-therapy
 * step. Recordings stay in memory only and are thrown away when the card changes.
 */
export function HearYourself({ color, resetKey }: { color: string; resetKey: string | number }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<'idle' | 'recording' | 'ready' | 'playing' | 'off'>('idle');
  const uri = useRef<string | null>(null);
  const player = useRef<AudioPlayer | null>(null);

  const cleanup = () => {
    player.current?.remove();
    player.current = null;
  };
  useEffect(() => {
    uri.current = null;
    cleanup();
    setState((s) => (s === 'off' ? 'off' : 'idle'));
  }, [resetKey]);
  useEffect(
    () => () => {
      cleanup();
      if (recorder.isRecording) void recorder.stop().catch(() => {});
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const start = async () => {
    try {
      stopSaying();
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return setState('off');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setState('recording');
    } catch {
      setState('off');
    }
  };
  const stop = async () => {
    try {
      await recorder.stop();
    } catch {}
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    uri.current = recorder.uri;
    setState(recorder.uri ? 'ready' : 'idle');
  };
  const play = () => {
    if (!uri.current) return;
    cleanup();
    const p = createAudioPlayer({ uri: uri.current });
    player.current = p;
    setState('playing');
    p.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) setState('ready');
    });
    p.play();
  };

  if (state === 'off') return <Text style={styles.off}>{t('Microphone is off — say it out loud instead.')}</Text>;
  return (
    <View style={styles.row}>
      {state === 'recording' ? (
        <Pressable onPress={() => void stop()} style={[styles.rec, { backgroundColor: '#E5383B' }]} accessibilityRole="button">
          <View style={styles.stopSq} />
          <Text style={styles.recText}>{t('Stop')}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={() => void start()} style={[styles.rec, { borderColor: color, borderWidth: 2, backgroundColor: '#FFFFFF' }]} accessibilityRole="button">
          <Feather name="mic" size={18} color={color} />
          <Text style={[styles.recText, { color }]}>{state === 'idle' ? t('Record me') : t('Record again')}</Text>
        </Pressable>
      )}
      {(state === 'ready' || state === 'playing') && (
        <Pressable onPress={play} style={[styles.rec, { backgroundColor: color }]} accessibilityRole="button">
          <Feather name={state === 'playing' ? 'volume-2' : 'play'} size={18} color="#FFFFFF" />
          <Text style={styles.recText}>{t('Hear me')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hear: { alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  rec: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22 },
  recText: { fontFamily: font.bold, fontSize: 14.5, color: '#FFFFFF' },
  stopSq: { width: 14, height: 14, borderRadius: 3, backgroundColor: '#FFFFFF' },
  off: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, textAlign: 'center' },
});
