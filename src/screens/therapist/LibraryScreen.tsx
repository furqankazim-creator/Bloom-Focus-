import { useTeamMember, useVisibleChildren, useVisibleVersions } from '../../store/useTeam';
import { t } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { IconButton, Screen, T, flipIcon } from '../../components/ui';
import { TEMPLATES } from '../../engine/studio';
import { TRAIN_INFO } from '../../engine/trainTasks';
import { LIBRARY_ART } from '../../library/art';
import { CATEGORIES, FAMILY, LEVEL_NAMES, LIBRARY, MODE_INFO, isLibraryFamily, type LibraryMode } from '../../library/catalog';
import type { RootProps } from '../../navigation/types';
import { useStore } from '../../store/useStore';
import { colors, font } from '../../theme';

type Tab = 'worksheets' | 'focus' | 'create' | 'mine';
type Filter = 'all' | LibraryMode;

/**
 * Skill Builders: the one place a therapist finds, customises and creates activities —
 * the clinic's worksheet activities, the adaptive focus games, their own games and saved versions.
 */
export default function LibraryScreen({ route, navigation }: RootProps<'Library'>) {
  const childId = route.params?.childId;
  const children = useVisibleChildren();
  const versions = useVisibleVersions();
  const { team, me } = useTeamMember();
  const removeVersion = useStore((s) => s.removeLibraryVersion);
  const child = children.find((c) => c.id === childId) ?? children[0];
  const [tab, setTab] = useState<Tab>('worksheets');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const assigned = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of children) for (const a of c.customActivities ?? []) if (a.library) m.set(a.library.family, (m.get(a.library.family) ?? 0) + 1);
    return m;
  }, [children]);

  const q = query.trim().toLowerCase();
  const match = (...xs: string[]) => !q || xs.join(' ').toLowerCase().includes(q);
  const worksheets = LIBRARY.filter((f) => (filter === 'all' || f.mode === filter) && match(f.name, f.aka ?? '', f.skill, f.summary));
  const focus = TRAIN_INFO.filter((g) => match(g.title, g.skill, g.subtitle));
  const create = TEMPLATES.filter((t) => match(t.name, t.pitch));
  const mine = versions.filter((v) => match(v.name, isLibraryFamily(v.family) ? FAMILY[v.family].name : ''));

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'worksheets', label: 'Worksheets', count: LIBRARY.length },
    { id: 'focus', label: 'Focus games', count: TRAIN_INFO.length },
    { id: 'create', label: 'Create your own', count: TEMPLATES.length },
    { id: 'mine', label: 'My versions', count: versions.length },
  ];

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton icon="arrow-left" label="Back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <T.Eyebrow style={{ marginBottom: 0 }}>{t('Skill Builders')}</T.Eyebrow>
          <Text style={styles.title}>{child ? `Activities for ${child.name.split(' ')[0]}` : 'Activities'}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <Text style={[styles.tabText, on && { color: colors.white }]}>{t.label}</Text>
              <View style={[styles.count, on && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={[styles.countText, on && { color: colors.white }]}>{t.count}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.search}>
        <Feather name="search" size={18} color={colors.inkMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search" placeholderTextColor={colors.inkMuted} style={styles.searchInput} />
      </View>

      {tab === 'worksheets' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {(['all', 'app', 'flashcard', 'paper'] as Filter[]).map((f) => {
              const on = filter === f;
              return (
                <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filter, on && styles.filterOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[styles.filterText, on && { color: colors.forest }]}>{f === 'all' ? 'All' : `${MODE_INFO[f].emoji} ${MODE_INFO[f].label}`}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {CATEGORIES.map((cat) => {
            const items = worksheets.filter((f) => f.category === cat);
            if (!items.length) return null;
            return (
              <View key={cat} style={{ marginTop: 18 }}>
                <Text style={styles.cat}>{cat.toUpperCase()}</Text>
                <View style={{ gap: 10, marginTop: 10 }}>
                  {items.map((f) => (
                    <Row
                      key={f.id}
                      label={`${f.name}. ${f.summary}`}
                      art={<Image source={LIBRARY_ART[f.id]} style={styles.artImg} />}
                      tint={f.tint}
                      title={f.name}
                      sub={`${f.skill} · ${f.minutes} min`}
                      badge={`${MODE_INFO[f.mode].emoji} ${MODE_INFO[f.mode].label}`}
                      badgeColor={MODE_INFO[f.mode].color}
                      badgeTint={MODE_INFO[f.mode].tint}
                      extra={assigned.get(f.id) ? `✓ ${assigned.get(f.id)} assigned` : undefined}
                      onPress={() => navigation.navigate('LibraryActivity', { family: f.id, childId: child?.id })}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </>
      )}

      {tab === 'focus' && (
        <View style={{ gap: 10, marginTop: 16 }}>
          <Text style={styles.lead}>{t('Adaptive games that grow with the child. Customise the name, heroes and difficulty.')}</Text>
          {focus.map((g) => (
            <Row
              key={g.id}
              label={`${g.title}. ${g.subtitle}`}
              art={<Text style={{ fontSize: 28 }}>{g.icon}</Text>}
              tint={g.tint}
              title={g.title}
              sub={g.skill}
              badge="📱 Adapts automatically"
              badgeColor={colors.forest}
              badgeTint={colors.mint}
              onPress={() => child && navigation.navigate('ActivityBuilder', { childId: child.id, taskId: g.id })}
            />
          ))}
        </View>
      )}

      {tab === 'create' && (
        <View style={{ gap: 10, marginTop: 16 }}>
          <Text style={styles.lead}>{t('Make a game from your own photos and words, in about a minute.')}</Text>
          {create.map((t) => (
            <Row
              key={t.id}
              label={`${t.name}. ${t.pitch}`}
              art={<Text style={{ fontSize: 28 }}>{t.icon}</Text>}
              tint={t.tint}
              title={t.name}
              sub={t.pitch}
              onPress={() => child && navigation.navigate('GameStudio', { childId: child.id, template: t.id })}
            />
          ))}
        </View>
      )}

      {tab === 'mine' && (
        <View style={{ gap: 10, marginTop: 16 }}>
          {mine.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 34 }}>⭐</Text>
              <Text style={styles.emptyTitle}>{t('No saved versions yet')}</Text>
              <Text style={[styles.lead, { textAlign: 'center' }]}>{t('Customise any worksheet activity and turn on “Save to My versions” to reuse it with other children.')}</Text>
            </View>
          ) : (
            mine.map((v) => {
              const f = isLibraryFamily(v.family) ? FAMILY[v.family] : undefined;
              if (!f) return null;
              return (
                <Row
                  key={v.id}
                  label={v.name}
                  art={<Image source={LIBRARY_ART[f.id]} style={styles.artImg} />}
                  tint={f.tint}
                  title={v.name}
                  sub={`${t(f.name)} · ${t('starts {{level}}', { level: t(LEVEL_NAMES[v.level - 1]) })}${v.heroes[0] ? ` · ${t('with {{hero}}', { hero: v.heroes[0].name })}` : ''}${
                    v.ownerId && v.ownerId !== me?.id ? ` · ${t('shared by {{name}}', { name: team?.members.find((m) => m.id === v.ownerId)?.name ?? '' })}` : v.shared ? ` · ${t('shared with the team')}` : ''
                  }`}
                  onPress={() => navigation.navigate('LibraryCustomise', { family: f.id, versionId: v.id, childId: child?.id })}
                  onRemove={() => removeVersion(v.id)}
                />
              );
            })
          )}
        </View>
      )}
    </Screen>
  );
}

function Row({
  label,
  art,
  tint,
  title,
  sub,
  badge,
  badgeColor,
  badgeTint,
  extra,
  onPress,
  onRemove,
}: {
  label: string;
  art: React.ReactNode;
  tint: string;
  title: string;
  sub: string;
  badge?: string;
  badgeColor?: string;
  badgeTint?: string;
  extra?: string;
  onPress: () => void;
  onRemove?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.icon, { backgroundColor: tint }]}>{art}</View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name}>{title}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
        {(badge || extra) && (
          <View style={styles.badges}>
            {!!badge && (
              <View style={[styles.badge, { backgroundColor: badgeTint }]}>
                <Text style={[styles.badgeText, { color: badgeColor }]}>{badge}</Text>
              </View>
            )}
            {!!extra && <Text style={styles.assigned}>{extra}</Text>}
          </View>
        )}
      </View>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Delete ${title}`}>
          <Feather name="trash-2" size={18} color={colors.inkMuted} />
        </Pressable>
      ) : (
        <Feather name={flipIcon('chevron-right')} size={20} color={colors.inkMuted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: font.bold, fontSize: 22, color: colors.ink, marginTop: 2 },
  tabs: { gap: 8, marginTop: 18, paddingRight: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 8, height: 42, borderRadius: 21, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  tabOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  tabText: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  count: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { fontFamily: font.bold, fontSize: 12, color: colors.forest },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 14, height: 46, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.ink, height: 44 },
  filters: { gap: 8, marginTop: 12, paddingRight: 8 },
  filter: { paddingHorizontal: 12, height: 34, borderRadius: 17, justifyContent: 'center' },
  filterOn: { backgroundColor: colors.mint },
  filterText: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft },
  cat: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 1.4, color: colors.inkSoft },
  lead: { fontFamily: font.regular, fontSize: 14, color: colors.inkSoft, lineHeight: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 20, padding: 14, borderWidth: 1, borderColor: colors.border },
  icon: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  artImg: { width: 44, height: 44 },
  name: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: font.semibold, fontSize: 11.5 },
  assigned: { fontFamily: font.semibold, fontSize: 11.5, color: colors.forest },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 30, paddingHorizontal: 20 },
  emptyTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink },
});
