import { useVisibleChildren } from '../../store/useTeam';
import { t } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { HeroPicker } from '../../components/hero/HeroPicker';
import { Avatar, Button, Screen, T, TopBar } from '../../components/ui';
import { BASE_PARAMS } from '../../engine/tasks';
import {
  EXAMPLES,
  LEVELS,
  TEMPLATE,
  TEMPLATES,
  buildWordGrid,
  cleanWord,
  contentProblem,
  emojiPic,
  levelName,
  puzzleSize,
} from '../../engine/studio';
import type { RootProps } from '../../navigation/types';
import { postToConversation } from '../../services/messaging';
import { pickStudioImage, type ImagePurpose } from '../../services/studioImages';
import { uid } from '../../store/seed';
import { ScheduleEditor } from '../../components/ScheduleEditor';
import { scheduleLabel } from '../../engine/schedule';
import { useChild, useStore } from '../../store/useStore';
import { colors, font } from '../../theme';
import type { Character, CustomActivity, SceneStyle, StudioContent, StudioPicture, StudioTemplate } from '../../types';
import { firstName } from '../helpers';

const QUICK_EMOJIS = ['🍎', '🍌', '🍇', '🚗', '🚌', '✈️', '🐶', '🐱', '🦖', '⭐', '🌙', '⚽', '🎈', '🌸', '🐟', '🍪'];
const MINUTES: Record<StudioTemplate, number> = { puzzle: 3, wordsearch: 5, worksheet: 5, findit: 2, sequence: 2, listen: 1 };

const emptyContent = (t: StudioTemplate): StudioContent => {
  switch (t) {
    case 'puzzle':
      return { template: 'puzzle', image: '' };
    case 'wordsearch':
      return { template: 'wordsearch', words: [] };
    case 'worksheet':
      return { template: 'worksheet', image: '', task: '' };
    case 'findit':
      return { template: 'findit', targetName: '', target: emojiPic('🍎'), others: [] };
    case 'sequence':
      return { template: 'sequence', items: [] };
    case 'listen':
      return { template: 'listen', target: '', others: [] };
  }
};

