/**
 * Clinic sessions: what the therapist needs to know before the child sits down (the briefing),
 * which games to plan, and the numbers for the wrap-up. Pure TypeScript so it can be tested.
 */
import type { Child, ClinicTag, ClinicVisit, Feeling, KidCheckIn, LibraryPlay, LibraryVersion, Note, Params, PlanGame, Session } from '../types';
import { FAMILY, LEVEL_NAMES, isLibraryFamily, type LibraryFamilyId } from '../library/catalog';
import { taskLevel } from './adaptive';
import { personalize } from './personalize';
import { DIM_STEPS } from './tasks';
import { TRAIN_BY_ID, TRAIN_IDS, MAX_SEQUENCE, gameDurationSec, trainTaskDef, type TrainTaskId } from './trainTasks';

const DAY = 86_400_000;

export const CLINIC_TAGS: { id: ClinicTag; label: string; emoji: string; tone: 'good' | 'watch' }[] = [
  { id: 'greatFocus', label: 'Great focus', emoji: '🌟', tone: 'good' },
  { id: 'selfCorrected', label: 'Self-corrected', emoji: '🔁', tone: 'good' },
  { id: 'prompt', label: 'Needed a prompt', emoji: '💬', tone: 'watch' },
  { id: 'distracted', label: 'Distracted', emoji: '👀', tone: 'watch' },
  { id: 'frustrated', label: 'Frustrated', emoji: '😣', tone: 'watch' },
];

export const FEELING_EMOJI: Record<Feeling, string> = {
  happy: '😊',
  calm: '😌',
  excited: '🤩',
  tired: '😴',
  worried: '😟',
  grumpy: '😠',
};
const LOW_FEELINGS: Feeling[] = ['tired', 'worried', 'grumpy'];

export const isTrain = (id: string): id is TrainTaskId => (TRAIN_IDS as string[]).includes(id);
/** The Skill Builder family behind a plan item (`library-<family>`), if it is one. */
export const libraryFamilyOf = (taskId: string): LibraryFamilyId | undefined => {
  const f = taskId.startsWith('library-') ? taskId.slice(8) : '';
  return isLibraryFamily(f) ? f : undefined;
};

/** Display name for a plan item: custom activity, saved version, Skill Builder or Focus game. */
export function planTitle(child: Child, p: PlanGame, versions: LibraryVersion[] = []): string {
  const custom = p.customId ? child.customActivities?.find((a) => a.id === p.customId)?.name : undefined;
  if (custom) return custom;
  const fam = libraryFamilyOf(p.taskId);
  if (fam) return versions.find((v) => v.id === p.versionId)?.name ?? FAMILY[fam].name;
  return isTrain(p.taskId) ? TRAIN_BY_ID[p.taskId].title : 'Activity';
}

export type SkillTrend = { taskId: TrainTaskId; before: number | null; now: number; delta: number | null; plays: number };
export type Alert = { tone: 'warn' | 'info'; text: string };

export type SkillBuilderStat = { family: LibraryFamilyId; plays: number; avg: number | null; hard: number; easy: number };

export type Briefing = {
  /** The last finished visit, if any. */
  lastVisit?: ClinicVisit;
  /** Start of the "since last visit" window. */
  since: string;
  days: number;
  /** One entry per day for the last 7 days (oldest first): did the child practise at home? */
  week: { date: string; practised: boolean }[];
  homeDays: number;
  homeMinutes: number;
  lastPractised?: string;
  feelings: { feeling: Feeling; count: number }[];
  lowFeelings: number;
  parentNotes: Note[];
  unread: number;
  trends: SkillTrend[];
  /** Skill Builders played or done on paper since the last visit. */
  builders: SkillBuilderStat[];
  alerts: Alert[];
};

const blockAccuracies = (sessions: Session[], id: TrainTaskId) =>
  sessions.flatMap((s) => s.blocks.filter((b) => b.taskId === id && b.accuracy !== null).map((b) => b.accuracy as number));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function lastVisitFor(visits: ClinicVisit[], childId: string): ClinicVisit | undefined {
  return visits
    .filter((v) => v.childId === childId && v.status === 'done')
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
}

