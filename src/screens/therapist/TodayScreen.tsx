import { useVisibleChildren } from '../../store/useTeam';
import { t } from '../../i18n';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Card, Divider, IconButton, Notice, Screen, SectionHeader, StatTile, T, flipIcon } from '../../components/ui';
import { pct } from '../../engine/adaptive';
import { DOMAIN_LABEL } from '../../engine/tasks';
import { NotificationBell } from '../../notifications/NotificationBell';
import { useStore } from '../../store/useStore';
import { colors, font } from '../../theme';
import { childStats, firstName, greeting, longDate, relativeDay, thisWeek } from '../helpers';

export default function TodayScreen() {
  const nav = useNavigation();
  const { sessions: allSessions, userName } = useStore();
  const children = useVisibleChildren();
  // Only the children this person works with.
  const mineIds = new Set(children.map((c) => c.id));
  const sessions = allSessions.filter((s) => mineIds.has(s.childId));
  const week = thisWeek(sessions);
  const todayKey = new Date().toDateString();
  const activeToday = new Set(sessions.filter((s) => new Date(s.startedAt).toDateString() === todayKey).map((s) => s.childId));
  const minutes = Math.round(week.reduce((s, x) => s + x.activeSec, 0) / 60);

  // Suggest whoever has gone longest without practice.
  const upNext = [...children].sort((a, b) => {
    const la = childStats(a, sessions).last?.startedAt ?? '';
    const lb = childStats(b, sessions).last?.startedAt ?? '';
    return la.localeCompare(lb);
  })[0];

  const upNextLast = upNext ? childStats(upNext, sessions).last?.startedAt : undefined;


  return (
    <Screen>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={[styles.row, { gap: 14 }]}>
          <View style={styles.logo}>
            <MaterialCommunityIcons name="clover" size={34} color={colors.lime} />
          </View>
          <View>
            <Text style={styles.brand}>{t('bloom focus')}</Text>
            <T.Eyebrow style={{ marginBottom: 0, marginTop: 2 }}>{t('Therapist space')}</T.Eyebrow>
          </View>
        </View>
        <View style={[styles.row, { gap: 10 }]}>
          <NotificationBell />
          <IconButton icon="settings" label="Settings" size={56} onPress={() => nav.navigate('Settings')} />
        </View>
      </View>

      <T.Eyebrow style={{ marginTop: 30 }}>{longDate()}</T.Eyebrow>
      <T.Display>
        {greeting()},{'\n'}
        {userName || t('there')}.
      </T.Display>
      <T.Body style={{ marginTop: 8, fontSize: 16 }}>{t('There is room for one small win today.')}</T.Body>

      <LinearGradient colors={[colors.forestDeep, colors.forest]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.pill}>
          <View style={styles.pillDot} />
          <Text style={styles.pillText}>{t('A GENTLE PLACE TO GROW')}</Text>
        </View>
        <Text style={styles.heroTitle}>{t('Little steps.')}{'\n'}{t('Bright blooms.')}</Text>
        <Text style={styles.heroBody}>
          {upNext
            ? upNextLast
              ? relativeDay(upNextLast) === t('Today')
                ? t('{{name}} is up next for a clinic session · practised at home today.', { name: firstName(upNext.name) })
                : t('{{name}} has gone the longest without practice · last practised {{when}}.', { name: firstName(upNext.name), when: relativeDay(upNextLast).toLowerCase() })
              : t('{{name}} hasn’t practised yet.', { name: firstName(upNext.name) })
            : t('Add a child profile to begin.')}
        </Text>
        <Pressable
          style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.85 }]}
          onPress={() => (upNext ? nav.navigate('ClinicSession', { childId: upNext.id }) : nav.navigate('EditChild', {}))}
        >
          <Feather name={flipIcon('arrow-right')} size={22} color={colors.onPastel} />
          <Text style={styles.heroButtonText}>{upNext ? t('Start with {{name}}', { name: firstName(upNext.name) }) : t('Add a child')}</Text>
        </Pressable>
        {upNext && (
          <Pressable onPress={() => nav.navigate('KidHub', { childId: upNext.id })} style={styles.kidLink} accessibilityRole="button">
            <Text style={styles.kidLinkText}>{t('Or open {{name}}’s kid view', { name: firstName(upNext.name) })}</Text>
            <Feather name="arrow-up-right" size={15} color={colors.lime} />
          </Pressable>
        )}
        <Text style={styles.heroMeta}>
          {t(children.length === 1 ? '{{n}} profile · {{a}} active today' : '{{n}} profiles · {{a}} active today', { n: children.length, a: activeToday.size })}
        </Text>
      </LinearGradient>

      <SectionHeader title="Your little community" subtitle="Quick check-ins, familiar faces." action="See all" onAction={() => nav.navigate('Tabs', { screen: 'Children' })} />
      <View style={{ gap: 12 }}>
        {children.map((c) => {
          const st = childStats(c, sessions);
          return (
            <Card key={c.id}>
              <View style={[styles.row, { gap: 16 }]}>
                <Pressable
                  style={[styles.row, { flex: 1, gap: 16 }]}
                  onPress={() => nav.navigate('ChildProfile', { childId: c.id })}
                  accessibilityRole="button"
                >
                  <Avatar name={c.name} color={c.color} photo={c.photo} emoji={c.avatarEmoji} size={64} />
                  <View style={{ flex: 1 }}>
                    <T.H3 style={{ fontSize: 19 }}>{c.name}</T.H3>
                    <T.Body style={{ marginTop: 2 }}>
                      {t('{{n}} years', { n: c.age })} · {t(st.task.name)}
                    </T.Body>
                  </View>
                </Pressable>
                <IconButton icon="play" label={`Start session with ${c.name}`} bg={colors.lime} color={colors.ink} size={60} onPress={() => nav.navigate('ClinicSession', { childId: c.id })} />
              </View>
              <Divider style={{ marginVertical: 14 }} />
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <T.Body>{DOMAIN_LABEL[c.focus]}</T.Body>
                <Text style={styles.avg}>{st.avg === null ? 'No sessions yet' : `${pct(st.avg)} avg.`}</Text>
              </View>
            </Card>
          );
        })}
      </View>

      <SectionHeader title="A glance at the week" />
      <View style={[styles.row, { gap: 10 }]}>
        <StatTile value={week.length} label="Sessions" bg={colors.mint} icon="star" />
        <StatTile value={new Set(week.map((s) => s.childId)).size} label="Children" bg={colors.peach} icon="users" />
        <StatTile value={`${minutes} min`} label="In focus" bg={colors.butter} icon="clock" />
      </View>
      <Notice style={{ marginTop: 16 }} text="Sample practice data · saved only on this device" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 60, height: 60, borderRadius: 18, backgroundColor: '#14253F', alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: font.bold, fontSize: 21, color: colors.ink, letterSpacing: -0.5 },
  hero: { borderRadius: 30, padding: 22, marginTop: 24, overflow: 'hidden' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.lime, alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.forestDeep },
  pillText: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1.6, color: colors.forestDeep },
  heroTitle: { fontFamily: font.heavy, fontSize: 32, lineHeight: 38, color: colors.white, marginTop: 20, letterSpacing: -1 },
  heroBody: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.onDark, marginTop: 12 },
  heroButton: {
    marginTop: 20,
    height: 60,
    borderRadius: 22,
    backgroundColor: colors.onDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  heroButtonText: { fontFamily: font.semibold, fontSize: 18, color: colors.onPastel },
  kidLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  kidLinkText: { fontFamily: font.semibold, fontSize: 14, color: colors.lime },
  heroMeta: { fontFamily: font.regular, fontSize: 13, color: colors.onDark, marginTop: 16 },
  avg: { fontFamily: font.bold, fontSize: 15, color: colors.forest },
});
