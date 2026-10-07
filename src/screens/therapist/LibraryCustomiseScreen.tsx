import { useTeamMember, useVisibleChildren } from '../../store/useTeam';
import { t } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { HeroPicker } from '../../components/hero/HeroPicker';
import { Avatar, IconButton, Screen, T } from '../../components/ui';
import { fitBand } from '../../engine/personalize';
import { LIBRARY_ART } from '../../library/art';
import { libraryActivity, libraryCard } from '../../library/assign';
import { FAMILY, LEVEL_NAMES, isLibraryFamily, startLevel } from '../../library/catalog';
import { PatternEditor } from '../../library/PatternEditor';
import { ScheduleEditor } from '../../components/ScheduleEditor';
import { printSheet } from '../../library/print';
import { SETTINGS, configFor, describeConfig, type Field, type LibraryCustom } from '../../library/settings';
import type { RootProps } from '../../navigation/types';
import { postToConversation } from '../../services/messaging';
import { uid } from '../../store/seed';
import { useStore } from '../../store/useStore';
import { colors, font } from '../../theme';
import type { Character, LibraryVersion, SceneStyle } from '../../types';

const SCENES: { id: SceneStyle; label: string; hint: string }[] = [
  { id: 'off', label: 'Off', hint: 'Plain' },
  { id: 'subtle', label: 'Subtle', hint: 'Soft' },
  { id: 'bold', label: 'Bold', hint: 'Full world' },
];

/**
 * Customise a Skill Builder: name, instructions, heroes, what each level contains, and who gets it.
 * Opens on a child's assigned copy (`activityId`), a saved version (`versionId`) or a fresh one.
 */