export function buildBriefing(
  child: Child,
  all: { sessions: Session[]; notes: Note[]; checkIns: KidCheckIn[]; visits: ClinicVisit[]; libraryPlays?: LibraryPlay[] },
  now = new Date(),
): Briefing {
  const lastVisit = lastVisitFor(all.visits, child.id);
  const sinceMs = lastVisit ? Date.parse(lastVisit.endedAt ?? lastVisit.startedAt) : now.getTime() - 7 * DAY;
  const since = new Date(sinceMs).toISOString();
  const days = Math.max(1, Math.round((now.getTime() - sinceMs) / DAY));

  const mine = all.sessions.filter((s) => s.childId === child.id).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const home = mine.filter((s) => s.by === 'parent');
  const recent = mine.filter((s) => s.startedAt >= since);
  const recentHome = home.filter((s) => s.startedAt >= since);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * DAY);
    const key = d.toDateString();
    return { date: d.toISOString(), practised: home.some((s) => new Date(s.startedAt).toDateString() === key) };
  });

  const feelingsList = all.checkIns.filter((c) => c.childId === child.id && c.at >= since);
  const counts = new Map<Feeling, number>();
  for (const c of feelingsList) counts.set(c.feeling, (counts.get(c.feeling) ?? 0) + 1);
  const feelings = [...counts.entries()].map(([feeling, count]) => ({ feeling, count })).sort((a, b) => b.count - a.count);
  const lowFeelings = feelingsList.filter((c) => LOW_FEELINGS.includes(c.feeling)).length;

  const childNotes = all.notes.filter((n) => n.childId === child.id && n.from === 'parent');
  const parentNotes = childNotes.filter((n) => n.createdAt >= since).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = childNotes.filter((n) => !n.readAt).length;

  // Skill trends: accuracy since the last visit against the plays before it.
  const before = mine.filter((s) => s.startedAt < since);
  const trends: SkillTrend[] = [];
  for (const id of TRAIN_IDS) {
    const nowAcc = blockAccuracies(recent, id);
    if (!nowAcc.length) continue;
    const prev = mean(blockAccuracies(before, id).slice(-5));
    const cur = mean(nowAcc.slice(-5)) as number;
    trends.push({ taskId: id, before: prev, now: cur, delta: prev === null ? null : cur - prev, plays: nowAcc.length });
  }
  // Drops first (they need attention), then the biggest gains.
  trends.sort((a, b) => {
    const da = (a.delta ?? 0) <= -0.03 ? 1 : 0;
    const db = (b.delta ?? 0) <= -0.03 ? 1 : 0;
    return db - da || Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0);
  });

  // Skill Builders: app games and paper activities the parent marked done.
  const byFamily = new Map<LibraryFamilyId, LibraryPlay[]>();
  for (const p of all.libraryPlays ?? []) {
    if (p.childId !== child.id || p.playedAt < since || !isLibraryFamily(p.family) || p.activityId.startsWith('visit-')) continue;
    byFamily.set(p.family, [...(byFamily.get(p.family) ?? []), p]);
  }
  const builders: SkillBuilderStat[] = [...byFamily.entries()]
    .map(([family, ps]) => {
      const accs = ps.map((p) => p.accuracy).filter((a): a is number => a !== null);
      return { family, plays: ps.length, avg: mean(accs), hard: ps.filter((p) => p.parentRating === 'hard' || p.stars <= 1).length, easy: ps.filter((p) => p.parentRating === 'easy').length };
    })
    .sort((a, b) => b.plays - a.plays);

  const alerts: Alert[] = [];
  for (const b of builders) if (b.hard >= 2) alerts.push({ tone: 'info', text: `${FAMILY[b.family].name} felt hard ${b.hard} times.` });
  const lastPractised = home[home.length - 1]?.startedAt;
  const gap = lastPractised ? Math.floor((now.getTime() - Date.parse(lastPractised)) / DAY) : null;
  if (gap === null) alerts.push({ tone: 'warn', text: 'No home practice recorded yet.' });
  else if (gap >= 4) alerts.push({ tone: 'warn', text: `No home practice for ${gap} days.` });
  if (lowFeelings >= 2) alerts.push({ tone: 'warn', text: `Felt tired, worried or grumpy ${lowFeelings} times.` });
  const frustrated = recent.filter((s) => s.blocks.some((b) => b.metrics.frustrationDetected)).length;
  if (frustrated) alerts.push({ tone: 'warn', text: `Signs of frustration (rapid tapping) in ${frustrated} game${frustrated === 1 ? '' : 's'}.` });
  const quit = recent.flatMap((s) => s.blocks).filter((b) => !b.metrics.completed).length;
  if (quit >= 2) alerts.push({ tone: 'info', text: `Stopped ${quit} games before the end.` });
  for (const t of trends) {
    if (t.delta !== null && t.delta <= -0.1) alerts.push({ tone: 'info', text: `${TRAIN_BY_ID[t.taskId].title} dropped ${Math.round(-t.delta * 100)}%.` });
  }
  if (child.homePlan) {
    const target = Math.round((child.homePlan.daysPerWeek * Math.min(days, 7)) / 7);
    const done = new Set(recentHome.map((s) => new Date(s.startedAt).toDateString())).size;
    if (target > 0 && done < target) alerts.push({ tone: 'info', text: `Home plan: ${done} of ${target} days done.` });
  }

  return {
    lastVisit,
    since,
    days,
    week,
    homeDays: new Set(recentHome.map((s) => new Date(s.startedAt).toDateString())).size,
    homeMinutes: Math.round(recentHome.reduce((t, s) => t + s.activeSec, 0) / 60),
    lastPractised,
    feelings,
    lowFeelings,
    parentNotes,
    unread,
    trends,
    builders,
    alerts,
  };
}

