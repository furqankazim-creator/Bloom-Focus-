import { restartApp } from '../services/restart';
import { useTeamMember } from '../store/useTeam';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AvatarPicker } from '../components/AvatarPicker';
import { Avatar, Screen, TopBar, flipIcon } from '../components/ui';
import type { RootProps } from '../navigation/types';
import { cancelReminders, scheduleDailyReminder } from '../services/reminders';
import { therapistLabel } from '../store/seed';
import type { AppSettings, NotifPrefs } from '../store/settings';
import { useStore } from '../store/useStore';
import { colors, font } from '../theme';
import { LANGUAGES, setLanguage, t } from '../i18n';

type Icon = React.ComponentProps<typeof Feather>['name'];

const HOURS = [7, 8, 15, 16, 17, 18, 19, 20];
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

const FAQ: { q: string; a: string }[] = [
  { q: 'How do the games get harder?', a: 'After two rounds in a row with 85% or more right, the game moves up a step. Below 65% it eases off, so practice stays in the “just right” zone.' },
  { q: 'How long should practice be?', a: 'Short and regular works best: 5–15 minutes a day. Stop while it is still fun.' },
  { q: 'What is the Fun Zone?', a: 'Just-for-fun games that unlock after the day’s training. They aren’t scored or sent to the therapist.' },
  { q: 'Is this a medical test?', a: 'No. Bloom Focus is a practice tool that supports therapy. It does not diagnose or treat any condition.' },
];

