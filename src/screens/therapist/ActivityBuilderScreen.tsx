import { t } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { HeroPicker } from '../../components/hero/HeroPicker';
import { HeroScene } from '../../components/hero/HeroScene';
import { HeroSticker } from '../../components/hero/HeroSticker';
import { Button, Screen, TopBar } from '../../components/ui';
import { taskLevel } from '../../engine/adaptive';
import { WORLDS, worldOf } from '../../engine/heroes';
import { BAND_LABEL, fitBand, paramsForBand } from '../../engine/personalize';
import { BASE_PARAMS, DIM_LABEL, DIM_STEPS, TASKS, formatDim } from '../../engine/tasks';
import { gameDurationSec, trainTaskDef, type TrainTaskId } from '../../engine/trainTasks';
import { TRAIN_GAME, TRAIN_GAMES } from '../../games/train/meta';
import type { RootProps } from '../../navigation/types';
import { postToConversation } from '../../services/messaging';
import { SUPPORT_LEVELS, type SupportLevel } from '../../services/noteCards';
import { uid } from '../../store/seed';
import { ScheduleEditor } from '../../components/ScheduleEditor';
import { scheduleLabel } from '../../engine/schedule';
import { useChild, useStore } from '../../store/useStore';
import { colors, font } from '../../theme';
import type { Character, CustomActivity, Dim, Params, SceneStyle } from '../../types';
import { firstName } from '../helpers';

const INSTRUCTION_IDEAS = ['Sit together for the first round.', 'Stop while it still feels fun.', 'Celebrate every try, not just wins.', 'Play after a snack, not before bed.'];
const SCENES: { value: SceneStyle; label: string; hint: string }[] = [
  { value: 'off', label: 'Off', hint: 'Plain background' },
  { value: 'subtle', label: 'Subtle', hint: 'Soft, low distraction' },
  { value: 'bold', label: 'Bold', hint: 'Full hero world' },
];

