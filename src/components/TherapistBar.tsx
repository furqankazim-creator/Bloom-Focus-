import { t } from '../i18n';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CLINIC_TAGS } from '../engine/clinic';
import { useStore } from '../store/useStore';
import { colors, font } from '../theme';

/**
 * The therapist's controls during a clinic session: one-tap observations, a quick note,
 * easier / harder before the game starts, and skip. The child keeps playing above it.
 */
export function TherapistBar({
  visitId,
  taskId,
  level,
  canTune,
  onTune,
  onSkip,
  hasNext,
}: {
  visitId: string;
  /** Focus game id or `library-<family>`. */
  taskId: string;
  /** A level number, or a label like "Easy". */
  level: number | string;
  canTune: boolean;
  onTune: (delta: -1 | 1) => void;
  onSkip: () => void;
  hasNext: boolean;
}) {
  const add = useStore((s) => s.addVisitObservation);
  const logged = useStore((s) => s.clinicVisits.find((v) => v.id === visitId)?.observations.filter((o) => o.taskId === taskId).length ?? 0);
  const [open, setOpen] = useState(true);
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState('');
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1200);
    return () => clearTimeout(t);
  }, [flash]);

  const saveNote = () => {
    if (!note.trim()) return setNoting(false);
    add(visitId, { tag: 'note', taskId, note: note.trim().slice(0, 300) });
    setNote('');
    setNoting(false);
    setFlash('Note saved');
  };

  return (
    <View style={styles.bar}>
      <View style={styles.head}>
        <Text style={styles.badge} numberOfLines={1}>{t('THERAPIST')}</Text>
        <Text style={[styles.meta, { flex: 1 }]} numberOfLines={1}>
          {flash ? `✓ ${flash}` : `${logged} logged · ${typeof level === 'number' ? `Level ${level}` : level}`}
        </Text>
        <Pressable onPress={onSkip} style={styles.tune} accessibilityLabel={hasNext ? 'Skip to the next game' : 'End the games'}>
          <Feather name="skip-forward" size={14} color={colors.white} />
          <Text style={styles.tuneText}>{hasNext ? 'Skip' : 'End'}</Text>
        </Pressable>
        <Pressable onPress={() => setOpen((o) => !o)} hitSlop={8} accessibilityLabel={open ? 'Hide therapist bar' : 'Show therapist bar'}>
          <Feather name={open ? 'chevron-down' : 'chevron-up'} size={20} color={colors.lime} />
        </Pressable>
      </View>
      {open &&
        (noting ? (
          <View style={styles.noteRow}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Quick note about this game…"
              placeholderTextColor="#9FB5A8"
              style={styles.input}
              autoFocus
              onSubmitEditing={saveNote}
              returnKeyType="done"
            />
            <Pressable onPress={saveNote} style={styles.save} accessibilityLabel="Save note">
              <Feather name="check" size={18} color={colors.forestDeep} />
            </Pressable>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {canTune && (
              <>
                <Pressable onPress={() => onTune(-1)} style={[styles.chip, styles.noteChip]} accessibilityLabel="Make easier">
                  <Feather name="minus" size={14} color={colors.white} />
                  <Text style={[styles.chipText, { color: colors.white }]}>{t('Easier')}</Text>
                </Pressable>
                <Pressable onPress={() => onTune(1)} style={[styles.chip, styles.noteChip]} accessibilityLabel="Make harder">
                  <Feather name="plus" size={14} color={colors.white} />
                  <Text style={[styles.chipText, { color: colors.white }]}>{t('Harder')}</Text>
                </Pressable>
              </>
            )}
            {CLINIC_TAGS.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => {
                  add(visitId, { tag: t.id, taskId });
                  setFlash(t.label);
                }}
                style={({ pressed }) => [styles.chip, t.tone === 'good' ? styles.good : styles.watch, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`Log: ${t.label}`}
              >
                <Text style={styles.chipText}>
                  {t.emoji} {t.label}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setNoting(true)} style={[styles.chip, styles.noteChip]} accessibilityRole="button">
              <Feather name="edit-3" size={13} color={colors.white} />
              <Text style={[styles.chipText, { color: colors.white }]}>{t('Note')}</Text>
            </Pressable>
          </ScrollView>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.forestDeep,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { fontFamily: font.bold, fontSize: 10.5, letterSpacing: 1.2, color: colors.lime },
  meta: { fontFamily: font.medium, fontSize: 12, color: colors.onDark, flexShrink: 1 },
  tune: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 9, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)' },
  tuneText: { fontFamily: font.semibold, fontSize: 12, color: colors.white },
  chips: { gap: 8, paddingRight: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18 },
  good: { backgroundColor: colors.lime },
  watch: { backgroundColor: colors.warm },
  noteChip: { backgroundColor: 'rgba(255,255,255,0.16)' },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: colors.forestDeep },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: colors.white,
    fontFamily: font.regular,
    fontSize: 14,
  },
  save: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
});