export default function LibraryCustomiseScreen({ route, navigation }: RootProps<'LibraryCustomise'>) {
  const id = route.params.family;
  const f = isLibraryFamily(id) ? FAMILY[id] : undefined;
  const children = useVisibleChildren();
  const versions = useStore((s) => s.libraryVersions);
  const saveCustomActivity = useStore((s) => s.saveCustomActivity);
  const saveLibraryVersion = useStore((s) => s.saveLibraryVersion);
  const owner = children.find((c) => c.id === route.params.childId);
  const existing = route.params.activityId ? owner?.customActivities?.find((a) => a.id === route.params.activityId) : undefined;
  const version = versions.find((v) => v.id === (route.params.versionId ?? existing?.library?.versionId));
  const firstChild = owner ?? children[0];

  const [name, setName] = useState(existing?.name ?? version?.name ?? f?.name ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions ?? version?.instructions ?? '');
  const [heroes, setHeroes] = useState<Character[]>(existing?.heroes ?? version?.heroes ?? (firstChild?.favouriteCharacters ?? []).slice(0, 1));
  const [scene, setScene] = useState<SceneStyle>(existing?.scene ?? version?.scene ?? (firstChild?.sensory?.busyScreens ? 'off' : 'subtle'));
  const [custom, setCustom] = useState<LibraryCustom>(existing?.library?.custom ?? version?.custom ?? {});
  const suggested = f && firstChild ? startLevel(f, firstChild.cognitiveAge ?? firstChild.age, ['extra-support', 'support'].includes(fitBand(firstChild).band)) : 1;
  const [level, setLevel] = useState(existing?.library?.level ?? version?.level ?? suggested);
  const [editing, setEditing] = useState<1 | 2 | 3>((existing?.library?.level ?? version?.level ?? suggested) as 1 | 2 | 3);
  const defaultAuto = useStore((s) => s.settings.defaultAutoLevel);
  const [autoLevel, setAutoLevel] = useState(existing?.library?.autoLevel ?? version?.autoLevel ?? defaultAuto);
  const [times, setTimes] = useState(existing?.timesPerWeek ?? 3);
  const [days, setDays] = useState<number[]>(existing?.days ?? []);
  const [targets, setTargets] = useState<string[]>(owner ? [owner.id] : firstChild ? [firstChild.id] : []);
  const [keepVersion, setKeepVersion] = useState(!!version);
  const [shareTeam, setShareTeam] = useState(!!version?.shared);
  const { team, me } = useTeamMember();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!f) return null;
  const spec = SETTINGS[f.id];
  const cfg = configFor(f.id, editing, custom);
  const setField = (key: string, value: unknown) => setCustom((c) => ({ ...c, [editing]: { ...(c[editing] ?? {}), [key]: value } }));
  const changed = (lv: 1 | 2 | 3) => Object.keys(custom[lv] ?? {}).length > 0;
  const previewChild = children.find((c) => c.id === targets[0]) ?? firstChild;

  const save = async (send: boolean) => {
    if (busy) return;
    setBusy(true);
    let versionId = version?.id;
    if (keepVersion) {
      const now = new Date().toISOString();
      const v: LibraryVersion = { id: versionId ?? uid(), family: f.id, name: name.trim() || f.name, instructions, heroes, scene, custom, level, autoLevel, createdAt: version?.createdAt ?? now, updatedAt: now, ownerId: version?.ownerId ?? me?.id, shared: shareTeam };
      saveLibraryVersion(v);
      versionId = v.id;
    }
    let sent = 0;
    for (const cid of targets) {
      const child = children.find((c) => c.id === cid);
      if (!child) continue;
      // Editing a child's copy keeps its id (and history); everyone else gets their own copy.
      const keepId = existing && cid === owner?.id ? { id: existing.id, createdAt: existing.createdAt } : {};
      const a = libraryActivity(f.id, level, times, instructions, child, { ...keepId, name, heroes, scene, custom, autoLevel, versionId, days });
      if (existing && cid === owner?.id) a.library = { ...a.library!, streak: existing.library?.streak ?? 0 };
      saveCustomActivity(child.id, a);
      if (send) {
        try {
          await postToConversation(child.id, 'therapist', { text: '', card: libraryCard(a) });
          sent++;
        } catch {
          // Saved on the plan even if the message couldn't go.
        }
      }
    }
    setBusy(false);
    const who = targets.map((t) => children.find((c) => c.id === t)?.name.split(' ')[0]).filter(Boolean).join(', ');
    setStatus(targets.length ? `Saved for ${who}${send && sent ? ' and sent to the family ✓' : ''}` : keepVersion ? 'Saved to My versions ✓' : 'Pick a child first');
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="arrow-left" label="Back" onPress={() => navigation.goBack()} />
        <View style={[styles.art, { backgroundColor: f.tint }]}>
          <Image source={LIBRARY_ART[f.id]} style={{ width: 34, height: 34 }} />
        </View>
        <View style={{ flex: 1 }}>
          <T.Eyebrow style={{ marginBottom: 0 }}>{t('Customise')}</T.Eyebrow>
          <Text style={styles.title} numberOfLines={1}>
            {f.name}
          </Text>
        </View>
      </View>

      <Section n={1} title="Name & instructions" color={f.color} />
      <View style={styles.card}>
        <TextInput value={name} onChangeText={setName} placeholder={f.name} placeholderTextColor={colors.inkMuted} style={styles.input} maxLength={50} />
        <TextInput value={instructions} onChangeText={setInstructions} placeholder="Note for the family (optional)" placeholderTextColor={colors.inkMuted} style={[styles.input, { minHeight: 64 }]} multiline maxLength={200} />
      </View>

      <Section n={2} title="Heroes" sub="Up to 3. The first one plays along and cheers." color={f.color} />
      <View style={styles.card}>
        <HeroPicker value={heroes} onChange={setHeroes} favourites={previewChild?.favouriteCharacters ?? []} />
        {f.mode === 'app' && (
          <>
            <Text style={styles.label}>{t('Hero world around the game')}</Text>
            <View style={styles.segRow}>
              {SCENES.map((sc) => (
                <Pressable key={sc.id} onPress={() => setScene(sc.id)} style={[styles.seg, scene === sc.id && { backgroundColor: f.color }]} accessibilityRole="button" accessibilityState={{ selected: scene === sc.id }}>
                  <Text style={[styles.segText, scene === sc.id && { color: colors.white }]}>{sc.label}</Text>
                  <Text style={[styles.segHint, scene === sc.id && { color: '#FFFFFFCC' }]}>{sc.hint}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>

      <Section n={3} title="What each level contains" sub="Change any level; the others keep their built-in settings." color={f.color} />
      <View style={styles.card}>
        <View style={styles.levelTabs}>
          {([1, 2, 3] as const).map((lv) => (
            <Pressable key={lv} onPress={() => setEditing(lv)} style={[styles.levelTab, editing === lv && { backgroundColor: f.color }]} accessibilityRole="tab" accessibilityState={{ selected: editing === lv }}>
              <Text style={[styles.levelTabText, editing === lv && { color: colors.white }]}>
                {LEVEL_NAMES[lv - 1]}
                {changed(lv) ? ' •' : ''}
              </Text>
            </Pressable>
          ))}
        </View>
        {spec.fields.map((field) => (
          <FieldEditor key={`${editing}-${field.key}`} field={field} value={cfg[field.key]} grid={cfg.grid ?? 3} color={f.color} tint={f.tint} onChange={(v) => setField(field.key, v)} />
        ))}
        <View style={styles.summaryRow}>
          <Text style={styles.summary} numberOfLines={2}>
            {describeConfig(f.id, cfg)}
          </Text>
          {changed(editing) && (
            <Pressable onPress={() => setCustom((c) => { const n = { ...c }; delete n[editing]; return n; })} hitSlop={8} accessibilityRole="button">
              <Text style={[styles.reset, { color: f.color }]}>{t('Reset')}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              if (!previewChild) return;
              if (f.mode === 'app') navigation.navigate('LibraryPlay', { childId: previewChild.id, family: f.id, level: editing, preview: true, custom, heroes, scene });
              else navigation.navigate('LibrarySteps', { childId: previewChild.id, family: f.id, level: editing, preview: true, custom });
            }}
            style={[styles.ghost, { borderColor: f.color + '55' }]}
            accessibilityRole="button"
          >
            <Feather name={f.mode === 'app' ? 'play' : 'layers'} size={16} color={f.color} />
            <Text style={[styles.ghostText, { color: f.color }]}>Try {LEVEL_NAMES[editing - 1]}</Text>
          </Pressable>
          <Pressable onPress={() => printSheet(f.id, editing, previewChild?.name ?? '', custom, heroes[0], name)} style={[styles.ghost, { borderColor: f.color + '55' }]} accessibilityRole="button">
            <Feather name="printer" size={16} color={f.color} />
            <Text style={[styles.ghostText, { color: f.color }]}>{t('Print')}</Text>
          </Pressable>
        </View>
      </View>

      <Section n={4} title="Who gets it" color={f.color} />
      <View style={styles.card}>
        <View style={styles.kids}>
          {children.map((c) => {
            const on = targets.includes(c.id);
            return (
              <Pressable key={c.id} onPress={() => setTargets(on ? targets.filter((t) => t !== c.id) : [...targets, c.id])} style={[styles.kid, on && { backgroundColor: f.color }]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <Avatar name={c.name} color={c.color} photo={c.photo} emoji={c.avatarEmoji} size={28} />
                <Text style={[styles.kidName, on && { color: colors.white }]}>{c.name.split(' ')[0]}</Text>
                {on && <Feather name="check" size={14} color={colors.white} />}
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.label}>{t('Start at')}</Text>
        <View style={styles.segRow}>
          {[1, 2, 3].map((lv) => (
            <Pressable key={lv} onPress={() => setLevel(lv)} style={[styles.seg, level === lv && { backgroundColor: f.color }]}>
              <Text style={[styles.segText, level === lv && { color: colors.white }]}>{LEVEL_NAMES[lv - 1]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{t('Which days')}</Text>
        <ScheduleEditor value={{ days, times }} onChange={(v) => { setDays(v.days); setTimes(v.times); }} color={f.color} tint={f.tint} />
        <ToggleRow label="Adjust level automatically" value={autoLevel} onChange={setAutoLevel} />
        <ToggleRow label={version ? 'Update my saved version' : 'Save to My versions'} value={keepVersion} onChange={setKeepVersion} />
        {keepVersion && (team?.members.length ?? 0) > 1 && <ToggleRow label="Share with the clinic team" value={shareTeam} onChange={setShareTeam} />}
      </View>

      <Pressable onPress={() => save(true)} disabled={busy || !targets.length} style={[styles.primary, { backgroundColor: f.color }, (!targets.length || busy) && { opacity: 0.5 }]} accessibilityRole="button">
        <Feather name="send" size={18} color={colors.white} />
        <Text style={styles.primaryText}>{existing ? 'Save changes & send' : 'Save & send to family'}</Text>
      </Pressable>
      <Pressable onPress={() => save(false)} disabled={busy || (!targets.length && !keepVersion)} style={styles.secondary} accessibilityRole="button">
        <Text style={[styles.secondaryText, { color: f.color }]}>{t('Save only')}</Text>
      </Pressable>
      {!!status && <Text style={[styles.status, { color: f.color }]}>{status}</Text>}
    </Screen>
  );
}

function Section({ n, title, sub, color }: { n: number; title: string; sub?: string; color: string }) {
  return (
    <View style={styles.section}>
      <View style={[styles.num, { backgroundColor: color }]}>
        <Text style={styles.numText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!sub && <Text style={styles.sectionSub}>{sub}</Text>}
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleText}>{t(label)}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.leaf, false: colors.border }} />
    </View>
  );
}

function FieldEditor({ field, value, grid, color, tint, onChange }: { field: Field; value: any; grid: number; color: string; tint: string; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(Array.isArray(value) && field.kind === 'words' ? value.join(', ') : '');
  if (field.kind === 'choice') {
    return (
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>{field.label}</Text>
        <View style={styles.chips}>
          {field.options.map((o) => {
            const on = o.value === value;
            return (
              <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.chip, { backgroundColor: on ? color : tint }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.chipText, { color: on ? colors.white : color }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  if (field.kind === 'words') {
    return (
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>{field.label}</Text>
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            onChange(t.split(/[,\n]+/).map((w) => (field.upper ? w.trim().toUpperCase() : w.trim())).filter(Boolean).slice(0, 16));
          }}
          placeholder={field.placeholder}
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="characters"
          style={styles.input}
        />
        {!!field.hint && <Text style={styles.sectionSub}>{field.hint}</Text>}
      </View>
    );
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{field.label}</Text>
      <PatternEditor n={grid} value={Array.isArray(value) ? value : []} onChange={onChange} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  art: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.bold, fontSize: 21, color: colors.ink, marginTop: 2 },
  section: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 24, marginBottom: 10 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  numText: { fontFamily: font.bold, fontSize: 13, color: colors.white },
  sectionTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink },
  sectionSub: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border },
  input: { borderRadius: 14, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 11, fontFamily: font.regular, fontSize: 15, color: colors.ink, textAlignVertical: 'top' },
  label: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  segRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seg: { flexGrow: 1, minWidth: 70, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.sage, alignItems: 'center' },
  segText: { fontFamily: font.semibold, fontSize: 14, color: colors.forest },
  segHint: { fontFamily: font.regular, fontSize: 11.5, color: colors.inkSoft, marginTop: 1 },
  levelTabs: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 14, padding: 4, gap: 4 },
  levelTab: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  levelTabText: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, height: 36, borderRadius: 18, justifyContent: 'center' },
  chipText: { fontFamily: font.semibold, fontSize: 13.5 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bg, borderRadius: 12, padding: 10 },
  summary: { flex: 1, fontFamily: font.medium, fontSize: 12.5, color: colors.inkSoft },
  reset: { fontFamily: font.bold, fontSize: 13 },
  row: { flexDirection: 'row', gap: 8 },
  ghost: { flex: 1, flexDirection: 'row', gap: 6, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ghostText: { fontFamily: font.bold, fontSize: 14 },
  kids: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kid: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 4, paddingRight: 12, height: 38, borderRadius: 19, backgroundColor: colors.sage },
  kidName: { fontFamily: font.semibold, fontSize: 14, color: colors.forest },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleText: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.ink },
  primary: { flexDirection: 'row', gap: 10, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  primaryText: { fontFamily: font.bold, fontSize: 16.5, color: colors.white },
  secondary: { height: 46, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: font.bold, fontSize: 15 },
  status: { fontFamily: font.semibold, fontSize: 14, textAlign: 'center' },
  footnote: { fontFamily: font.regular, fontSize: 12, color: colors.inkMuted, textAlign: 'center', marginTop: 6 },
});