/** Settings for both portals: account, notifications, appearance, the child’s games or clinic defaults, privacy and help. */
export default function SettingsScreen({ navigation }: RootProps<'Settings'>) {
  const { role, userName, signOut, resetDemo, setReminder, reminder, settings, updateSettings, children, parentChildId, soundOn, calmMode, setPrefs, updateChild } = useStore();
  const isParent = role === 'parent';
  const child = isParent ? children.find((c) => c.id === parentChildId) ?? children[0] : undefined;
  const first = child?.name.split(' ')[0] ?? 'your child';
  const [name, setName] = useState(userName);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 1800);
  };
  const set = (patch: Partial<AppSettings>) => updateSettings(patch);
  const { team, me } = useTeamMember();
  const setNotif = (patch: Partial<NotifPrefs>) => updateSettings({ notif: { ...settings.notif, ...patch } });

  /** Saves the name and shows it to the other side (therapist name for families, parent name for the therapist). */
  const saveName = () => {
    const n = name.trim();
    if (!n || n === userName) return;
    useStore.setState({ userName: n });
    for (const c of children) {
      if (role === 'therapist') updateChild(c.id, { therapistName: n });
      else if (c.id === child?.id) updateChild(c.id, { parentName: n });
    }
    flash('Name saved');
  };

  const confirm = (title: string, body: string, ok: string, run: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${body}`)) run();
      return;
    }
    Alert.alert(title, body, [{ text: t('Cancel'), style: 'cancel' }, { text: ok, style: 'destructive', onPress: run }]);
  };

  const leave = () => {
    cancelReminders().catch(() => {});
    setReminder({ ...reminder, enabled: false });
    signOut();
  };

  const toggleReminder = async (on: boolean) => {
    if (!on) {
      await cancelReminders().catch(() => {});
      setReminder({ ...reminder, enabled: false });
      return;
    }
    const result = await scheduleDailyReminder(reminder.hour, first);
    setReminder({ ...reminder, enabled: result === 'set' });
    flash(
      result === 'set'
        ? t('Reminder set for {{time}}', { time: hourLabel(reminder.hour) })
        : result === 'denied'
          ? t('Allow notifications to get reminders')
          : Platform.OS === 'web'
            ? t('Reminders work in the phone app')
            : t('Reminders need the installed app — Expo Go on Android can’t show them'),
    );
  };
  const setReminderHour = async (h: number) => {
    setReminder({ ...reminder, hour: h });
    if (reminder.enabled) await scheduleDailyReminder(h, first);
  };

  /** Everything stored for this account, as a JSON file. */
  const exportData = async () => {
    const s = useStore.getState();
    const mine = isParent ? s.children.filter((c) => c.id === child?.id) : s.children;
    const ids = new Set(mine.map((c) => c.id));
    const json = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        account: { name: s.userName, role: s.role, email: s.settings.email },
        children: mine,
        sessions: s.sessions.filter((x) => ids.has(x.childId)),
        skillBuilderPlays: s.libraryPlays.filter((x) => ids.has(x.childId)),
        messages: s.notes.filter((x) => ids.has(x.childId)),
        feelings: s.kidCheckIns.filter((x) => ids.has(x.childId)),
        clinicVisits: s.clinicVisits.filter((x) => ids.has(x.childId)),
      },
      null,
      2,
    );
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `bloom-focus-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash('Data downloaded');
    } else {
      await Share.share({ message: json, title: 'Bloom Focus data' });
    }
  };

  return (
    <Screen>
      <TopBar title={t('Settings')} onBack={() => navigation.goBack()} />

      {/* Profile header */}
      <View style={styles.profile}>
        <Pressable onPress={() => setPhotoOpen(true)} accessibilityRole="button" accessibilityLabel="Change photo">
          <Avatar name={userName || 'You'} color={colors.mint} photo={settings.photo} size={72} />
          <View style={styles.camera}>
            <Feather name="camera" size={13} color={colors.white} />
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{userName || 'You'}</Text>
          <Text style={styles.profileSub}>
            {isParent ? t('Parent of {{name}}', { name: first }) : `${t('Therapist')}${settings.clinicName ? ` · ${settings.clinicName}` : ''}`} · {t('demo mode')}
          </Text>
        </View>
      </View>

      {/* Language */}
      <Group title="Language" icon="globe">
        <View style={styles.langRow}>
          {LANGUAGES.map((l) => {
            const on = settings.language === l.id;
            return (
              <Pressable
                key={l.id}
                onPress={() => {
                  if (l.id === settings.language) return;
                  const restart = setLanguage(l.id);
                  set({ language: l.id });
                  // Arabic and Urdu read right to left; the layout flips on a fresh start.
                  if (restart) restartApp('Layout direction changed');
                }}
                style={[styles.langCard, on && styles.langOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.langNative, on && { color: colors.white }]}>{l.native}</Text>
                <Text style={[styles.langName, on && { color: colors.onDark }]}>{l.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </Group>

      {/* Account */}
      <Group title="Account" icon="user">
        <Field label="Your name">
          <TextInput value={name} onChangeText={setName} onBlur={saveName} onSubmitEditing={saveName} style={styles.input} placeholder={t('Your name')} placeholderTextColor={colors.inkMuted} />
        </Field>
        <Field label="Email">
          <TextInput value={settings.email} onChangeText={(email) => set({ email })} style={styles.input} placeholder="name@example.com" placeholderTextColor={colors.inkMuted} keyboardType="email-address" autoCapitalize="none" />
        </Field>
        <Row icon="key" title="Password" sub="Available once your clinic account is connected" disabled />
        <Row icon="log-out" title="Sign out" sub="Back to the start screen" onPress={leave} />
      </Group>

      {/* Parent: reminder, games, family */}
      {isParent && child && (
        <>
          <Group title="Practice reminder" icon="clock">
            <Toggle title="Daily reminder" sub={t('A gentle nudge to practise with {{name}}', { name: first })} value={reminder.enabled} onChange={toggleReminder} />
            <Chips label="Time" options={HOURS.map((h) => ({ value: h, label: hourLabel(h) }))} value={reminder.hour} onChange={setReminderHour} />
          </Group>

          <Group title={t('{{name}}’s games', { name: first })} icon="play-circle">
            <Toggle title="Game sounds" sub="Pops and chimes while playing" value={soundOn} onChange={(v) => setPrefs({ soundOn: v })} />
            <Toggle title="Calm mode" sub="Softer feedback and a slower pace" value={calmMode} onChange={(v) => setPrefs({ calmMode: v })} />
            <Toggle title="Hero speech bubbles" sub="The hero cheers during games" value={settings.heroTalk} onChange={(v) => set({ heroTalk: v })} />
            <Chips
              label="Fun Zone time per day"
              options={[{ value: 0, label: 'No limit' }, { value: 10, label: '10 min' }, { value: 20, label: '20 min' }, { value: 30, label: '30 min' }]}
              value={settings.funLimit}
              onChange={(v) => set({ funLimit: v })}
            />
          </Group>

          <Group title="Family" icon="users">
            <Row icon="edit-2" title={t('Edit {{name}}’s details', { name: first })} sub="Name, age, photo, favourite heroes" onPress={() => navigation.navigate('EditChild', { childId: child.id })} />
            <Row icon="message-circle" title={therapistLabel(child)} sub={t('{{name}}’s therapist · open messages', { name: first })} onPress={() => navigation.navigate('Tabs', { screen: 'Notes' })} />
            <Row
              icon="share-2"
              title="Invite another parent"
              sub={t('Family code {{code}}', { code: child.familyCode })}
              onPress={() => void Share.share({ message: `Join ${first} on Bloom Focus with the family code ${child.familyCode}` })}
            />
            <Row icon="lock" title="Parent PIN" sub="Set it on the Profile tab" onPress={() => navigation.navigate('Tabs', { screen: 'Profile' })} />
          </Group>
        </>
      )}

      {/* Therapist: clinic */}
      {!isParent && (
        <>
          <Group title="Clinic profile" icon="briefcase">
            <Field label="Clinic name">
              <TextInput value={settings.clinicName} onChangeText={(clinicName) => set({ clinicName })} style={styles.input} placeholder="e.g. Bloom Child Clinic" placeholderTextColor={colors.inkMuted} />
            </Field>
            <Field label="Report sign-off">
              <TextInput
                value={settings.reportSignoff}
                onChangeText={(reportSignoff) => set({ reportSignoff })}
                style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
                placeholder={'e.g. Dr Amna, Occupational Therapist\nPlease message me with any questions'}
                placeholderTextColor={colors.inkMuted}
                multiline
              />
            </Field>
            <Text style={styles.hint}>The clinic name and sign-off appear on printed progress reports.</Text>
          </Group>

          <Group title="Clinic team" icon="users">
            <Row
              icon="users"
              title={me ? t('{{name}} · {{role}}', { name: me.name, role: t(me.role === 'admin' ? 'Admin' : 'Therapist') }) : 'Clinic team'}
              sub={t('{{n}} people · add therapists, share children and switch user', { n: team?.members.length ?? 1 })}
              onPress={() => navigation.navigate('ClinicTeam')}
            />
          </Group>

          <Group title="Defaults for new children" icon="sliders">
            <Chips label="Session length" options={[10, 15, 20].map((m) => ({ value: m, label: `${m} min` }))} value={settings.defaultSessionMinutes} onChange={(v) => set({ defaultSessionMinutes: v })} />
            <Chips label="Home days per week" options={[2, 3, 4, 5].map((d) => ({ value: d, label: `${d}×` }))} value={settings.defaultHomeDays} onChange={(v) => set({ defaultHomeDays: v })} />
            <Toggle title="Adjust Skill Builder levels automatically" sub="Up after two 3-star goes, down after a hard one" value={settings.defaultAutoLevel} onChange={(v) => set({ defaultAutoLevel: v })} />
          </Group>

          <Group title="Clinic sessions" icon="clipboard">
            <Chips label="Games suggested" options={[2, 3, 4].map((n) => ({ value: n, label: `${n} games` }))} value={settings.clinicGames} onChange={(v) => set({ clinicGames: v })} />
            <Chips
              label="Next visit"
              options={[{ value: 7, label: 'In 1 week' }, { value: 14, label: 'In 2 weeks' }, { value: 0, label: 'Not set' }]}
              value={settings.nextVisitDays}
              onChange={(v) => set({ nextVisitDays: v as 7 | 14 | 0 })}
            />
          </Group>

          <Group title="Insights alerts" icon="activity">
            <Chips label="Alert when no home practice for" options={[3, 4, 5, 7].map((d) => ({ value: d, label: `${d} days` }))} value={settings.alertGapDays} onChange={(v) => set({ alertGapDays: v })} />
            <Chips label="Alert when a skill drops by" options={[5, 10, 15, 20].map((p) => ({ value: p, label: `${p}%` }))} value={settings.alertDropPct} onChange={(v) => set({ alertDropPct: v })} />
          </Group>

          <Group title="Family codes" icon="key">
            {children.map((c) => (
              <Row
                key={c.id}
                icon="hash"
                title={`${c.name} · ${c.familyCode}`}
                sub="Parents enter this code to link"
                action="Share"
                onPress={() => void Share.share({ message: `Bloom Focus family code for ${c.name.split(' ')[0]}: ${c.familyCode}` })}
              />
            ))}
          </Group>
        </>
      )}

      {/* Notifications */}
      <Group title="Notifications" icon="bell">
        <Toggle title="Messages" sub={isParent ? 'From your therapist' : 'From families'} value={settings.notif.messages} onChange={(v) => setNotif({ messages: v })} />
        <Toggle
          title={isParent ? 'Today’s activities' : 'Home practice'}
          sub={isParent ? 'What’s planned for today, each morning' : 'When a child practises at home'}
          value={settings.notif.practice}
          onChange={(v) => setNotif({ practice: v })}
        />
        {!isParent && <Toggle title="Low moods" sub="Tired, worried or grumpy check-ins" value={settings.notif.moods} onChange={(v) => setNotif({ moods: v })} />}
        {isParent && <Toggle title="New activities & plans" sub="When the therapist adds something" value={settings.notif.activities} onChange={(v) => setNotif({ activities: v })} />}
        <Toggle title="Clinic visit reminders" sub="Two days before a visit" value={settings.notif.visits} onChange={(v) => setNotif({ visits: v })} />
        <Toggle
          title="Quiet hours"
          sub={settings.notif.quietFrom !== null ? t('No pop-ups {{from}}–{{to}}', { from: hourLabel(settings.notif.quietFrom), to: hourLabel(settings.notif.quietTo ?? 7) }) : 'Pause pop-ups at night'}
          value={settings.notif.quietFrom !== null}
          onChange={(v) => setNotif(v ? { quietFrom: 21, quietTo: 7 } : { quietFrom: null, quietTo: null })}
        />
        {settings.notif.quietFrom !== null && (
          <>
            <Chips label="From" options={[20, 21, 22].map((h) => ({ value: h, label: hourLabel(h) }))} value={settings.notif.quietFrom} onChange={(v) => setNotif({ quietFrom: v })} />
            <Chips label="Until" options={[6, 7, 8].map((h) => ({ value: h, label: hourLabel(h) }))} value={settings.notif.quietTo ?? 7} onChange={(v) => setNotif({ quietTo: v })} />
          </>
        )}
      </Group>

      {/* Appearance */}
      <Group title="Appearance" icon="eye">
        <Chips
          label="Theme"
          options={[{ value: 'light', label: '☀️ Light' }, { value: 'dark', label: '🌙 Dark' }, { value: 'system', label: '📱 Match phone' }]}
          value={settings.theme}
          onChange={(v) => {
            set({ theme: v });
            // Styles are built at start-up, so the new colours need a fresh start.
            restartApp('Theme changed');
          }}
        />
        <Text style={styles.hint}>{t('Kid and game screens always stay bright and light.')}</Text>
        <Chips
          label="Text size"
          options={[{ value: 1, label: 'Normal' }, { value: 1.15, label: 'Large' }, { value: 1.3, label: 'Extra large' }]}
          value={settings.textScale}
          onChange={(v) => set({ textScale: v })}
        />
        {Platform.OS !== 'web' && <Text style={styles.hint}>{t('Text also follows your phone’s text size setting.')}</Text>}
        <Toggle title="Reduce motion" sub="Fewer animations and no confetti" value={settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
      </Group>

      {/* Privacy */}
      <Group title="Privacy & data" icon="shield">
        <Row icon="download" title="Export my data" sub="Profiles, games and messages as a file" onPress={() => void exportData()} />
        <Row icon="hard-drive" title="Where data is stored" sub="On this device in demo mode. Messages go through your clinic’s secure server when connected." disabled />
        <Row
          icon="rotate-ccw"
          title="Reset demo data"
          sub="Back to the sample children"
          onPress={() =>
            confirm('Reset demo data?', 'All profiles, sessions and messages on this device go back to the sample data.', 'Reset', () => {
              cancelReminders().catch(() => {});
              resetDemo();
            })
          }
        />
        <Row
          icon="trash-2"
          title="Delete account"
          sub="Removes everything on this device and signs out"
          danger
          onPress={() =>
            confirm('Delete account?', 'This removes all data on this device and signs you out. It cannot be undone.', 'Delete', () => {
              cancelReminders().catch(() => {});
              resetDemo();
            })
          }
        />
      </Group>

      {/* Help */}
      <Group title="Help" icon="help-circle">
        {FAQ.map((f, i) => (
          <Pressable key={f.q} onPress={() => setOpenFaq(openFaq === i ? null : i)} style={styles.faq} accessibilityRole="button" accessibilityState={{ expanded: openFaq === i }}>
            <View style={styles.faqHead}>
              <Text style={[styles.rowTitle, { flex: 1 }]}>{t(f.q)}</Text>
              <Feather name={openFaq === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkMuted} />
            </View>
            {openFaq === i && <Text style={styles.faqAnswer}>{t(f.a)}</Text>}
          </Pressable>
        ))}
        {isParent && child && <Row icon="message-square" title="Ask your therapist" sub={therapistLabel(child)} onPress={() => navigation.navigate('Tabs', { screen: 'Notes' })} />}
      </Group>

      <View style={styles.about}>
        <Text style={styles.aboutTitle}>🌸 Bloom Focus · {t('version')} 1.0</Text>
        <Text style={styles.aboutText}>
          {t('Adaptive practice for attention, memory, impulse control and flexible thinking. A practice tool that supports therapy — not a diagnostic tool or medical device.')}
        </Text>
        <Text style={styles.aboutText}>3D artwork: Microsoft Fluent Emoji (MIT licence).</Text>
      </View>

      <AvatarPicker
        visible={photoOpen}
        onClose={() => setPhotoOpen(false)}
        name={userName || 'You'}
        color={colors.mint}
        photo={settings.photo}
        emoji={null}
        onChange={(patch) => {
          set({ photo: patch.photo ?? null });
          setPhotoOpen(false);
          flash('Photo updated');
        }}
      />

      {toast && (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </Screen>
  );
}

function Group({ title, icon, children }: { title: string; icon: Icon; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <View style={styles.groupHead}>
        <Feather name={icon} size={15} color={colors.forest} />
        <Text style={styles.groupTitle}>{t(title).toUpperCase()}</Text>
      </View>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{t(label)}</Text>
      {children}
    </View>
  );
}

function Row({ icon, title, sub, onPress, disabled, danger, action }: { icon: Icon; title: string; sub?: string; onPress?: () => void; disabled?: boolean; danger?: boolean; action?: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled || !onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.soft }]} accessibilityRole="button">
      <View style={[styles.rowIcon, danger && { backgroundColor: colors.blush }]}>
        <Feather name={icon} size={16} color={danger ? colors.danger : colors.forest} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.danger }, disabled && { color: colors.inkSoft }]}>{t(title)}</Text>
        {!!sub && <Text style={styles.rowSub}>{t(sub)}</Text>}
      </View>
      {action ? <Text style={styles.action}>{t(action)}</Text> : onPress && !disabled ? <Feather name={flipIcon('chevron-right')} size={18} color={colors.inkMuted} /> : null}
    </Pressable>
  );
}

function Toggle({ title, sub, value, onChange }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{t(title)}</Text>
        {!!sub && <Text style={styles.rowSub}>{t(sub)}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.leaf, false: colors.border }} accessibilityLabel={title} />
    </View>
  );
}

