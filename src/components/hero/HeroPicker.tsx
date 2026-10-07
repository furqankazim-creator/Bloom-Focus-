import { t } from '../../i18n';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { HERO_PRESETS, WORLDS, WORLD_IDS, sameHero, worldOf } from '../../engine/heroes';
import { HERO_ART } from './heroArt';
import { pickStudioImage } from '../../services/studioImages';
import { lightColors as colors, font } from '../../theme';
import type { Character, HeroWorld } from '../../types';
import { HeroSticker } from './HeroSticker';

/**
 * Choose up to `max` heroes. The first one picked is the game buddy; the rest join the scene.
 * `favourites` (the child's own heroes) come first, then the built-in heroes.
 * "Add your own" makes a hero from a photo or drawing.
 */
export function HeroPicker({
  value,
  onChange,
  max = 3,
  favourites = [],
}: {
  value: Character[];
  onChange: (heroes: Character[]) => void;
  max?: number;
  favourites?: Character[];
}) {
  const [adding, setAdding] = useState(false);
  // "Your heroes": favourites, photo heroes and anything already chosen.
  const customs = [...favourites, ...value].filter((h, i, all) => all.findIndex((x) => sameHero(x, h)) === i);
  const [category, setCategory] = useState<HeroWorld | 'mine'>(customs.length ? 'mine' : value[0] ? worldOf(value[0]) : 'space');
  const list = category === 'mine' ? customs : HERO_PRESETS.filter((p) => p.world === category);
  const order = (h: Character) => value.findIndex((v) => sameHero(v, h));

  const toggle = (h: Character) => {
    const i = order(h);
    if (i >= 0) onChange(value.filter((_, j) => j !== i));
    else if (value.length < max) onChange([...value, h]);
    else onChange([...value.slice(0, max - 1), h]);
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} style={{ marginBottom: 10 }}>
        <CategoryTab label="Your heroes" icon={<Text style={{ fontSize: 15 }}>❤️</Text>} on={category === 'mine'} count={customs.length} onPress={() => setCategory('mine')} />
        {WORLD_IDS.map((w) => {
          const first = HERO_PRESETS.find((p) => p.world === w);
          const picked = value.filter((v) => worldOf(v) === w && !v.image).length;
          return (
            <CategoryTab
              key={w}
              label={WORLDS[w].name}
              icon={first?.id ? <Image source={HERO_ART[first.id]} style={{ width: 20, height: 20 }} /> : null}
              on={category === w}
              count={picked}
              onPress={() => setCategory(w)}
            />
          );
        })}
      </ScrollView>
      {category !== 'mine' && <Text style={styles.tagline}>{WORLDS[category].tagline}</Text>}
      <View style={styles.grid}>
        <Pressable onPress={() => setAdding(true)} style={[styles.cell, styles.addCell]} accessibilityRole="button" accessibilityLabel="Add your own hero">
          <View style={styles.addIcon}>
            <Feather name="plus" size={22} color={colors.forest} />
          </View>
          <Text style={[styles.name, { color: colors.forest }]}>{t('Your own')}</Text>
        </Pressable>
        {category === 'mine' && list.length === 0 && (
          <Text style={[styles.tagline, { alignSelf: 'center', flex: 1 }]}>{t('No heroes yet — add your own, or pick from a category.')}</Text>
        )}
        {list.map((h) => {
          const i = order(h);
          const fav = favourites.some((f) => sameHero(f, h));
          return (
            <Pressable
              key={`${h.name}-${h.emoji}-${h.image?.length ?? 0}`}
              onPress={() => toggle(h)}
              style={[styles.cell, i >= 0 && styles.cellOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: i >= 0 }}
              accessibilityLabel={`${h.name}${i >= 0 ? `, hero ${i + 1}` : ''}`}
            >
              <HeroSticker hero={h} size={54} />
              <Text style={styles.name} numberOfLines={2}>
                {h.name}
              </Text>
              {i >= 0 && (
                <View style={styles.order}>
                  <Text style={styles.orderText}>{i + 1}</Text>
                </View>
              )}
              {fav && i < 0 && <Text style={styles.fav}>♥</Text>}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        {value.length === 0
          ? `Pick up to ${max}. The first one is the game buddy.`
          : `${value.map((h, i) => `${i + 1}. ${h.name}`).join('   ')}${value.length < max ? `   ·  ${max - value.length} more allowed` : ''}`}
      </Text>
      <AddHeroSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onAdd={(h) => {
          setAdding(false);
          onChange([...value, h].slice(-max));
        }}
      />
    </View>
  );
}

function CategoryTab({ label, icon, on, count, onPress }: { label: string; icon: React.ReactNode; on: boolean; count: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, on && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
      {icon}
      <Text style={[styles.tabText, on && { color: colors.white }]}>{label}</Text>
      {count > 0 && (
        <View style={[styles.tabCount, on && { backgroundColor: colors.white }]}>
          <Text style={[styles.tabCountText, on && { color: colors.forest }]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const QUICK = ['🦸', '🐸', '🦊', '🐯', '🐻', '🐧', '🦉', '🐢', '🧙', '🥷', '👻', '🤠'];

function AddHeroSheet({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (h: Character) => void }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🦸');
  const [image, setImage] = useState<string | undefined>();
  const [world, setWorld] = useState<HeroWorld>('fantasy');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const hero: Character = { name: name.trim() || 'My hero', emoji: emoji || '⭐', world, ...(image ? { image } : {}) };

  const reset = () => {
    setName('');
    setEmoji('🦸');
    setImage(undefined);
    setWorld('fantasy');
    setErr('');
  };
  const photo = async (source: 'library' | 'camera') => {
    setErr('');
    setBusy(true);
    try {
      const uri = await pickStudioImage('picture', source);
      if (uri) setImage(uri);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not use that picture.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 4 }} keyboardShouldPersistTaps="handled">
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{t('Create your own hero')}</Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                <Feather name="x" size={22} color={colors.inkSoft} />
              </Pressable>
            </View>
            <Text style={styles.sheetHint}>{t('Use a photo of a favourite toy or pet, the child’s own drawing, or pick an emoji.')}</Text>

            <View style={styles.previewRow}>
              {busy ? <ActivityIndicator color={colors.forest} /> : <HeroSticker hero={hero} size={96} showName />}
            </View>

            <Text style={styles.label}>{t('Name')}</Text>
            <TextInput value={name} onChangeText={(t) => setName(t.slice(0, 18))} placeholder="e.g. Captain Teddy" placeholderTextColor={colors.inkMuted} style={styles.input} />

            <Text style={styles.label}>{t('Picture')}</Text>
            <View style={styles.row}>
              <Pressable onPress={() => void photo('library')} style={styles.btn} accessibilityRole="button">
                <Feather name="image" size={16} color={colors.forest} />
                <Text style={styles.btnText}>{image ? 'Change photo' : 'Photo or drawing'}</Text>
              </Pressable>
              <Pressable onPress={() => void photo('camera')} style={styles.btn} accessibilityRole="button">
                <Feather name="camera" size={16} color={colors.forest} />
                <Text style={styles.btnText}>{t('Camera')}</Text>
              </Pressable>
              {image && (
                <Pressable onPress={() => setImage(undefined)} style={styles.btn} accessibilityRole="button">
                  <Text style={styles.btnText}>{t('Use emoji')}</Text>
                </Pressable>
              )}
            </View>
            {!image && (
              <View style={[styles.row, { marginTop: 8 }]}>
                {QUICK.map((e) => (
                  <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && styles.emojiOn]} accessibilityRole="button">
                    <Text style={{ fontSize: 22 }}>{e}</Text>
                  </Pressable>
                ))}
                <TextInput
                  value={QUICK.includes(emoji) ? '' : emoji}
                  onChangeText={(t) => setEmoji(t.trim().slice(0, 8))}
                  placeholder="Any"
                  placeholderTextColor={colors.inkMuted}
                  style={[styles.input, { width: 64, height: 42, textAlign: 'center', paddingVertical: 0 }]}
                />
              </View>
            )}
            {!!err && <Text style={[styles.sheetHint, { color: colors.danger }]}>{err}</Text>}

            <Text style={styles.label}>{t('Their world')}</Text>
            <View style={styles.row}>
              {WORLD_IDS.map((w) => (
                <Pressable key={w} onPress={() => setWorld(w)} style={[styles.world, world === w && styles.worldOn]} accessibilityRole="button" accessibilityState={{ selected: world === w }}>
                  <Text style={{ fontSize: 16 }}>{WORLDS[w].props[0]}</Text>
                  <Text style={[styles.worldText, world === w && { color: colors.white }]}>{WORLDS[w].name}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => {
                onAdd(hero);
                reset();
              }}
              disabled={!name.trim()}
              style={[styles.save, !name.trim() && { opacity: 0.4 }]}
              accessibilityRole="button"
            >
              <Text style={styles.saveText}>{t('Add hero')}</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: 6, paddingRight: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: 18, backgroundColor: colors.sage },
  tabOn: { backgroundColor: colors.forest },
  tabText: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  tabCount: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  tabCountText: { fontFamily: font.bold, fontSize: 10.5, color: colors.white },
  tagline: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkSoft, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: 78, paddingTop: 8, paddingBottom: 6, borderRadius: 18, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', gap: 4 },
  cellOn: { borderColor: colors.forest, backgroundColor: colors.mint },
  addCell: { borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.card },
  addIcon: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.semibold, fontSize: 11.5, lineHeight: 14, color: colors.ink, maxWidth: 74, textAlign: 'center' },
  order: { position: 'absolute', top: 2, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.forest, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  orderText: { fontFamily: font.bold, fontSize: 11, color: colors.white },
  fav: { position: 'absolute', top: 4, right: 8, fontSize: 12, color: colors.danger },
  hint: { fontFamily: font.medium, fontSize: 12.5, color: colors.inkSoft, marginTop: 10 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.bg },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontFamily: font.bold, fontSize: 20, color: colors.ink },
  sheetHint: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginTop: 4 },
  previewRow: { alignItems: 'center', justifyContent: 'center', height: 140, marginVertical: 8 },
  label: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, marginTop: 14, marginBottom: 8 },
  input: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10, fontFamily: font.regular, fontSize: 16, color: colors.ink },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: 20, backgroundColor: colors.mint },
  btnText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.forest },
  emoji: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  emojiOn: { borderColor: colors.forest, backgroundColor: colors.mint },
  world: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  worldOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  worldText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.ink },
  save: { marginTop: 22, height: 50, borderRadius: 25, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: font.bold, fontSize: 16, color: colors.white },
});