export type PlanPick = PlanGame & { why: string };

/** 3–4 games for today: dropped skills first, then the profile's focus games, then custom activities. */
export function suggestPlan(child: Child, brief: Briefing, calm: boolean, size = 3): PlanPick[] {
  const picks: PlanPick[] = [];
  const add = (taskId: TrainTaskId, why: string, customId?: string) => {
    if (picks.length < size && !picks.some((p) => p.taskId === taskId) && child.tasks[taskId]?.enabled !== false) picks.push({ taskId, customId, why });
  };
  for (const t of brief.trends) if (t.delta !== null && t.delta <= -0.05) add(t.taskId, `Dropped ${Math.round(-t.delta * 100)}% since last visit`);
  const goalGames = brief.lastVisit?.plan.map((p) => p.taskId).filter(isTrain) ?? [];
  if (brief.lastVisit?.nextGoal && goalGames[0]) add(goalGames[0], 'Linked to the goal from last visit');
  for (const id of personalize(child, calm).suggestions.find((s) => s.games)?.games ?? []) add(id, 'Suggested for the learning profile');
  for (const a of child.customActivities ?? []) if (!a.studio && isTrain(a.taskId)) add(a.taskId, 'Your custom activity', a.id);
  for (const t of [...brief.trends].sort((a, b) => a.now - b.now)) add(t.taskId, `Lowest recent accuracy (${Math.round(t.now * 100)}%)`);
  for (const id of TRAIN_IDS) add(id, 'Keeps practice varied');
  return picks;
}

/** One step easier (-1) or harder (+1) on the game's own difficulty dimension. */
export function nudgeParams(taskId: TrainTaskId, params: Params, delta: -1 | 1): Params {
  const dim = TRAIN_BY_ID[taskId].adapts;
  const steps = DIM_STEPS[dim].filter((v) => !(dim === 'memoryLoad' && v > MAX_SEQUENCE));
  let i = 0;
  for (let k = 0; k < steps.length; k++) if (steps[k] <= params[dim]) i = k;
  const next = steps[Math.max(0, Math.min(steps.length - 1, i + delta))];
  return { ...params, [dim]: next };
}

