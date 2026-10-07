import { useMemo } from 'react';
import { buildNotifications, isUnread, type AppNotification, type NotifTarget } from '../engine/notifications';
import { useStore } from '../store/useStore';
import { useVisibleChildren } from '../store/useTeam';

/** This portal's notification feed and how many are new since Notifications was last opened. */
export function useNotifications() {
  const role = useStore((s) => s.role);
  const children = useVisibleChildren();
  const notes = useStore((s) => s.notes);
  const inbox = useStore((s) => s.inbox);
  const sessions = useStore((s) => s.sessions);
  const checkIns = useStore((s) => s.kidCheckIns);
  const visits = useStore((s) => s.clinicVisits);
  const parentChildId = useStore((s) => s.parentChildId);
  const seenAt = useStore((s) => (role ? s.notifSeen[role] : undefined));
  const prefs = useStore((s) => s.settings.notif);

  const items = useMemo<AppNotification[]>(() => {
    if (!role) return [];
    // Live-server messages arrive in the inbox; the demo conversation lives in `notes`.
    const ids = new Set(notes.map((n) => n.id));
    const all = [...notes, ...inbox.filter((n) => !ids.has(n.id))];
    // Settings → Notifications: each kind can be switched off.
    return buildNotifications(role, { children, notes: all, sessions, checkIns, visits }, parentChildId).filter((n) => prefs[kindOf(n.id)]);
  }, [role, children, notes, inbox, sessions, checkIns, visits, parentChildId, prefs]);

  const unread = items.filter((n) => isUnread(n, seenAt)).length;
  return { items, unread, seenAt };
}

type Kind = 'messages' | 'practice' | 'moods' | 'visits' | 'activities';
/** Which Settings switch a notification belongs to (by its id prefix). */
export function kindOf(id: string): Kind {
  const p = id.split('-')[0];
  return p === 'msg' ? 'messages' : p === 'home' || p === 'today' ? 'practice' : p === 'feel' ? 'moods' : p === 'visit' ? 'visits' : 'activities';
}

/** Where tapping a notification goes. */
export function openTarget(nav: { navigate: (...args: any[]) => void }, t: NotifTarget) {
  switch (t.screen) {
    case 'messages':
      return nav.navigate('Tabs', { screen: 'Notes', params: { childId: t.childId } });
    case 'child':
      return nav.navigate('ChildProfile', { childId: t.childId });
    case 'clinic':
      return nav.navigate('ClinicSession', { childId: t.childId });
    case 'home':
      return nav.navigate('Tabs', { screen: 'Home' });
    case 'train':
      return nav.navigate('Tabs', { screen: 'Train' });
  }
}