/** Therapist personalises one of the Train games: heroes, their world, difficulty and family notes. */
export default function ActivityBuilderScreen({ route, navigation }: RootProps<'ActivityBuilder'>) {
  const { childId, activityId, taskId: startTask } = route.params;
  const child = useChild(childId);
  const saveCustomActivity = useStore((s) => s.saveCustomActivity);
  const removeCustomActivity = useStore((s) => s.removeCustomActivity);
  const existing = child?.customActivities?.find((a) => a.id === activityId);

  const [taskId, setTaskId] = useState<TrainTaskId>((existing?.taskId as TrainTaskId) ?? startTask ?? 'starWatch');
  const [name, setName] = useState(existing?.name ?? '');
  const [heroes, setHeroes] = useState<Character[]>(
    existing?.heroes ?? (existing?.hero ? [existing.hero] : child?.favouriteCharacters?.slice(0, 1) ?? []),
  );
  const [scene, setScene] = useState<SceneStyle>(existing?.scene ?? (child?.sensory?.busyScreens ? 'off' : 'subtle'));
  const [adaptive, setAdaptive] = useState(existing?.adaptive ?? true);
  const [params, setParams] = useState<Params>(existing?.params ?? child?.tasks[taskId]?.params ?? BASE_PARAMS);
  const [support, setSupport] = useState<SupportLevel | undefined>(existing?.supportLevel);
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [perWeek, setPerWeek] = useState(existing?.timesPerWeek ?? 3);
  const [days, setDays] = useState<number[]>(existing?.days ?? []);
  const [saving, setSaving] = useState(false);

  const fit = useMemo(() => (child ? fitBand(child) : null), [child]);
  if (!child) return null;
  const first = firstName(child.name);
  const game = TRAIN_GAME[taskId];
  const hero = heroes[0];
  const autoName = `${hero ? `${hero.name}’s ` : ''}${game.title}`;
  const finalName = name.trim() || autoName;
  const dims = (TASKS[taskId].dims as Dim[]).filter((d) => !(d === 'durationSec' && ['memoryEcho', 'memoryMatrix', 'followSteps'].includes(taskId)));
  const playParams = adaptive ? child.tasks[taskId]?.params ?? BASE_PARAMS : params;
  const level = taskLevel(trainTaskDef(taskId), playParams);
  const minutes = Math.max(1, Math.round(gameDurationSec(taskId, playParams) / 60));
  const onDark = scene === 'bold' && !!hero && !!WORLDS[worldOf(hero)].dark;

  const pickGame = (id: TrainTaskId) => {
    setTaskId(id);
    setParams(child.tasks[id]?.params ?? BASE_PARAMS);
  };

  const step = (dim: Dim, dir: 1 | -1) => {
    const ladder = DIM_STEPS[dim];
    const i = Math.max(0, ladder.indexOf(params[dim]));
    setParams({ ...params, [dim]: ladder[Math.min(ladder.length - 1, Math.max(0, i + dir))] });
  };

  const usePersonalised = () => {
    if (!fit || fit.band === 'typical' || fit.band === 'stretch') return;
    setParams({ ...params, ...paramsForBand(params, fit.band, !!child.sensory?.busyScreens) });
  };

  const build = (): CustomActivity => ({
    id: existing?.id ?? uid(),
    taskId,
    name: finalName.slice(0, 40),
    ...(hero ? { hero, heroes } : {}),
    scene,
    instructions: instructions.trim().slice(0, 300),
    ...(support ? { supportLevel: support } : {}),
    timesPerWeek: days.length || perWeek,
    ...(days.length ? { days } : {}),
    adaptive,
    params,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });

  const save = async (send: boolean) => {
    const activity = build();
    saveCustomActivity(child.id, activity);
    if (send) {
      setSaving(true);
      try {
        await postToConversation(child.id, 'therapist', {
          text: activity.instructions,
          card: {
            type: 'activity',
            taskId,
            level,
            minutes,
            frequency: scheduleLabel(days, perWeek),
            ...(support ? { supportLevel: support } : {}),
            customId: activity.id,
            title: activity.name,
            ...(hero ? { heroEmoji: hero.emoji } : {}),
          },
        });
      } catch {
        Alert.alert('Saved, but not sent', 'The activity is saved. Check your connection and send it from Messages.');
      } finally {
        setSaving(false);
      }
    }
    navigation.goBack();
  };

  const remove = () => {
    const go = () => {
      if (existing) removeCustomActivity(child.id, existing.id);
      navigation.goBack();
    };
    if (Platform.OS === 'web') return go();
    Alert.alert('Delete this activity?', 'The family will no longer see it on their Home screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <Screen>
      <TopBar title={existing ? 'Edit activity' : 'Customise an activity'} onBack={() => navigation.goBack()} />

      {/* Live poster: the game in its hero world, as the family will see it. */}
      <View style={styles.poster}>
        <HeroScene heroes={heroes} scene={scene === 'off' ? 'off' : 'bold'} style={styles.posterScene} compact>
          <View style={styles.posterBody}>
            <View style={styles.posterIcons}>
              <View style={[styles.gameBadge, { backgroundColor: game.tint }]}>
                <Text style={{ fontSize: 30 }}>{game.icon}</Text>
              </View>
              {heroes.map((h, i) => (
                <HeroSticker key={i} hero={h} size={i === 0 ? 64 : 48} showName={i === 0} style={{ marginLeft: i === 0 ? -12 : -6, marginTop: i === 0 ? 14 : 30 }} />
              ))}
            </View>
            <Text style={[styles.posterKicker, onDark && { color: '#C9C4FF' }]}>FOR {first.toUpperCase()}</Text>
            <Text style={[styles.posterTitle, onDark && { color: colors.white }]} numberOfLines={2}>
              {finalName}
            </Text>
            <View style={styles.posterChips}>
              {[`Level ${level}`, `~${minutes} min`, scheduleLabel(days, perWeek), adaptive ? 'Adaptive' : 'Fixed'].map((c) => (
                <View key={c} style={styles.posterChip}>
                  <Text style={styles.posterChipText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        </HeroScene>
      </View>

      {/* 1 · Game */}
      <Section n={1} title="Activity" hint={game.skill}>
        <View style={styles.games}>
          {/* Chosen already (from a problem area, or editing): show only that game. */}
          {(startTask || existing ? TRAIN_GAMES.filter((g) => g.id === taskId) : TRAIN_GAMES).map((g) => {
            const on = g.id === taskId;
            return (
              <Pressable key={g.id} onPress={() => pickGame(g.id)} style={[styles.game, on && { borderColor: g.color, backgroundColor: g.tint }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={{ fontSize: 22 }}>{g.icon}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.gameTitle} numberOfLines={2}>
                    {g.title}
                  </Text>
                  <Text style={styles.gameSkill} numberOfLines={1}>
                    {g.skill}
                  </Text>
                </View>
                {on && <Feather name="check-circle" size={16} color={g.color} />}
              </Pressable>
            );
          })}
        </View>
      </Section>

      {/* 2 · Heroes & world */}
      <Section n={2} title="Heroes" hint={t('Up to 3. The first is {{name}}’s activity buddy; it talks and cheers during play.', { name: first })}>
        <HeroPicker value={heroes} onChange={setHeroes} max={3} favourites={child.favouriteCharacters ?? []} />
        <Text style={styles.label}>{t('Hero world around the activity')}</Text>
        <View style={styles.segment}>
          {SCENES.map((o) => (
            <Pressable key={o.value} onPress={() => setScene(o.value)} style={[styles.segmentItem, scene === o.value && styles.segmentOn]} accessibilityRole="button" accessibilityState={{ selected: scene === o.value }}>
              <Text style={[styles.segmentLabel, scene === o.value && { color: colors.forest }]}>{o.label}</Text>
              <Text style={styles.segmentHint}>{o.hint}</Text>
            </Pressable>
          ))}
        </View>
        {hero && scene !== 'off' && <Text style={styles.hint}>World: {WORLDS[worldOf(hero)].name} {WORLDS[worldOf(hero)].props.slice(0, 3).join(' ')}</Text>}
      </Section>

      {/* 3 · Difficulty */}
      <Section n={3} title="Difficulty">
        <View style={styles.segment}>
          {[
            { v: true, label: 'Adaptive', hint: 'Grows with the child' },
            { v: false, label: 'Fixed', hint: 'Always this level' },
          ].map((o) => (
            <Pressable key={o.label} onPress={() => setAdaptive(o.v)} style={[styles.segmentItem, adaptive === o.v && styles.segmentOn]} accessibilityRole="button">
              <Text style={[styles.segmentLabel, adaptive === o.v && { color: colors.forest }]}>{o.label}</Text>
              <Text style={styles.segmentHint}>{o.hint}</Text>
            </Pressable>
          ))}
        </View>
        {!adaptive && (
          <View style={styles.dims}>
            {dims.map((d) => (
              <View key={d} style={styles.dimRow}>
                <Text style={styles.dimLabel}>{TASKS[taskId].dimLabels?.[d] ?? DIM_LABEL[d]}</Text>
                <Pressable onPress={() => step(d, -1)} style={styles.stepBtn} accessibilityLabel={`Lower ${DIM_LABEL[d]}`}>
                  <Feather name="minus" size={16} color={colors.forest} />
                </Pressable>
                <Text style={styles.dimValue}>{formatDim(d, params[d])}</Text>
                <Pressable onPress={() => step(d, 1)} style={styles.stepBtn} accessibilityLabel={`Raise ${DIM_LABEL[d]}`}>
                  <Feather name="plus" size={16} color={colors.forest} />
                </Pressable>
              </View>
            ))}
            {fit && (fit.band === 'extra-support' || fit.band === 'support') && (
              <Pressable onPress={usePersonalised} style={styles.personal} accessibilityRole="button">
                <Feather name="user-check" size={15} color={colors.forest} />
                <Text style={styles.personalText}>Use {BAND_LABEL[fit.band].toLowerCase()} level from {first}’s profile</Text>
              </Pressable>
            )}
          </View>
        )}
      </Section>

      {/* 4 · For the family */}
      <Section n={4} title="For the family">
        <Text style={[styles.label, { marginTop: 0 }]}>{t('Name')}</Text>
        <TextInput value={name} onChangeText={setName} placeholder={autoName} placeholderTextColor={colors.inkMuted} style={styles.input} maxLength={40} />
        <Text style={styles.label}>{t('Support level')}</Text>
        <View style={styles.wrap}>
          {SUPPORT_LEVELS.map((l) => {
            const on = support === l.value;
            return (
              <Pressable key={l.value} onPress={() => setSupport(on ? undefined : l.value)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={{ fontSize: 14 }}>{l.emoji}</Text>
                <Text style={[styles.chipText, on && { color: colors.white }]}>{l.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.label}>{t('Instructions')}</Text>
        <TextInput
          value={instructions}
          onChangeText={setInstructions}
          placeholder={game.tip ?? 'How should the family set this up?'}
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, styles.multiline]}
          multiline
          maxLength={300}
        />
        <View style={[styles.wrap, { marginTop: 8 }]}>
          {INSTRUCTION_IDEAS.map((idea) => (
            <Pressable key={idea} onPress={() => setInstructions((t) => (t.includes(idea) ? t : `${t.trim()} ${idea}`.trim()))} style={styles.idea} accessibilityRole="button">
              <Text style={styles.ideaText}>+ {idea}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{t('Which days')}</Text>
        <ScheduleEditor value={{ days, times: perWeek }} onChange={(v) => { setDays(v.days); setPerWeek(v.times); }} />
      </Section>

      <Button label={saving ? 'Sending…' : 'Save & send to family'} icon="send" disabled={saving} onPress={() => void save(true)} style={{ marginTop: 24 }} />
      <Button label="Save only" icon="check" variant="soft" disabled={saving} onPress={() => void save(false)} style={{ marginTop: 10 }} />
      {existing && <Button label="Delete activity" icon="trash-2" variant="danger" onPress={remove} style={{ marginTop: 10 }} />}
    </Screen>
  );
}

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.stepNum}>
          <Text style={styles.stepNumText}>{n}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {!!hint && <Text style={styles.sectionHint}>{hint}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  poster: { marginTop: 8, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  posterScene: { minHeight: 210 },
  posterBody: { padding: 18, paddingBottom: 30 },
  posterIcons: { flexDirection: 'row', alignItems: 'flex-start' },
  gameBadge: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white },
  posterKicker: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: colors.forest, marginTop: 12 },
  posterTitle: { fontFamily: font.heavy, fontSize: 22, color: colors.ink, marginTop: 2 },
  posterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  posterChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.88)' },
  posterChipText: { fontFamily: font.semibold, fontSize: 12, color: colors.ink },

  section: { marginTop: 16, padding: 16, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontFamily: font.bold, fontSize: 12, color: colors.white },
  sectionTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink },
  sectionHint: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.inkSoft, marginTop: 2 },

  games: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  game: { width: '48.5%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bg },
  gameTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  gameSkill: { fontFamily: font.regular, fontSize: 11, color: colors.inkMuted },

  label: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, marginTop: 18, marginBottom: 8 },
  hint: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkSoft, marginTop: 8 },
  segment: { flexDirection: 'row', gap: 8 },
  segmentItem: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bg },
  segmentOn: { borderColor: colors.forest, backgroundColor: colors.mint },
  segmentLabel: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  segmentHint: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, marginTop: 2 },

  dims: { marginTop: 12, gap: 12 },
  dimRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dimLabel: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.ink },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  dimValue: { width: 72, textAlign: 'center', fontFamily: font.bold, fontSize: 14, color: colors.ink },
  personal: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
  personalText: { fontFamily: font.semibold, fontSize: 13, color: colors.forest },

  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 11, fontFamily: font.regular, fontSize: 16, color: colors.ink },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 19, backgroundColor: colors.sage },
  chipOn: { backgroundColor: colors.forest },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  idea: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.mint },
  ideaText: { fontFamily: font.medium, fontSize: 12, color: colors.forest },
  pill: { minWidth: 52, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.forest },
  pillText: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
});
