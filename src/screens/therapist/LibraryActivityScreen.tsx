import { useVisibleChildren } from '../../store/useTeam';
import { t } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LIBRARY_ART } from '../../library/art';
import { Avatar, Button, IconButton, Screen, T, flipIcon } from '../../components/ui';
import { fitBand } from '../../engine/personalize';
import { libraryActivity, libraryCard } from '../../library/assign';
import { FAMILY, LEVEL_NAMES, MODE_INFO, ageFit, isLibraryFamily, startLevel } from '../../library/catalog';
import { printSheet } from '../../library/print';
import { ScheduleEditor } from '../../components/ScheduleEditor';
import { scheduleLabel } from '../../engine/schedule';
import type { RootProps } from '../../navigation/types';
import { postToConversation } from '../../services/messaging';
import { parentLabel } from '../../store/seed';
import { useStore } from '../../store/useStore';
import { colors, font } from '../../theme';



export default function LibraryActivityScreen({ route, navigation }: RootProps<'LibraryActivity'>) {
  const id = route.params.family;
  const f = isLibraryFamily(id) ? FAMILY[id] : undefined;
  const children = useVisibleChildren();
  const libraryPlays = useStore((s) => s.libraryPlays);
  const saveCustomActivity = useStore((s) => s.saveCustomActivity);
  const removeCustomActivity = useStore((s) => s.removeCustomActivity);
  const [childId, setChildId] = useState(route.params.childId ?? children[0]?.id);
  const child = children.find((c) => c.id === childId);
  const age = child ? child.cognitiveAge ?? child.age : 8;
  const support = child ? ['extra-support', 'support'].includes(fitBand(child).band) : false;
  const [level, setLevel] = useState(f && child ? startLevel(f, age, support) : 1);
  const [times, setTimes] = useState(3);
  const [days, setDays] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  if (!f) return null;
  const mode = MODE_INFO[f.mode];
  const fit = child ? ageFit(f, age) : 'fits';
  const assignedTo = children.flatMap((c) => (c.customActivities ?? []).filter((a) => a.library?.family === f.id).map((a) => ({ c, a })));

  const pickChild = (cid: string) => {
    setChildId(cid);
    const c = children.find((x) => x.id === cid);
    if (c) setLevel(startLevel(f, c.cognitiveAge ?? c.age, ['extra-support', 'support'].includes(fitBand(c).band)));
    setStatus(null);
  };

  const tryIt = () => {
    const cid = child?.id ?? children[0]?.id;
    if (!cid) return;
    navigation.navigate(f.mode === 'app' ? 'LibraryPlay' : 'LibrarySteps', { childId: cid, family: f.id, level, preview: true });
  };

  const assign = async () => {
    if (!child) return;
    const a = libraryActivity(f.id, level, times, note, child, { days, autoLevel: useStore.getState().settings.defaultAutoLevel });
    saveCustomActivity(child.id, a);
    setStatus(`Assigned to ${child.name.split(' ')[0]} · ${LEVEL_NAMES[level - 1]}`);
    try {
      await postToConversation(child.id, 'therapist', { text: '', card: libraryCard(a) });
      setStatus(`Assigned and sent to ${parentLabel(child)} ✓`);
    } catch {
      setStatus(`Assigned to ${child.name.split(' ')[0]} — the message couldn’t be sent.`);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="arrow-left" label="Back" onPress={() => navigation.goBack()} />
        <T.Eyebrow style={{ marginBottom: 0, flex: 1 }}>{t('Skill Builders')}</T.Eyebrow>
      </View>

      <View style={[styles.banner, { backgroundColor: f.tint }]}>
        <View style={styles.artRing}>
          <Image source={LIBRARY_ART[f.id]} style={{ width: 76, height: 76 }} accessibilityIgnoresInvertColors />
        </View>
        <Text style={[styles.bannerName, { color: f.color }]}>{f.name}</Text>
        <Text style={styles.bannerSummary}>{f.summary}</Text>
        <View style={styles.chips}>
          <Chip text={`${mode.emoji} ${mode.label}`} />
          <Chip text={`⏱ ${f.minutes} min`} />
          <Chip text={`👧 Ages ${f.ages[0]}–${f.ages[1]}`} />
        </View>
      </View>

      <Text style={styles.section}>{t('LEVELS · EASY TO HARD')}</Text>
      <View style={styles.levels}>
        {f.levels.map((detail, i) => {
          const on = level === i + 1;
          return (
            <Pressable key={i} onPress={() => setLevel(i + 1)} style={[styles.level, on && styles.levelOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[styles.levelName, on && { color: colors.white }]}>{LEVEL_NAMES[i]}</Text>
              <Text style={[styles.levelDetail, on && { color: colors.onDark }]}>{detail}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.section}>{f.mode === 'app' ? 'HOW TO PLAY' : 'STEP BY STEP FOR THE PARENT'}</Text>
      <View style={styles.card}>
        {f.steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={[styles.stepNum, { backgroundColor: f.tint }]}>
              <Text style={[styles.stepNumText, { color: f.color }]}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{s}</Text>
          </View>
        ))}
        {!!f.materials && <Text style={styles.meta}>🧰 You need: {f.materials}</Text>}
        {!!f.modeNote && <Text style={styles.meta}>💡 {f.modeNote}</Text>}
      </View>

      <View style={styles.row}>
        <Button label={f.mode === 'app' ? 'Try it' : 'Preview'} icon={f.mode === 'app' ? 'play' : 'layers'} variant="light" onPress={tryIt} style={{ flex: 1 }} />
        <Button label="Print" icon="printer" variant="light" onPress={() => printSheet(f.id, level, child?.name ?? '', undefined, child?.favouriteCharacters?.[0])} style={{ flex: 1 }} />
      </View>
      <Pressable onPress={() => navigation.navigate('LibraryCustomise', { family: f.id, childId: child?.id })} style={[styles.customise, { borderColor: f.color + '55', backgroundColor: f.tint }]} accessibilityRole="button">
        <Feather name="sliders" size={18} color={f.color} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.customiseTitle, { color: f.color }]}>{t('Customise')}</Text>
          <Text style={styles.meta}>{t('Heroes, your own content for each level, name and instructions')}</Text>
        </View>
        <Feather name={flipIcon('chevron-right')} size={18} color={f.color} />
      </Pressable>

      <Text style={styles.section}>{t('ASSIGN TO A CHILD')}</Text>
      <View style={styles.card}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {children.map((c) => {
            const on = c.id === childId;
            return (
              <Pressable key={c.id} onPress={() => pickChild(c.id)} style={[styles.kid, on && styles.kidOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Avatar name={c.name} color={c.color} photo={c.photo} emoji={c.avatarEmoji} size={30} />
                <Text style={[styles.kidName, on && { color: colors.white }]}>{c.name.split(' ')[0]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {child && fit !== 'fits' && (
          <Text style={[styles.fit, { color: colors.danger }]}>
            {fit === 'young'
                ? `⚠ Made for ages ${f.ages[0]}+ — ${child.name.split(' ')[0]} works at about age ${age}. Start on Easy with hands-on help.`
                : `⚠ May be too easy for age ${age}. Try Hard, or pick a harder activity.`}
          </Text>
        )}
        <Text style={styles.label}>{t('Which days')}</Text>
        <ScheduleEditor value={{ days, times }} onChange={(v) => { setDays(v.days); setTimes(v.times); }} color={f.color} tint={f.tint} />
        <TextInput value={note} onChangeText={setNote} placeholder="Note for the family (optional)" placeholderTextColor={colors.inkMuted} style={styles.input} multiline maxLength={200} />
        <Button label={child ? `Assign to ${child.name.split(' ')[0]} · ${LEVEL_NAMES[level - 1]}` : 'Add a child first'} icon="send" disabled={!child} onPress={assign} />
        {!!status && <Text style={styles.status}>{status}</Text>}
      </View>

      {assignedTo.length > 0 && (
        <>
          <Text style={styles.section}>{t('ASSIGNED')}</Text>
          <View style={{ gap: 8 }}>
            {assignedTo.map(({ c, a }) => {
              const n = libraryPlays.filter((p) => p.activityId === a.id).length;
              return (
                <View key={a.id} style={[styles.card, styles.assignedRow]}>
                  <Pressable onPress={() => navigation.navigate('LibraryCustomise', { family: f.id, childId: c.id, activityId: a.id })} style={[styles.assignedRow, { flex: 1 }]} accessibilityRole="button" accessibilityLabel={`Edit ${c.name}'s copy`}>
                  <Avatar name={c.name} color={c.color} photo={c.photo} emoji={c.avatarEmoji} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.kidNameDark}>{c.name}{a.name !== f.name ? ` · ${a.name}` : ''}</Text>
                    <Text style={styles.meta}>
                      {LEVEL_NAMES[(a.library?.level ?? 1) - 1]} now · {n} go{n === 1 ? '' : 'es'} · {scheduleLabel(a.days, a.timesPerWeek)}
                    </Text>
                  </View>
                  <Feather name="edit-2" size={16} color={colors.inkMuted} />
                  </Pressable>
                  <Pressable onPress={() => removeCustomActivity(c.id, a.id)} hitSlop={8} accessibilityLabel={`Remove from ${c.name}`}>
                    <Feather name="trash-2" size={18} color={colors.inkMuted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  banner: { borderRadius: 26, padding: 20, marginTop: 14, alignItems: 'center' },
  artRing: { width: 104, height: 104, borderRadius: 52, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  aka: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  bannerName: { fontFamily: font.heavy, fontSize: 26, marginTop: 6, textAlign: 'center' },
  bannerSummary: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.ink, textAlign: 'center', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 },
  chip: { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontFamily: font.semibold, fontSize: 12, color: colors.ink },
  source: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft, marginTop: 10 },
  section: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 1.4, color: colors.inkSoft, marginTop: 24, marginBottom: 10 },
  levels: { flexDirection: 'row', gap: 8 },
  level: { flex: 1, backgroundColor: colors.card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
  levelOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  levelName: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  levelDetail: { fontFamily: font.regular, fontSize: 12, color: colors.inkSoft, marginTop: 3, lineHeight: 16 },
  hint: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, marginTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.border },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: font.bold, fontSize: 13 },
  stepText: { flex: 1, fontFamily: font.medium, fontSize: 14.5, lineHeight: 21, color: colors.ink },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  kid: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4, paddingRight: 12, height: 40, borderRadius: 20, backgroundColor: colors.sage },
  kidOn: { backgroundColor: colors.forest },
  kidName: { fontFamily: font.semibold, fontSize: 14, color: colors.forest },
  kidNameDark: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  fit: { fontFamily: font.medium, fontSize: 13, color: colors.forest, lineHeight: 18 },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft },
  seg: { paddingHorizontal: 12, height: 36, borderRadius: 12, backgroundColor: colors.sage, justifyContent: 'center' },
  segOn: { backgroundColor: colors.forest },
  segText: { fontFamily: font.semibold, fontSize: 13, color: colors.forest },
  input: { borderRadius: 14, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 10, minHeight: 60, fontFamily: font.regular, fontSize: 14, color: colors.ink, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  status: { fontFamily: font.semibold, fontSize: 14, color: colors.forest, textAlign: 'center' },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customise: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 2, marginTop: 10 },
  customiseTitle: { fontFamily: font.bold, fontSize: 16 },
});
