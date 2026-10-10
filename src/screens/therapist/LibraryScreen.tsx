import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { IconButton, Screen, T, flipIcon } from '../../components/ui';
import { NEED, NEEDS, needTotal, suggestedNeeds, type NeedId } from '../../engine/needs';
import { TEMPLATE, TEMPLATES } from '../../engine/studio';
import { DOMAIN_LABEL } from '../../engine/tasks';
import { TRAIN_BY_ID } from '../../engine/trainTasks';
import { FUN_GAME } from '../../games/fun';
import { t } from '../../i18n';
import { LIBRARY_ART } from '../../library/art';
import { FAMILY, LEVEL_NAMES, MODE_INFO, isLibraryFamily } from '../../library/catalog';
import type { RootProps } from '../../navigation/types';
import { useStore } from '../../store/useStore';
import { useTeamMember, useVisibleChildren, useVisibleVersions } from '../../store/useTeam';
import { colors, font } from '../../theme';

/** A problem area, or one of the two extra boxes. */
type Pick = NeedId | 'create' | 'mine';

/** The two boxes after the problem areas: make a game, or reuse a saved version. */
const EXTRA = {
  create: { emoji: '✨', title: 'Create your own', signs: 'Make an activity from your own photos and words, in about a minute.', color: '#9A5B00', tint: '#FFF1D2' },
  mine: { emoji: '⭐', title: 'My versions', signs: 'Activities you customised and saved to reuse with other children.', color: '#2F5D46', tint: '#E6ECE2' },
} as const;

type Item = {
  key: string;
  title: string;
  sub: string;
  art: React.ReactNode;
  tint: string;
  badge: string;
  badgeColor: string;
  badgeTint: string;
  extra?: string;
  onPress: () => void;
  onRemove?: () => void;
};

/**
 * Activities for a child, by problem area: the therapist picks what they see in the child and
 * gets one list of the activities that cover it.
 */