function Chips<V extends number | string>({ label, options, value, onChange }: { label: string; options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{t(label)}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <Text style={[styles.chipText, on && { color: colors.white }]}>{t(o.label)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  langRow: { flexDirection: 'row', gap: 8, padding: 12 },
  langCard: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: colors.sage },
  langOn: { backgroundColor: colors.forest },
  langNative: { fontFamily: font.bold, fontSize: 17, color: colors.ink },
  langName: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border },
  camera: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  profileName: { fontFamily: font.heavy, fontSize: 22, color: colors.ink },
  profileSub: { fontFamily: font.regular, fontSize: 13.5, color: colors.inkSoft, marginTop: 2 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginLeft: 4 },
  groupTitle: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 1.3, color: colors.inkSoft },
  group: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, marginTop: 1 },
  action: { fontFamily: font.bold, fontSize: 13.5, color: colors.forest },
  field: { paddingHorizontal: 14, paddingVertical: 10, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  fieldLabel: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft },
  input: { borderRadius: 12, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 10, fontFamily: font.regular, fontSize: 15, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: colors.sage, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.forest },
  chipText: { fontFamily: font.semibold, fontSize: 13, color: colors.forest },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.inkMuted, paddingHorizontal: 14, paddingVertical: 8 },
  faq: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  faqHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faqAnswer: { fontFamily: font.regular, fontSize: 13.5, color: colors.inkSoft, lineHeight: 20, marginTop: 6 },
  about: { marginTop: 24, marginBottom: 20, padding: 16, borderRadius: 20, backgroundColor: colors.mint, gap: 6 },
  aboutTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  aboutText: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, lineHeight: 18 },
  toast: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: colors.ink, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  toastText: { fontFamily: font.semibold, fontSize: 14, color: colors.white },
});
