import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar, Button, Notice, Screen, TopBar } from '../../components/ui';
import { checkRemove, type TeamRole } from '../../engine/team';
import { t } from '../../i18n';
import type { RootProps } from '../../navigation/types';
import { useStore } from '../../store/useStore';
import { useTeamMember } from '../../store/useTeam';
import { colors, font } from '../../theme';
import { firstName } from '../helpers';

const ROLES: { value: TeamRole; label: string; hint: string }[] = [
  { value: 'admin', label: 'Admin', hint: 'Sees every child and manages the team' },
  { value: 'therapist', label: 'Therapist', hint: 'Sees the children shared with them' },
];

/** Clinic admin: the people on the clinic account, their role and which children each one sees. */
export default function ClinicTeamScreen({ navigation }: RootProps<'ClinicTeam'>) {
  const children = useStore((s) => s.children);
  const addMember = useStore((s) => s.addMember);
  const updateMember = useStore((s) => s.updateMember);
  const removeMember = useStore((s) => s.removeMember);
  const switchMember = useStore((s) => s.switchMember);
  const { team, me, admin } = useTeamMember();
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<TeamRole>('therapist');
  const [picked, setPicked] = useState<string[]>([]);
  const members = team?.members ?? [];

  const say = (title: string, body: string) => (Platform.OS === 'web' ? window.alert(`${title}\n\n${body}`) : Alert.alert(title, body));
  const add = () => {
    if (!name.trim()) return;
    addMember(name, role, picked);
    setName('');
    setPicked([]);
    setRole('therapist');
  };
  const remove = (id: string) => {
    if (!team) return;
    const err = checkRemove(team, id);
    if (err) return say(t('Can’t remove'), t(err));
    removeMember(id);
    setOpen(null);
  };

  return (
    <Screen>
      <TopBar title={t('Clinic team')} onBack={() => navigation.goBack()} />
      <Text style={styles.h1}>{t('Clinic team')}</Text>
      <Text style={styles.lead}>{t('Add the therapists in your clinic and choose which children each one works with.')}</Text>

      {me && (
        <View style={styles.meCard}>
          <Avatar name={me.name} color={me.color} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={styles.meKicker}>{t('SIGNED IN AS')}</Text>
            <Text style={styles.meName}>{me.name}</Text>
            <Text style={styles.meRole}>
              {t(me.role === 'admin' ? 'Admin' : 'Therapist')} · {me.role === 'admin' ? t('All children') : t(me.childIds.length === 1 ? '{{n}} child' : '{{n}} children', { n: me.childIds.length })}
            </Text>
          </View>
        </View>
      )}

      <Text style={styles.section}>{t('People')}</Text>
      <View style={styles.list}>
        {members.map((m, i) => {
          const isMe = m.id === me?.id;
          const expanded = open === m.id;
          return (
            <View key={m.id} style={[i > 0 && styles.divider]}>
              <View style={styles.member}>
                <Pressable onPress={() => admin && setOpen(expanded ? null : m.id)} style={styles.memberMain} accessibilityRole="button" accessibilityState={{ expanded }}>
                <Avatar name={m.name} color={m.color} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>
                    {m.name}
                    {isMe ? ` · ${t('you')}` : ''}
                  </Text>
                  <Text style={styles.memberSub}>
                    {t(m.role === 'admin' ? 'Admin' : 'Therapist')} ·{' '}
                    {m.role === 'admin'
                      ? t('All children')
                      : m.childIds.length
                        ? children.filter((c) => m.childIds.includes(c.id)).map((c) => firstName(c.name)).join(', ')
                        : t('No children yet')}
                  </Text>
                </View>
                </Pressable>
                {!isMe && (
                  <Pressable onPress={() => switchMember(m.id)} style={styles.switchBtn} accessibilityRole="button">
                    <Text style={styles.switchText}>{t('Switch to')}</Text>
                  </Pressable>
                )}
                {admin && <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.inkMuted} />}
              </View>

              {expanded && admin && (
                <View style={styles.edit}>
                  <Text style={styles.label}>{t('Role')}</Text>
                  <View style={styles.row}>
                    {ROLES.map((r) => {
                      const on = m.role === r.value;
                      return (
                        <Pressable key={r.value} onPress={() => updateMember(m.id, { role: r.value })} style={[styles.chip, on && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                          <Text style={[styles.chipText, on && { color: colors.white }]}>{t(r.label)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.hint}>{t(ROLES.find((r) => r.value === m.role)!.hint)}</Text>
                  {m.role === 'therapist' && (
                    <>
                      <Text style={styles.label}>{t('Children')}</Text>
                      <ChildPicker children={children} value={m.childIds} onChange={(childIds) => updateMember(m.id, { childIds })} />
                    </>
                  )}
                  <Button label="Remove from team" icon="user-x" variant="danger" onPress={() => remove(m.id)} style={{ marginTop: 12 }} />
                </View>
              )}
            </View>
          );
        })}
      </View>

      {admin ? (
        <>
          <Text style={styles.section}>{t('Add a therapist')}</Text>
          <View style={[styles.list, { padding: 14 }]}>
            <TextInput value={name} onChangeText={setName} placeholder={t('Name, e.g. Dr Sara')} placeholderTextColor={colors.inkMuted} style={styles.input} />
            <Text style={styles.label}>{t('Role')}</Text>
            <View style={styles.row}>
              {ROLES.map((r) => {
                const on = role === r.value;
                return (
                  <Pressable key={r.value} onPress={() => setRole(r.value)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                    <Text style={[styles.chipText, on && { color: colors.white }]}>{t(r.label)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {role === 'therapist' && (
              <>
                <Text style={styles.label}>{t('Children they work with')}</Text>
                <ChildPicker children={children} value={picked} onChange={setPicked} />
              </>
            )}
            <Button label="Add to team" icon="user-plus" disabled={!name.trim()} onPress={add} style={{ marginTop: 14 }} />
          </View>
        </>
      ) : (
        <Notice icon="lock" text="Only a clinic admin can add people or change who sees which child." style={{ marginTop: 16 }} />
      )}

      <Notice
        icon="info"
        text="Demo mode: the team lives on this device and “Switch to” stands in for each person signing in on their own phone. With the clinic server connected, children, plans and shared versions sync for everyone."
        style={{ marginTop: 16, marginBottom: 30 }}
      />
    </Screen>
  );
}

function ChildPicker({ children, value, onChange }: { children: { id: string; name: string; color: string; photo?: string | null; avatarEmoji?: string | null }[]; value: string[]; onChange: (ids: string[]) => void }) {
  return (
    <View style={styles.row}>
      {children.map((c) => {
        const on = value.includes(c.id);
        return (
          <Pressable
            key={c.id}
            onPress={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])}
            style={[styles.kid, on && styles.chipOn]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
          >
            <Avatar name={c.name} color={c.color} photo={c.photo} emoji={c.avatarEmoji} size={26} />
            <Text style={[styles.chipText, on && { color: colors.white }]}>{firstName(c.name)}</Text>
            {on && <Feather name="check" size={14} color={colors.white} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: font.heavy, fontSize: 30, color: colors.ink, letterSpacing: -0.5 },
  lead: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.inkSoft, marginTop: 6 },
  meCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 18, padding: 16, borderRadius: 22, backgroundColor: colors.forest },
  meKicker: { fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: colors.lime },
  meName: { fontFamily: font.bold, fontSize: 19, color: colors.white, marginTop: 2 },
  meRole: { fontFamily: font.medium, fontSize: 13, color: colors.onDark, marginTop: 2 },
  section: { fontFamily: font.bold, fontSize: 17, color: colors.ink, marginTop: 24, marginBottom: 10 },
  list: { borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  memberMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberName: { fontFamily: font.bold, fontSize: 15.5, color: colors.ink },
  memberSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  switchBtn: { paddingHorizontal: 12, height: 32, borderRadius: 16, backgroundColor: colors.sage, justifyContent: 'center' },
  switchText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.forest },
  edit: { paddingHorizontal: 14, paddingBottom: 16 },
  label: { fontFamily: font.semibold, fontSize: 13, color: colors.inkSoft, marginTop: 14, marginBottom: 8 },
  hint: { fontFamily: font.regular, fontSize: 12.5, color: colors.inkMuted, marginTop: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  kid: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 12, height: 36, borderRadius: 18, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border },
  input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.soft, paddingHorizontal: 12, fontFamily: font.medium, fontSize: 15, color: colors.ink },
});