export const levelOf = (taskId: TrainTaskId, params: Params) => taskLevel(trainTaskDef(taskId), params);
export const minutesOf = (taskId: TrainTaskId, params: Params) => gameDurationSec(taskId, params) / 60;

/** Goal ideas for today, built from the planned games. */
export function goalIdeas(plan: PlanGame[], child: Child): string[] {
  const ideas: string[] = [];
  for (const p of plan.slice(0, 3)) {
    if (!isTrain(p.taskId)) continue;
    const g = TRAIN_BY_ID[p.taskId];
    switch (p.taskId) {
      case 'goNoGo':
        ideas.push('Hold back on red 8 out of 10 times');
        break;
      case 'memoryEcho':
      case 'memoryMatrix':
        ideas.push(`Remember ${child.tasks[p.taskId]?.params.memoryLoad ?? 3} items without a prompt`);
        break;
      case 'starWatch':
        ideas.push('Stay with Tap the Stars for the full round');
        break;
      default:
        ideas.push(`Reach 80% on ${g.title}`);
    }
  }
  ideas.push('Finish every game without a break');
  return [...new Set(ideas)].slice(0, 4);
}

export type VisitGame = {
  key: string;
  /** Train task id or `library-<family>`, matching observation `taskId`s. */
  taskId: string;
  family?: LibraryFamilyId;
  accuracy: number | null;
  detail: string;
  activeSec: number;
};
export type VisitSummary = {
  games: VisitGame[];
  /** Total time played, in seconds. */
  seconds: number;
  minutes: number;
  avgAccuracy: number | null;
  tagCounts: { tag: ClinicTag; count: number }[];
};

export function summarizeVisit(visit: ClinicVisit, sessions: Session[], libraryPlays: LibraryPlay[] = []): VisitSummary {
  const played = visit.sessionIds.map((id) => sessions.find((s) => s.id === id)).filter((s): s is Session => !!s);
  const focus: VisitGame[] = played.flatMap((session) =>
    session.blocks
      .filter((b) => isTrain(b.taskId))
      .map((b, i) => ({
        key: `${session.id}-${i}`,
        taskId: b.taskId,
        accuracy: b.accuracy,
        detail: `Level ${b.levelBefore}${b.levelAfter !== b.levelBefore ? ` → ${b.levelAfter}` : ''}`,
        activeSec: session.activeSec,
        at: session.startedAt,
      })),
  );
  const builders: VisitGame[] = (visit.libraryPlayIds ?? [])
    .map((id) => libraryPlays.find((p) => p.id === id))
    .filter((p): p is LibraryPlay => !!p && isLibraryFamily(p.family))
    .map((p) => ({ key: p.id, taskId: `library-${p.family}`, family: p.family as LibraryFamilyId, accuracy: p.accuracy, detail: `${LEVEL_NAMES[p.level - 1] ?? ''} · ${'⭐'.repeat(p.stars)}`, activeSec: p.activeSec, at: p.playedAt }));
  const games = [...focus, ...builders].sort((a: any, b: any) => String(a.at).localeCompare(String(b.at)));
  const accs = games.map((g) => g.accuracy).filter((a): a is number => a !== null);
  const tagCounts = CLINIC_TAGS.map((t) => ({ tag: t.id, count: visit.observations.filter((o) => o.tag === t.id).length })).filter((t) => t.count > 0);
  const seconds = Math.round(games.reduce((t, g) => t + g.activeSec, 0));
  return { games, seconds, minutes: Math.round(seconds / 60), avgAccuracy: mean(accs), tagCounts };
}

/** "40 sec", "3 min" or "1 h 5 min". */
export function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.max(0, Math.round(sec))} sec`;
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
