/**
 * The notification feed for each portal, built from data the app already has: messages,
 * home practice, feelings check-ins, the therapist's instructions, new activities and plans.
 * Pure TypeScript so it can be tested.
 */
import { noteSummary } from '../services/attachments';
import { parentLabel, therapistLabel } from '../store/seed';
import type { Child, ClinicVisit, KidCheckIn, Note, Role, Session } from '../types';
import { FEELING_EMOJI } from './clinic';
import { isDueToday } from './schedule';
import { dateLocale, t } from '../i18n';
import { currentWeek, weekDates } from './monthPlan';
import { TRAIN_BY_ID, TRAIN_IDS, type TrainTaskId } from './trainTasks';

export type NotifTarget =
  | { screen: 'messages'; childId: string }
  | { screen: 'child'; childId: string }
  | { screen: 'clinic'; childId: string }
  | { screen: 'home' }
  | { screen: 'train' };

export type AppNotification = {
  id: string;
  at: string;
  icon: string;
  /** Background tint for the icon bubble. */
  tint: string;
  title: string;
  body: string;
  target: NotifTarget;
};

const DAY = 86_400_000;
/** How far back the feed looks. */
const WINDOW_DAYS = 14;
const first = (name: string) => name.split(' ')[0];
const short = (text: string, n = 110) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);

type Data = {
  children: Child[];
  notes: Note[];
  sessions: Session[];
  checkIns: KidCheckIn[];
  visits: ClinicVisit[];
};