/** Therapist makes a new game from a simple template, with their own words and pictures. */
export default function GameStudioScreen({ route, navigation }: RootProps<'GameStudio'>) {
  const { childId, activityId, template } = route.params;
  const child = useChild(childId);
  const children = useVisibleChildren();
  const saveCustomActivity = useStore((s) => s.saveCustomActivity);
  const removeCustomActivity = useStore((s) => s.removeCustomActivity);
  const existing = child?.customActivities?.find((a) => a.id === activityId && a.studio);

  const [content, setContent] = useState<StudioContent | null>(existing?.studio?.content ?? (template ? emptyContent(template) : null));
  const [name, setName] = useState(existing?.name ?? '');
  const [instructions, setInstructions] = useState(existing?.instructions ?? '');
  const [level, setLevel] = useState(existing?.studio?.level ?? 1);
  const [autoLevel, setAutoLevel] = useState(existing?.studio?.autoLevel ?? true);
  const [perWeek, setPerWeek] = useState(existing?.timesPerWeek ?? 3);
  const [days, setDays] = useState<number[]>(existing?.days ?? []);
  const [heroes, setHeroes] = useState<Character[]>(existing?.heroes ?? (existing?.hero ? [existing.hero] : child?.favouriteCharacters?.slice(0, 1) ?? []));
  const [scene, setScene] = useState<SceneStyle>(existing?.scene ?? (child?.sensory?.busyScreens ? 'off' : 'subtle'));
  const [targets, setTargets] = useState<string[]>([childId]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!child) return null;
  const first = firstName(child.name);
  const info = content ? TEMPLATE[content.template] : null;
  const problem = contentProblem(content);
  const autoName = content ? defaultName(content) : '';
  const finalName = (name.trim() || autoName).slice(0, 40);

  const update = (patch: Partial<StudioContent>) => setContent((c) => (c ? ({ ...c, ...patch } as StudioContent) : c));

  const build = (forChild: string, id: string): CustomActivity => ({
    id,
    taskId: `studio-${content!.template}`,
    name: finalName,
    instructions: (instructions.trim() || info!.instructions).slice(0, 300),
    timesPerWeek: days.length || perWeek,
    ...(days.length ? { days } : {}),
    adaptive: autoLevel,
    params: BASE_PARAMS,
    createdAt: existing && forChild === childId ? existing.createdAt : new Date().toISOString(),
    studio: { content: content!, level, autoLevel, streak: 0 },
    ...(heroes.length ? { hero: heroes[0], heroes } : {}),
    scene,
  });

  /** Saves a copy for every selected child (each keeps its own level and progress). */
  const save = async (mode: 'save' | 'send' | 'try') => {
    if (problem || !content) return setError(problem ?? '');
    setError('');
    setBusy(true);
    let mine: CustomActivity | null = null;
    try {
      for (const cid of targets) {
        const activity = build(cid, existing && cid === childId ? existing.id : uid());
        saveCustomActivity(cid, activity);
        if (cid === childId) mine = activity;
        if (mode === 'send') {
          await postToConversation(cid, 'therapist', {
            text: activity.instructions,
            card: {
              type: 'activity',
              taskId: activity.taskId,
              level,
              minutes: MINUTES[content.template],
              frequency: scheduleLabel(days, perWeek),
              customId: activity.id,
              title: activity.name,
              template: content.template,
            },
          });
        }
      }
    } catch {
      Alert.alert('Saved, but not sent', 'The game is saved. Check your connection and send it from Messages.');
    } finally {
      setBusy(false);
    }
    if (mode === 'try' && mine) navigation.replace('StudioPlay', { childId, activityId: mine.id, preview: true });
    else navigation.goBack();
  };

  const remove = () => {
    const go = () => {
      if (existing) removeCustomActivity(childId, existing.id);
      navigation.goBack();
    };
    if (Platform.OS === 'web') return go();
    Alert.alert('Delete this game?', 'The family will no longer see it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <Screen>
      <TopBar title={existing ? 'Edit game' : 'Game Studio'} onBack={() => navigation.goBack()} />
      {!existing && (
        <>
          <T.Display style={{ fontSize: 30 }}>Make a game for {first}</T.Display>
          <T.Body style={{ marginTop: 6 }}>{t('Pick a type, add your own words or pictures, and send it to the family. It takes about a minute.')}</T.Body>
        </>
      )}

      <Step n={1} title="Choose a game type" />
      <View style={styles.templates}>
        {TEMPLATES.map((t) => {
          const on = content?.template === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => !existing && setContent(on ? content : emptyContent(t.id))}
              disabled={!!existing && !on}
              style={[styles.template, on && { borderColor: t.color, backgroundColor: t.tint }, !!existing && !on && { opacity: 0.35 }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={{ fontSize: 30 }}>{t.icon}</Text>
              <Text style={styles.templateName}>{t.name}</Text>
              <Text style={styles.templatePitch}>{t.pitch}</Text>
            </Pressable>
          );
        })}
      </View>

      {content && info && (
        <>
          <Step n={2} title="Add your content" />
          <Text style={[styles.hint, { marginTop: -4, marginBottom: 10 }]}>💡 {info.tip}</Text>
          <ContentEditor content={content} level={level} update={update} setContent={setContent} />

          <Step n={3} title="Details" />
          <Text style={styles.label}>{t('Name')}</Text>
          <TextInput value={name} onChangeText={setName} placeholder={autoName} placeholderTextColor={colors.inkMuted} style={styles.input} maxLength={40} />
          <Text style={styles.label}>{t('Instructions for the family')}</Text>
          <TextInput
            value={instructions}
            onChangeText={setInstructions}
            placeholder={info.instructions}
            placeholderTextColor={colors.inkMuted}
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            multiline
            maxLength={300}
          />
          {info.levelled && (
            <>
              <Text style={styles.label}>{t('Difficulty')}</Text>
              <View style={styles.row}>
                {LEVELS.map((l) => (
                  <Pressable key={l.value} onPress={() => setLevel(l.value)} style={[styles.pill, levelName(level) === l.label && styles.pillOn]} accessibilityRole="button">
                    <Text style={[styles.pillText, levelName(level) === l.label && { color: colors.white }]}>{l.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchTitle}>{t('Adjust automatically')}</Text>
                  <Text style={styles.hint}>{t('Harder after two 3-star plays, easier after a hard one.')}</Text>
                </View>
                <Switch value={autoLevel} onValueChange={setAutoLevel} trackColor={{ true: colors.leaf, false: colors.border }} thumbColor={colors.white} />
              </View>
            </>
          )}
          <Text style={styles.label}>{t('Heroes (optional)')}</Text>
          <HeroPicker value={heroes} onChange={setHeroes} max={3} favourites={child.favouriteCharacters ?? []} />
          <Text style={styles.label}>{t('Hero world around the game')}</Text>
          <View style={styles.row}>
            {(['off', 'subtle', 'bold'] as const).map((v) => (
              <Pressable key={v} onPress={() => setScene(v)} style={[styles.pill, scene === v && styles.pillOn]} accessibilityRole="button">
                <Text style={[styles.pillText, scene === v && { color: colors.white }]}>{v === 'off' ? 'Off' : v === 'subtle' ? 'Subtle' : 'Bold'}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>{t('Which days')}</Text>
          <ScheduleEditor value={{ days, times: perWeek }} onChange={(v) => { setDays(v.days); setPerWeek(v.times); }} />

          <Step n={4} title={existing ? 'Also give it to' : 'Who gets it?'} />
          <View style={styles.row}>
            {children.map((c) => {
              const on = targets.includes(c.id);
              const locked = c.id === childId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => !locked && setTargets((t) => (on ? t.filter((x) => x !== c.id) : [...t, c.id]))}
                  style={[styles.childChip, on && styles.childOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Avatar name={c.name} color={c.color} photo={c.photo} emoji={c.avatarEmoji} size={30} />
                  <Text style={styles.childName}>{firstName(c.name)}</Text>
                  {on && <Feather name="check" size={14} color={colors.forest} />}
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>{t('Each child gets their own copy, with their own level and progress.')}</Text>

          {!!(error || problem) && (
            <View style={styles.problem}>
              <Feather name="info" size={15} color={colors.danger} />
              <Text style={styles.problemText}>{error || problem}</Text>
            </View>
          )}
          <Button
            label={busy ? 'Saving…' : `Save & send to ${targets.length === 1 ? 'family' : `${targets.length} families`}`}
            icon="send"
            disabled={!!problem || busy}
            onPress={() => void save('send')}
            style={{ marginTop: 22 }}
          />
          <View style={[styles.row, { marginTop: 10 }]}>
            <Button label="Save & try it" icon="play" variant="soft" disabled={!!problem || busy} onPress={() => void save('try')} style={{ flex: 1 }} />
            <Button label="Save only" icon="check" variant="soft" disabled={!!problem || busy} onPress={() => void save('save')} style={{ flex: 1 }} />
          </View>
          {existing && <Button label="Delete game" icon="trash-2" variant="danger" onPress={remove} style={{ marginTop: 10 }} />}
          <T.Small style={{ textAlign: 'center', marginTop: 14 }}>{t('Families see it on Home under “From your therapist”. Pictures stay on this device in the demo.')}</T.Small>
        </>
      )}
    </Screen>
  );
}

function defaultName(c: StudioContent): string {
  switch (c.template) {
    case 'puzzle':
      return 'Picture puzzle';
    case 'wordsearch':
      return 'Word search';
    case 'worksheet':
      return 'Worksheet';
    case 'findit':
      return c.targetName ? `Find the ${c.targetName}` : 'Find it';
    case 'sequence':
      return 'Remember the order';
    case 'listen':
      return c.target ? `Listen for “${c.target}”` : 'Listen for it';
  }
}

/** The template-specific part of the form. */
function ContentEditor({
  content,
  level,
  update,
  setContent,
}: {
  content: StudioContent;
  level: number;
  update: (p: Partial<StudioContent>) => void;
  setContent: (c: StudioContent) => void;
}) {
  switch (content.template) {
    case 'puzzle':
      return (
        <View>
          <ImageSlot uri={content.image} purpose="puzzle" onChange={(image) => update({ image })} hint="Choose or take a photo. It is cropped to a square." />
          {!!content.image && (
            <Text style={styles.hint}>
              Cut into {puzzleSize(level)} × {puzzleSize(level)} pieces at this difficulty.
            </Text>
          )}
        </View>
      );
    case 'worksheet':
      return (
        <View>
          <ImageSlot uri={content.image} purpose="worksheet" onChange={(image) => update({ image })} hint="Take a photo of any printed worksheet, maze or colouring page." />
          <Text style={styles.label}>{t('What should the child do?')}</Text>
          <TextInput
            value={content.task}
            onChangeText={(task) => update({ task })}
            placeholder="e.g. Circle the words you spot."
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
            maxLength={120}
          />
        </View>
      );
    case 'wordsearch':
      return <WordSearchEditor content={content} level={level} setContent={setContent} />;
    case 'findit':
      return <FindItEditor content={content} setContent={setContent} />;
    case 'sequence':
      return <SequenceEditor content={content} setContent={setContent} />;
    case 'listen':
      return <ListenEditor content={content} setContent={setContent} />;
  }
}

function Examples<T>({ items, label, onPick }: { items: readonly T[]; label: (t: T) => string; onPick: (t: T) => void }) {
  return (
    <View style={[styles.row, { marginBottom: 12 }]}>
      <Text style={styles.hint}>{t('Start from an example:')}</Text>
      {items.map((it) => (
        <Pressable key={label(it)} onPress={() => onPick(it)} style={styles.example} accessibilityRole="button">
          <Text style={styles.exampleText}>{label(it)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function WordSearchEditor({
  content,
  level,
  setContent,
}: {
  content: Extract<StudioContent, { template: 'wordsearch' }>;
  level: number;
  setContent: (c: StudioContent) => void;
}) {
  const [text, setText] = useState(content.words.join(', '));
  const apply = (t: string) => {
    setText(t);
    setContent({ template: 'wordsearch', words: [...new Set(t.split(/[\s,;]+/).map(cleanWord).filter((w) => w.length >= 2))].slice(0, 20) });
  };
  const grid = useMemo(() => (content.words.length >= 3 ? buildWordGrid(content.words, level, 7) : null), [content.words, level]);
  return (
    <View>
      <Examples items={EXAMPLES.wordsearch} label={(e) => e.title} onPick={(e) => apply(e.words.join(', '))} />
      <Text style={styles.label}>{t('Words (separate with commas or spaces)')}</Text>
      <TextInput
        value={text}
        onChangeText={apply}
        placeholder="MOON, STAR, MARS, COMET…"
        placeholderTextColor={colors.inkMuted}
        style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
        multiline
        autoCapitalize="characters"
      />
      <Text style={styles.hint}>{content.words.length} words · letters only · up to 20</Text>
      {grid && (
        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>
            Preview · {levelName(level)}: {grid.size}×{grid.size}, {grid.placed.length} words
          </Text>
          <View style={[styles.miniGrid, { width: grid.size * 18 }]}>
            {grid.letters.map((ch, i) => (
              <Text key={i} style={[styles.miniCell, grid.placed.some((p) => p.cells.includes(i)) && { color: colors.forest, fontFamily: font.heavy }]}>
                {ch}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function PictureButton({ pic, size = 44, onPress, on }: { pic: StudioPicture; size?: number; onPress?: () => void; on?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.picBtn, { width: size + 12, height: size + 12 }, on && styles.picOn]} accessibilityRole="button">
      {pic.kind === 'image' ? (
        <Image source={{ uri: pic.uri }} style={{ width: size, height: size, borderRadius: 8 }} />
      ) : (
        <Text style={{ fontSize: size * 0.7 }}>{pic.value}</Text>
      )}
    </Pressable>
  );
}

function FindItEditor({ content, setContent }: { content: Extract<StudioContent, { template: 'findit' }>; setContent: (c: StudioContent) => void }) {
  const [emoji, setEmoji] = useState('');
  const set = (p: Partial<typeof content>) => setContent({ ...content, ...p });
  const key = (x: StudioPicture) => (x.kind === 'emoji' ? x.value : x.uri);
  const toggleOther = (pic: StudioPicture) =>
    set({
      others: content.others.some((o) => key(o) === key(pic))
        ? content.others.filter((o) => key(o) !== key(pic))
        : [...content.others, pic].slice(0, 8),
    });
  return (
    <View>
      <Examples
        items={EXAMPLES.findit}
        label={(e) => `${e.target} ${e.targetName}`}
        onPick={(e) => setContent({ template: 'findit', targetName: e.targetName, target: emojiPic(e.target), others: e.others.map(emojiPic) })}
      />
      <Text style={styles.label}>{t('The target')}</Text>
      <View style={styles.row}>
        <PictureButton pic={content.target} size={52} on />
        <TextInput
          value={content.targetName}
          onChangeText={(targetName) => set({ targetName: targetName.slice(0, 20) })}
          placeholder="Name it, e.g. apple"
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, { flex: 1 }]}
        />
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        {QUICK_EMOJIS.slice(0, 8).map((e) => (
          <PictureButton key={e} pic={emojiPic(e)} size={26} on={content.target.kind === 'emoji' && content.target.value === e} onPress={() => set({ target: emojiPic(e) })} />
        ))}
        <ImageMiniButton onPick={(uri) => set({ target: { kind: 'image', uri } })} />
      </View>
      <Text style={styles.label}>Other pictures ({content.others.length}/8)</Text>
      <View style={styles.row}>
        {content.others.map((o, i) => (
          <PictureButton key={i} pic={o} size={30} on onPress={() => toggleOther(o)} />
        ))}
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        {QUICK_EMOJIS.map((e) => (
          <PictureButton key={e} pic={emojiPic(e)} size={22} onPress={() => toggleOther(emojiPic(e))} />
        ))}
        <TextInput value={emoji} onChangeText={setEmoji} placeholder="🐸" placeholderTextColor={colors.inkMuted} style={[styles.input, { width: 60, height: 46, textAlign: 'center' }]} />
        <Pressable
          onPress={() => {
            if (emoji.trim()) toggleOther(emojiPic(emoji.trim().slice(0, 8)));
            setEmoji('');
          }}
          style={styles.addBtn}
          accessibilityLabel="Add emoji"
        >
          <Feather name="plus" size={18} color={colors.white} />
        </Pressable>
        <ImageMiniButton onPick={(uri) => toggleOther({ kind: 'image', uri })} />
      </View>
      <Text style={styles.hint}>{t('Tap a picture to add or remove it. Photos work too (camera button).')}</Text>
    </View>
  );
}

function SequenceEditor({ content, setContent }: { content: Extract<StudioContent, { template: 'sequence' }>; setContent: (c: StudioContent) => void }) {
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('');
  const add = () => {
    if (!label.trim()) return;
    setContent({
      template: 'sequence',
      items: [...content.items, { label: label.trim().slice(0, 24), ...(emoji.trim() ? { emoji: emoji.trim().slice(0, 8) } : {}) }].slice(0, 8),
    });
    setLabel('');
    setEmoji('');
  };
  return (
    <View>
      <Examples items={EXAMPLES.sequence} label={(e) => e.title} onPick={(e) => setContent({ template: 'sequence', items: e.items.map((i) => ({ ...i })) })} />
      <View style={{ gap: 6 }}>
        {content.items.map((it, i) => (
          <View key={i} style={styles.seqRow}>
            <Text style={styles.seqNum}>{i + 1}</Text>
            <Text style={{ fontSize: 22 }}>{it.emoji ?? '⭐'}</Text>
            <Text style={styles.seqLabel}>{it.label}</Text>
            <Pressable onPress={() => setContent({ template: 'sequence', items: content.items.filter((_, j) => j !== i) })} hitSlop={8} accessibilityLabel={`Remove ${it.label}`}>
              <Feather name="x" size={18} color={colors.inkMuted} />
            </Pressable>
          </View>
        ))}
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <TextInput value={emoji} onChangeText={setEmoji} placeholder="🪥" placeholderTextColor={colors.inkMuted} style={[styles.input, { width: 60, textAlign: 'center' }]} />
        <TextInput
          value={label}
          onChangeText={setLabel}
          onSubmitEditing={add}
          placeholder="Step or item, e.g. Brush teeth"
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable onPress={add} style={styles.addBtn} accessibilityLabel="Add item">
          <Feather name="plus" size={18} color={colors.white} />
        </Pressable>
      </View>
      <Text style={styles.hint}>{content.items.length}/8 items. Routines (morning, bedtime, school bag) work really well.</Text>
    </View>
  );
}

function ListenEditor({ content, setContent }: { content: Extract<StudioContent, { template: 'listen' }>; setContent: (c: StudioContent) => void }) {
  const [others, setOthers] = useState(content.others.join(', '));
  return (
    <View>
      <Examples
        items={EXAMPLES.listen}
        label={(e) => `“${e.target}”`}
        onPick={(e) => {
          setOthers(e.others.join(', '));
          setContent({ template: 'listen', target: e.target, others: [...e.others] });
        }}
      />
      <Text style={styles.label}>{t('Word to listen for')}</Text>
      <TextInput
        value={content.target}
        onChangeText={(target) => setContent({ ...content, target: target.trim().slice(0, 20) })}
        placeholder="e.g. apple"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
      />
      <Text style={styles.label}>{t('Other words (separate with commas)')}</Text>
      <TextInput
        value={others}
        onChangeText={(t) => {
          setOthers(t);
          setContent({ ...content, others: [...new Set(t.split(',').map((w) => w.trim()).filter(Boolean))].slice(0, 12) });
        }}
        placeholder="dog, car, tree, ball"
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
      />
      <Text style={styles.hint}>{t('The phone reads the words aloud. Similar-sounding words make it harder.')}</Text>
    </View>
  );
}

function ImageSlot({ uri, purpose, onChange, hint }: { uri: string; purpose: ImagePurpose; onChange: (uri: string) => void; hint: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async (source: 'library' | 'camera') => {
    setErr('');
    setBusy(true);
    try {
      const out = await pickStudioImage(purpose, source);
      if (out) onChange(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load that picture.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      <View style={[styles.imageBox, purpose === 'puzzle' && { aspectRatio: 1 }]}>
        {busy ? (
          <ActivityIndicator color={colors.forest} />
        ) : uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        ) : (
          <View style={{ alignItems: 'center', gap: 6, padding: 20 }}>
            <Feather name="image" size={34} color={colors.inkMuted} />
            <Text style={[styles.hint, { textAlign: 'center' }]}>{hint}</Text>
          </View>
        )}
      </View>
      <View style={[styles.row, { marginTop: 10 }]}>
        <Button label={uri ? 'Change photo' : 'Choose photo'} icon="image" variant="soft" onPress={() => void pick('library')} style={{ flex: 1 }} />
        <Button label="Camera" icon="camera" variant="soft" onPress={() => void pick('camera')} style={{ flex: 1 }} />
      </View>
      {!!err && <Text style={[styles.hint, { color: colors.danger }]}>{err}</Text>}
    </View>
  );
}

function ImageMiniButton({ onPick }: { onPick: (uri: string) => void }) {
  return (
    <Pressable
      onPress={() =>
        void pickStudioImage('picture', 'library')
          .then((uri) => uri && onPick(uri))
          .catch(() => {})
      }
      style={[styles.addBtn, { backgroundColor: colors.sage }]}
      accessibilityRole="button"
      accessibilityLabel="Add a photo"
    >
      <Feather name="camera" size={18} color={colors.forest} />
    </Pressable>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: font.bold, fontSize: 13, color: colors.white },
  stepTitle: { fontFamily: font.bold, fontSize: 18, color: colors.ink },
  templates: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  template: { width: '47%', flexGrow: 1, padding: 14, borderRadius: 20, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, gap: 4 },
  templateName: { fontFamily: font.bold, fontSize: 15, color: colors.ink, marginTop: 4 },
  templatePitch: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.inkSoft },
  label: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink, marginTop: 16, marginBottom: 8 },
  hint: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkMuted, marginTop: 6 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.ink,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pill: { minWidth: 64, height: 42, paddingHorizontal: 16, borderRadius: 21, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.forest },
  pillText: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  switchTitle: { fontFamily: font.semibold, fontSize: 14.5, color: colors.ink },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  childOn: { borderColor: colors.forest, backgroundColor: colors.mint },
  childName: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  problem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, padding: 12, borderRadius: 12, backgroundColor: '#FBE4DE' },
  problemText: { flex: 1, fontFamily: font.medium, fontSize: 13.5, color: colors.danger },
  example: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.lime },
  exampleText: { fontFamily: font.semibold, fontSize: 13, color: colors.forestDeep },
  previewBox: { marginTop: 12, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  previewLabel: { fontFamily: font.semibold, fontSize: 12.5, color: colors.inkSoft, marginBottom: 8 },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  miniCell: { width: 18, height: 18, textAlign: 'center', fontFamily: font.medium, fontSize: 11, lineHeight: 18, color: colors.inkMuted },
  picBtn: { borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  picOn: { borderColor: colors.forest, backgroundColor: colors.mint },
  addBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  seqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  seqNum: { width: 22, fontFamily: font.bold, fontSize: 14, color: colors.inkMuted, textAlign: 'center' },
  seqLabel: { flex: 1, fontFamily: font.medium, fontSize: 15, color: colors.ink },
  imageBox: {
    width: '100%',
    minHeight: 200,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