export default function LibraryScreen({ route, navigation }: RootProps<'Library'>) {
  const childId = route.params?.childId;
  const children = useVisibleChildren();
  const versions = useVisibleVersions();
  const { team, me } = useTeamMember();
  const removeVersion = useStore((s) => s.removeLibraryVersion);
  const child = children.find((c) => c.id === childId) ?? children[0];
  const suggested = suggestedNeeds(child);
  const [pick, setPick] = useState<Pick>(suggested[0]?.id ?? 'attention');
  const need = pick === 'create' || pick === 'mine' ? null : NEED[pick];
  const first = child?.name.split(' ')[0] ?? '';

  const assigned = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of children) for (const a of c.customActivities ?? []) if (a.library) m.set(a.library.family, (m.get(a.library.family) ?? 0) + 1);
    return m;
  }, [children]);

  // One list for the chosen area: games, worksheets, own games and Fun Zone, in the clinic's order.
  const needItems = (need: NonNullable<typeof NEED[NeedId]>): Item[] => [
    ...need.focus.map((id) => {
      const g = TRAIN_BY_ID[id];
      return {
        key: `f-${id}`,
        title: t(g.title),
        sub: t(g.subtitle),
        art: <Text style={{ fontSize: 28 }}>{g.icon}</Text>,
        tint: g.tint,
        badge: `📱 ${t('Activity · adapts automatically')}`,
        badgeColor: colors.forest,
        badgeTint: colors.mint,
        onPress: () => child && navigation.navigate('ActivityBuilder', { childId: child.id, taskId: g.id }),
      };
    }),
    ...need.worksheets.filter(isLibraryFamily).map((id) => {
      const f = FAMILY[id];
      return {
        key: `w-${id}`,
        title: t(f.name),
        sub: `${t(f.skill)} · ${t('{{n}} min', { n: f.minutes })}`,
        art: <Image source={LIBRARY_ART[f.id]} style={styles.artImg} />,
        tint: f.tint,
        badge: `${MODE_INFO[f.mode].emoji} ${t(MODE_INFO[f.mode].label)}`,
        badgeColor: MODE_INFO[f.mode].color,
        badgeTint: MODE_INFO[f.mode].tint,
        extra: assigned.get(f.id) ? t('✓ {{n}} assigned', { n: assigned.get(f.id) as number }) : undefined,
        onPress: () => navigation.navigate('LibraryActivity', { family: f.id, childId: child?.id }),
      };
    }),
    ...need.create.map((id) => {
      const x = TEMPLATE[id];
      return {
        key: `c-${id}`,
        title: t(x.name),
        sub: t(x.pitch),
        art: <Text style={{ fontSize: 28 }}>{x.icon}</Text>,
        tint: x.tint,
        badge: `✨ ${t('Make with your own pictures')}`,
        badgeColor: '#9A5B00',
        badgeTint: '#FFF1D2',
        onPress: () => child && navigation.navigate('GameStudio', { childId: child.id, template: x.id }),
      };
    }),
    ...need.fun.map((id) => {
      const g = FUN_GAME[id];
      return {
        key: `z-${id}`,
        title: t(g.title),
        sub: t(g.blurb),
        art: <Image source={g.art} style={styles.artImg} />,
        tint: g.tint[0],
        badge: `🎈 ${t('Fun Zone · always available')}`,
        badgeColor: '#7A5AE0',
        badgeTint: '#EEE8FF',
        onPress: () => child && navigation.navigate('FunGame', { childId: child.id, game: g.id }),
      };
    }),
  ];

  const createItems: Item[] = TEMPLATES.map((x) => ({
    key: `c-${x.id}`,
    title: t(x.name),
    sub: t(x.pitch),
    art: <Text style={{ fontSize: 28 }}>{x.icon}</Text>,
    tint: x.tint,
    badge: `✨ ${t('Make with your own pictures')}`,
    badgeColor: '#9A5B00',
    badgeTint: '#FFF1D2',
    onPress: () => child && navigation.navigate('GameStudio', { childId: child.id, template: x.id }),
  }));

  const versionItems: (Item & { onRemove: () => void })[] = versions.flatMap((v) => {
    const f = isLibraryFamily(v.family) ? FAMILY[v.family] : undefined;
    if (!f) return [];
    const owner = v.ownerId && v.ownerId !== me?.id ? team?.members.find((m) => m.id === v.ownerId)?.name : undefined;
    return [
      {
        key: `v-${v.id}`,
        title: v.name,
        sub: `${t(f.name)} · ${t('starts {{level}}', { level: t(LEVEL_NAMES[v.level - 1]) })}${v.heroes[0] ? ` · ${t('with {{hero}}', { hero: v.heroes[0].name })}` : ''}`,
        art: <Image source={LIBRARY_ART[f.id]} style={styles.artImg} />,
        tint: f.tint,
        badge: owner ? t('shared by {{name}}', { name: owner }) : v.shared ? t('shared with the team') : `⭐ ${t('Saved version')}`,
        badgeColor: colors.forest,
        badgeTint: colors.sage,
        onPress: () => navigation.navigate('LibraryCustomise', { family: f.id, versionId: v.id, childId: child?.id }),
        onRemove: () => removeVersion(v.id),
      },
    ];
  });

  const items: Item[] = pick === 'create' ? createItems : pick === 'mine' ? versionItems : needItems(need!);
  const head = need ?? EXTRA[pick as 'create' | 'mine'];

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="arrow-left" label="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <T.Eyebrow style={{ marginBottom: 0 }}>{t('Choose by problem area')}</T.Eyebrow>
          <Text style={styles.title}>{child ? t('Activities for {{name}}', { name: first }) : t('Activities')}</Text>
        </View>
      </View>

      {!!child && suggested.length > 0 && (
        <View style={styles.suggest}>
          <Feather name="star" size={14} color={colors.forest} />
          <Text style={styles.suggestText}>{t('Suggested for {{name}} · focus: {{area}}', { name: first, area: t(DOMAIN_LABEL[child.focus]) })}</Text>
        </View>
      )}

      {/* Problem areas */}
      <View style={styles.grid}>
        {NEEDS.map((n) => {
          const on = n.id === pick;
          const isSuggested = suggested.some((x) => x.id === n.id);
          return (
            <Pressable
              key={n.id}
              onPress={() => setPick(n.id)}
              style={({ pressed }) => [styles.card, { backgroundColor: on ? n.color : n.tint, borderColor: on ? n.color : 'transparent' }, pressed && { opacity: 0.85 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={{ fontSize: 24 }}>{n.emoji}</Text>
                {isSuggested ? <Text style={[styles.star, on && { color: '#FFFFFF' }]}>★</Text> : <Text style={[styles.count, on && { color: '#FFFFFF' }]}>{needTotal(n)}</Text>}
              </View>
              <Text style={[styles.cardTitle, { color: on ? '#FFFFFF' : n.color }]} numberOfLines={4}>
                {t(n.title)}
              </Text>
            </Pressable>
          );
        })}
        {(['create', 'mine'] as const).map((id) => {
          const x = EXTRA[id];
          const on = pick === id;
          return (
            <Pressable
              key={id}
              onPress={() => setPick(id)}
              style={({ pressed }) => [styles.card, { backgroundColor: on ? x.color : x.tint, borderColor: on ? x.color : x.color + '55', borderStyle: 'dashed' }, on && { borderStyle: 'solid' }, pressed && { opacity: 0.85 }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={{ fontSize: 24 }}>{x.emoji}</Text>
                <Text style={[styles.count, on && { color: '#FFFFFF' }]}>{id === 'create' ? TEMPLATES.length : versions.length}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: on ? '#FFFFFF' : x.color }]} numberOfLines={4}>
                {t(x.title)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* The chosen box's activities, one list */}
      <View style={[styles.head, { backgroundColor: head.tint }]}>
        <Text style={{ fontSize: 34 }}>{head.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headTitle, { color: head.color }]}>{t(head.title)}</Text>
          <Text style={styles.signs}>{need ? t('You may see: {{signs}}', { signs: t(need.signs) }) : t(head.signs)}</Text>
        </View>
        <View style={[styles.headCount, { backgroundColor: head.color }]}>
          <Text style={styles.headCountText}>{items.length}</Text>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {items.map(({ key, ...it }) => (
          <Row key={key} {...it} />
        ))}
        {pick === 'mine' && items.length === 0 && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 34 }}>⭐</Text>
            <Text style={styles.emptyTitle}>{t('No saved versions yet')}</Text>
            <Text style={styles.emptyBody}>{t('Customise any worksheet activity and turn on “Save to My versions” to reuse it with other children.')}</Text>
          </View>
        )}
      </View>

      {need && <Text style={styles.note}>{t('Practice suggestions to support your clinical judgement — not a diagnosis.')}</Text>}
    </Screen>
  );
}

function Row({ title, sub, art, tint, badge, badgeColor, badgeTint, extra, onPress, onRemove }: Omit<Item, 'key'>) {
  return (
    <View style={styles.item}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.itemMain, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`}>
        <View style={[styles.icon, { backgroundColor: tint }]}>{art}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name}>{title}</Text>
          <Text style={styles.sub} numberOfLines={2}>
            {sub}
          </Text>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: badgeTint }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
            </View>
            {!!extra && <Text style={styles.assigned}>{extra}</Text>}
          </View>
        </View>
        {!onRemove && <Feather name={flipIcon('chevron-right')} size={20} color={colors.inkMuted} />}
      </Pressable>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={8} style={styles.remove} accessibilityRole="button" accessibilityLabel={t('Remove')}>
          <Feather name="trash-2" size={18} color={colors.inkMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.ink, marginTop: 2 },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: colors.mint },
  suggestText: { flex: 1, fontFamily: font.semibold, fontSize: 13, color: colors.forest },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  card: { width: '31.6%', flexGrow: 1, minHeight: 100, padding: 10, borderRadius: 16, borderWidth: 2, gap: 6 },
  cardTitle: { fontFamily: font.bold, fontSize: 12, lineHeight: 15 },
  count: { fontFamily: font.bold, fontSize: 11.5, color: '#1E3A2F', opacity: 0.55 },
  star: { fontFamily: font.bold, fontSize: 15, color: '#B58A00' },

  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 14, padding: 14, borderRadius: 18 },
  headTitle: { fontFamily: font.heavy, fontSize: 18 },
  signs: { fontFamily: font.regular, fontSize: 13, color: '#1E3A2F', marginTop: 3 },
  headCount: { minWidth: 30, height: 30, paddingHorizontal: 8, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  headCountText: { fontFamily: font.bold, fontSize: 14, color: '#FFFFFF' },

  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  itemMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  icon: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  artImg: { width: 44, height: 44 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: font.semibold, fontSize: 11.5 },
  assigned: { fontFamily: font.semibold, fontSize: 11.5, color: colors.forest },
  remove: { paddingHorizontal: 14, paddingVertical: 20 },

  empty: { alignItems: 'center', gap: 6, paddingVertical: 28, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.card },
  emptyTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  emptyBody: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, textAlign: 'center', lineHeight: 18 },
  note: { fontFamily: font.regular, fontSize: 12, color: colors.inkSoft, marginTop: 18, lineHeight: 17 },
});