export function buildNotifications(role: Role, data: Data, parentChildId?: string | null, now = new Date()): AppNotification[] {
  const since = new Date(now.getTime() - WINDOW_DAYS * DAY).toISOString();
  // Home practice is frequent, so it only looks back a week.
  const weekAgo = new Date(now.getTime() - 7 * DAY).toISOString();
  const out: AppNotification[] = [];
  const children = role === 'parent' ? data.children.filter((c) => c.id === (parentChildId ?? data.children[0]?.id)) : data.children;

  for (const c of children) {
    const name = first(c.name);

    // Messages from the other side.
    for (const n of data.notes) {
      if (n.childId !== c.id || n.from === role || n.createdAt < since) continue;
      out.push({
        id: `msg-${n.id}`,
        at: n.createdAt,
        icon: n.card?.type === 'visit' ? '🩺' : n.card?.type === 'activity' ? '🎯' : n.card?.type === 'routine' ? '📋' : n.attachments?.length ? '📎' : '💬',
        tint: '#E6ECE2',
        title: role === 'therapist' ? `${parentLabel(c)} · ${name}’s parent` : therapistLabel(c),
        body: short(noteSummary(n) || 'New message'),
        target: { screen: 'messages', childId: c.id },
      });
    }

    if (role === 'therapist') {
      // Home practice, one line per child per day.
      const days = new Map<string, Session[]>();
      for (const s of data.sessions) {
        if (s.childId !== c.id || s.by !== 'parent' || s.startedAt < weekAgo) continue;
        const key = new Date(s.startedAt).toDateString();
        days.set(key, [...(days.get(key) ?? []), s]);
      }
      for (const [key, list] of days) {
        const games = list.flatMap((s) => s.blocks);
        const accs = games.map((b) => b.accuracy).filter((a): a is number => a !== null);
        const avg = accs.length ? Math.round((accs.reduce((a, b) => a + b, 0) / accs.length) * 100) : null;
        const last = list.reduce((a, b) => (a.startedAt > b.startedAt ? a : b));
        out.push({
          id: `home-${c.id}-${key}`,
          at: last.startedAt,
          icon: '🏠',
          tint: '#DDEEDA',
          title: t('{{name}} practised at home', { name }),
          body: `${t('{{n}} games', { n: games.length })}${avg !== null ? ` · ${t('{{n}}% accuracy', { n: avg })}` : ''}`,
          target: { screen: 'child', childId: c.id },
        });
      }
      // Low moods from the start flow.
      for (const k of data.checkIns) {
        if (k.childId !== c.id || k.at < since || !['tired', 'worried', 'grumpy'].includes(k.feeling)) continue;
        out.push({
          id: `feel-${k.id}`,
          at: k.at,
          icon: FEELING_EMOJI[k.feeling],
          tint: '#F6E3D6',
          title: t('{{name}} felt {{feeling}}', { name, feeling: t(k.feeling) }),
          body: t('From the feelings check-in before training'),
          target: { screen: 'child', childId: c.id },
        });
      }
      // A clinic visit coming up in the next 2 days.
      // The 4-week plan: a note when it is set and when each new week starts.
      if (c.monthPlan) {
        const cur = currentWeek(c.monthPlan, now);
        const startAt = cur ? weekDates(c.monthPlan, cur.index).from.toISOString() : c.monthPlan.createdAt;
        const at = cur && startAt > c.monthPlan.createdAt ? startAt : c.monthPlan.createdAt;
        if (at >= since && at <= now.toISOString()) {
          out.push({
            id: `month-${c.id}-${c.monthPlan.start}-${cur?.index ?? 'new'}`,
            at,
            icon: '🗓️',
            tint: '#E8E1FF',
            title: cur
              ? t('Week {{n}} of 4 for {{name}}', { n: cur.index + 1, name })
              : t('New 4-week plan for {{name}}', { name }),
            body: cur ? cur.week.goal : t('Starts {{date}}', { date: weekDates(c.monthPlan, 0).from.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }) }),
            target: { screen: 'home' },
          });
        }
      }
      const next = upcomingVisit(data.visits, c.id, now);
      if (next) {
        out.push({
          id: `visit-${c.id}-${next}`,
          at: reminderAt(next, now),
          icon: '📅',
          tint: '#F6EDCB',
          title: t('Clinic visit with {{name}} {{when}}', { name, when: t(dayWord(next, now)) }),
          body: t('Open the briefing to see what changed since last time'),
          target: { screen: 'clinic', childId: c.id },
        });
      }
    } else {
      // The therapist's home program instructions.
      if (c.homeNote?.trim()) {
        out.push({
          id: `note-${c.id}-${hash(c.homeNote)}`,
          at: c.homeNoteAt ?? c.createdAt,
          icon: '📋',
          tint: '#F6EDCB',
          title: t('Home program from {{who}}', { who: therapistLabel(c) }),
          body: short(c.homeNote.trim()),
          target: { screen: 'home' },
        });
      }
      // Today's planned activities (fixed days that include today), from 7am.
      const seven = new Date(now);
      seven.setHours(7, 0, 0, 0);
      const today = (c.customActivities ?? []).filter((x) => isDueToday(x.days, now));
      if (today.length && now >= seven) {
        out.push({
          id: `today-${c.id}-${now.toDateString()}`,
          at: seven.toISOString(),
          icon: '📅',
          tint: '#FFF1BF',
          title: t('Today for {{name}}: {{n}} activities', { name, n: today.length }),
          body: today.map((x) => x.name).join(' · '),
          target: { screen: 'home' },
        });
      }
      // New activities made for the child.
      for (const a of c.customActivities ?? []) {
        if (a.createdAt < since) continue;
        out.push({
          id: `act-${a.id}`,
          at: a.createdAt,
          icon: a.library ? '📚' : a.heroes?.[0]?.emoji ?? a.hero?.emoji ?? (a.studio ? '🧩' : '🎯'),
          tint: '#E3ECFF',
          title: t('New activity for {{name}}', { name }),
          body: `${t(a.name)} · ${t('from {{who}}', { who: therapistLabel(c) })}`,
          target: { screen: 'train' },
        });
      }
      // A new home plan from a clinic session.
      if (c.homePlan && c.homePlan.setAt >= since) {
        const games = c.homePlan.games
          .map((g) => (TRAIN_IDS as string[]).includes(g.taskId) ? TRAIN_BY_ID[g.taskId as TrainTaskId].title : null)
          .filter(Boolean);
        out.push({
          id: `plan-${c.id}-${c.homePlan.setAt}`,
          at: c.homePlan.setAt,
          icon: '🗓️',
          tint: '#DDEEDA',
          title: t('New home plan'),
          body: `${t('{{n}}× a week', { n: c.homePlan.daysPerWeek })} · ${t('{{n}} min', { n: c.homePlan.minutesPerDay })} · ${games.map((g) => t(String(g))).join(', ')}`,
          target: { screen: 'home' },
        });
      }
      const next = upcomingVisit(data.visits, c.id, now);
      if (next) {
        out.push({
          id: `visit-${c.id}-${next}`,
          at: reminderAt(next, now),
          icon: '📅',
          tint: '#F6EDCB',
          title: t('Clinic visit {{when}}', { when: t(dayWord(next, now)) }),
          body: t('{{name}}’s next session with {{who}}', { name, who: therapistLabel(c) }),
          target: { screen: 'home' },
        });
      }
    }
  }

  return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
}

/** The next planned visit date (YYYY-MM-DD) if it is today, tomorrow or the day after. */
function upcomingVisit(visits: ClinicVisit[], childId: string, now: Date): string | undefined {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return visits
    .filter((v) => v.childId === childId && v.status === 'done' && v.nextVisit)
    .map((v) => v.nextVisit as string)
    .filter((d) => {
      const t = new Date(`${d}T00:00:00`).getTime();
      return t >= today.getTime() && t <= today.getTime() + 2 * DAY;
    })
    .sort()[0];
}

/** Visit reminders are dated 8am two days before the visit, never later than the start of today (a fixed time, so read state sticks). */
function reminderAt(date: string, now: Date): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return new Date(Math.min(new Date(`${date}T08:00:00`).getTime() - 2 * DAY, today.getTime())).toISOString();
}

function dayWord(date: string, now: Date): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / DAY);
  return diff <= 0 ? 'today' : diff === 1 ? 'tomorrow' : 'in 2 days';
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Before Notifications is first opened, only the last 2 days count as new (so a first sign-in isn't flooded). */
export const isUnread = (n: AppNotification, seenAt: string | undefined, now = Date.now()) =>
  seenAt ? n.at > seenAt : now - Date.parse(n.at) < 2 * DAY;
