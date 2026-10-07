import { dateLocale, t } from '../i18n';
/**
 * Insights for the therapist: who needs attention, what is improving, and how practice,
 * mood, home plans and clinic goals are going — for a time range and one child or all.
 * Pure TypeScript so it can be tested. These are practice summaries, not clinical measures.
 */
import { FAMILY, isLibraryFamily, type LibraryFamilyId } from '../library/catalog';
import type { Child, ClinicTag, ClinicVisit, Domain, Feeling, KidCheckIn, LibraryPlay, Session } from '../types';
import { CLINIC_TAGS } from './clinic';
import { DOMAIN_LABEL, SCORED_DOMAINS, TASKS } from './tasks';
import { TRAIN_BY_ID, isTrainTask } from './trainTasks';

export type Range = 'week' | 'month' | 'quarter';
export const RANGE_DAYS: Record<Range, number> = { week: 7, month: 28, quarter: 91 };
export const RANGE_LABEL: Record<Range, string> = { week: 'This week', month: '4 weeks', quarter: '3 months' };

const DAY = 86_400_000;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const dayKey = (iso: string | number | Date) => new Date(iso).toDateString();
const first = (name: string) => name.split(' ')[0];

export type InsightData = { children: Child[]; sessions: Session[]; libraryPlays: LibraryPlay[]; checkIns: KidCheckIn[]; visits: ClinicVisit[] };

export type AlertTone = 'red' | 'amber' | 'green';
export type InsightAlert = { id: string; tone: AlertTone; childId: string; title: string; detail: string };

export type Bloom = { score: number; label: string; emoji: string; accuracy: number | null; consistency: number; mood: number };

export type ChildRow = {
  child: Child;
  practiceDays: number;
  minutes: number;
  accuracy: number | null;
  trend: number | null;
  level: number;
  levelUps: number;
  streak: number;
  lastVisit?: ClinicVisit;
  bloom: Bloom;
  planned: number;
  done: number;
};

export type Highlight = { id: string; emoji: string; title: string; value: string; detail: string; colors: [string, string]; childId?: string };

export type Insights = {
  from: number;
  to: number;
  kpis: { sessions: number; minutes: number; accuracy: number | null; prevAccuracy: number | null; practiceDays: number; levelUps: number; goalsMet: number; visits: number };
  alerts: InsightAlert[];
  rows: ChildRow[];
  highlights: Highlight[];
  /** One series per child: accuracy per bucket (null when nothing was played). */
  series: { childId: string; name: string; color: string; points: (number | null)[] }[];
  bucketLabels: string[];
  skills: { domain: Domain; label: string; now: number | null; prev: number | null }[];
  /** Last 35 days, oldest first: minutes played each day. */
  calendar: { date: string; minutes: number }[];
  mood: { counts: { feeling: Feeling; count: number }[]; lowDay: string | null; low: number; total: number };
  builders: { family: LibraryFamilyId; name: string; plays: number; stars: number | null; hard: number }[];
  clinic: { childId: string; name: string; ratings: { date: string; value: number }[]; met: number; partly: number; notYet: number }[];
  tags: { tag: ClinicTag; label: string; emoji: string; tone: 'good' | 'watch'; count: number }[];
  decisions: { childId: string; name: string; at: string; text: string; why: string; up: boolean }[];
};

const LOW: Feeling[] = ['tired', 'worried', 'grumpy'];
const WEEKDAY = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

function streakOf(dates: Set<string>, now: Date): number {
  let n = 0;
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // Today not done yet doesn't break the streak.
  if (!dates.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (dates.has(d.toDateString())) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function bloomOf(accuracy: number | null, consistency: number, mood: number): Bloom {
  const score = Math.round(100 * (0.4 * (accuracy ?? 0.5) + 0.35 * Math.min(1, consistency) + 0.25 * mood));
  const [label, emoji] = score >= 75 ? ['Blooming', '🌸'] : score >= 50 ? ['Growing', '🌿'] : ['Needs care', '🌱'];
  return { score, label, emoji, accuracy, consistency, mood };
}

export type AlertRules = { gapDays: number; dropPct: number };

export function buildInsights(data: InsightData, range: Range, childId: string | null, now = new Date(), rules: AlertRules = { gapDays: 4, dropPct: 10 }): Insights {
  const days = RANGE_DAYS[range];
  const to = now.getTime();
  const from = to - days * DAY;
  const prevFrom = from - days * DAY;
  const kids = childId ? data.children.filter((c) => c.id === childId) : data.children;
  const ids = new Set(kids.map((c) => c.id));
  const inRange = (iso: string, a = from, b = to) => {
    const t = Date.parse(iso);
    return t >= a && t <= b;
  };
  const sess = data.sessions.filter((s) => ids.has(s.childId));
  const now$ = sess.filter((s) => inRange(s.startedAt));
  const prev$ = sess.filter((s) => inRange(s.startedAt, prevFrom, from));
  const accs = (xs: Session[]) => xs.flatMap((s) => s.blocks.map((b) => b.accuracy).filter((a): a is number => a !== null));
  const plays = data.libraryPlays.filter((p) => ids.has(p.childId) && inRange(p.playedAt));
  const feels = data.checkIns.filter((k) => ids.has(k.childId) && inRange(k.at));
  const visits = data.visits.filter((v) => ids.has(v.childId) && v.status === 'done' && inRange(v.startedAt));

  // ---- Per child ----
  const rows: ChildRow[] = kids.map((c) => {
    const mine = sess.filter((s) => s.childId === c.id);
    const cur = mine.filter((s) => inRange(s.startedAt));
    const prev = mine.filter((s) => inRange(s.startedAt, prevFrom, from));
    const myPlays = plays.filter((p) => p.childId === c.id);
    const home = new Set([...cur.filter((s) => s.by === 'parent').map((s) => dayKey(s.startedAt)), ...myPlays.map((p) => dayKey(p.playedAt))]);
    const allDays = new Set([...mine.map((s) => dayKey(s.startedAt)), ...data.libraryPlays.filter((p) => p.childId === c.id).map((p) => dayKey(p.playedAt))]);
    const a = mean(accs(cur));
    const pa = mean(accs(prev));
    const perWeek = c.homePlan?.daysPerWeek ?? (c.homeSessionsPerWeek || 3);
    // Only count the days since the child joined.
    const activeDays = Math.max(1, Math.min(days, Math.ceil((to - Math.max(from, Date.parse(c.createdAt))) / DAY)));
    const planned = Math.max(1, Math.round((perWeek * activeDays) / 7));
    const myFeels = feels.filter((k) => k.childId === c.id);
    const mood = myFeels.length ? myFeels.filter((k) => !LOW.includes(k.feeling)).length / myFeels.length : 0.7;
    const levelUps = cur.reduce((n, s) => n + s.blocks.filter((b) => b.levelAfter > b.levelBefore).length, 0);
    const scored = Object.values(c.tasks).length ? Math.max(...cur.flatMap((s) => s.blocks.map((b) => b.levelAfter)), 1) : 1;
    const lastVisit = data.visits.filter((v) => v.childId === c.id && v.status === 'done').sort((x, y) => y.startedAt.localeCompare(x.startedAt))[0];
    return {
      child: c,
      practiceDays: home.size,
      minutes: Math.round((cur.reduce((t, s) => t + s.activeSec, 0) + myPlays.reduce((t, p) => t + p.activeSec, 0)) / 60),
      accuracy: a,
      trend: a !== null && pa !== null ? a - pa : null,
      level: scored,
      levelUps,
      streak: streakOf(allDays, now),
      lastVisit,
      bloom: bloomOf(a, home.size / planned, mood),
      planned,
      done: Math.min(home.size, planned),
    };
  });

  // ---- KPIs ----
  const kpis = {
    sessions: now$.length + plays.length,
    minutes: rows.reduce((t, r) => t + r.minutes, 0),
    accuracy: mean(accs(now$)),
    prevAccuracy: mean(accs(prev$)),
    practiceDays: new Set([...now$.map((s) => dayKey(s.startedAt)), ...plays.map((p) => dayKey(p.playedAt))]).size,
    levelUps: rows.reduce((t, r) => t + r.levelUps, 0),
    goalsMet: visits.filter((v) => v.goalResult === 'met').length,
    visits: visits.length,
  };

  // ---- Needs attention ----
  const alerts: InsightAlert[] = [];
  for (const r of rows) {
    const c = r.child;
    const name = first(c.name);
    const lastHome = sess.filter((s) => s.childId === c.id && s.by === 'parent').reduce((t, s) => Math.max(t, Date.parse(s.startedAt)), 0);
    const gap = lastHome ? Math.floor((to - lastHome) / DAY) : null;
    if (gap === null || gap >= rules.gapDays) alerts.push({ id: `gap-${c.id}`, tone: 'red', childId: c.id, title: `${name}: no home practice ${gap === null ? 'yet' : `for ${gap} days`}`, detail: 'A quick message to the family can help restart the routine.' });
    if (r.planned >= 2 && r.done / r.planned < 0.5) alerts.push({ id: `plan-${c.id}`, tone: 'amber', childId: c.id, title: `${name}: home plan ${r.done} of ${r.planned} days`, detail: 'Below half of the plan — maybe shorten or move the days.' });
    // Skills that dropped.
    for (const d of SCORED_DOMAINS) {
      const pick = (xs: Session[]) => mean(xs.filter((s) => s.childId === c.id).flatMap((s) => s.blocks.filter((b) => TASKS[b.taskId]?.domain === d && b.accuracy !== null).map((b) => b.accuracy as number)));
      const n = pick(now$);
      const p = pick(prev$);
      if (n !== null && p !== null && n - p <= -rules.dropPct / 100) alerts.push({ id: `drop-${c.id}-${d}`, tone: 'amber', childId: c.id, title: `${name}: ${DOMAIN_LABEL[d].toLowerCase()} down ${Math.round((p - n) * 100)}%`, detail: `${Math.round(p * 100)}% → ${Math.round(n * 100)}% compared with the period before.` });
    }
    const lows = feels.filter((k) => k.childId === c.id && LOW.includes(k.feeling));
    if (lows.length >= 2) {
      const top = ['worried', 'tired', 'grumpy'].map((f) => ({ f, n: lows.filter((k) => k.feeling === f).length })).sort((a, b) => b.n - a.n)[0];
      alerts.push({ id: `mood-${c.id}`, tone: 'amber', childId: c.id, title: `${name}: felt ${top.f} ${top.n}×`, detail: `${lows.length} low check-ins in this period.` });
    }
    const hard = plays.filter((p) => p.childId === c.id && (p.parentRating === 'hard' || p.stars <= 1));
    if (hard.length >= 2) {
      const fam = hard[0].family;
      alerts.push({ id: `hard-${c.id}`, tone: 'amber', childId: c.id, title: `${name}: Skill Builders felt hard ${hard.length}×`, detail: isLibraryFamily(fam) ? `Mostly ${FAMILY[fam].name}. Try an easier level.` : 'Try an easier level.' });
    }
    const due = r.lastVisit?.nextVisit;
    if (due && Date.parse(`${due}T23:59:59`) < to && !data.visits.some((v) => v.childId === c.id && v.startedAt > (r.lastVisit?.startedAt ?? ''))) {
      alerts.push({ id: `visit-${c.id}`, tone: 'amber', childId: c.id, title: `${name}: clinic visit overdue`, detail: `Planned for ${new Date(due).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' })}.` });
    }
    if (r.levelUps > 0) alerts.push({ id: `up-${c.id}`, tone: 'green', childId: c.id, title: `${name}: ${r.levelUps} level-up${r.levelUps === 1 ? '' : 's'}`, detail: 'Games got harder because accuracy stayed high.' });
    if (r.trend !== null && r.trend >= 0.08) alerts.push({ id: `trend-${c.id}`, tone: 'green', childId: c.id, title: `${name}: accuracy up ${Math.round(r.trend * 100)}%`, detail: 'Compared with the period before.' });
  }
  const order: Record<AlertTone, number> = { red: 0, amber: 1, green: 2 };
  alerts.sort((a, b) => order[a.tone] - order[b.tone]);

  // ---- Highlights (the fun, swipeable cards) ----
  const highlights: Highlight[] = [];
  const best = <T,>(xs: T[], f: (x: T) => number | null) => xs.filter((x) => f(x) !== null).sort((a, b) => (f(b) as number) - (f(a) as number))[0];
  const climber = best(rows, (r) => r.trend);
  if (climber && (climber.trend ?? 0) > 0) highlights.push({ id: 'climber', emoji: '🚀', title: 'Biggest climber', value: `+${Math.round((climber.trend ?? 0) * 100)}%`, detail: `${first(climber.child.name)}’s accuracy`, colors: ['#7A5AE0', '#B59CFF'], childId: climber.child.id });
  const streaker = best(rows, (r) => r.streak);
  if (streaker && streaker.streak > 1) highlights.push({ id: 'streak', emoji: '🔥', title: 'Streak champion', value: `${streaker.streak} days`, detail: `${first(streaker.child.name)} in a row`, colors: ['#F28C28', '#FFC46B'], childId: streaker.child.id });
  const leveller = best(rows, (r) => r.levelUps);
  if (leveller && leveller.levelUps > 0) highlights.push({ id: 'level', emoji: '⭐', title: 'Level-up star', value: `${leveller.levelUps}×`, detail: `${first(leveller.child.name)} moved up`, colors: ['#2E9E6B', '#7DD3A0'], childId: leveller.child.id });
  const steady = best(rows, (r) => r.practiceDays);
  if (steady && steady.practiceDays > 0) highlights.push({ id: 'steady', emoji: '📅', title: 'Most consistent', value: `${steady.practiceDays} days`, detail: `${first(steady.child.name)} practised`, colors: ['#2A7FD4', '#7FC0F2'], childId: steady.child.id });
  const favCounts = new Map<string, number>();
  for (const s of now$) for (const b of s.blocks) favCounts.set(b.taskId, (favCounts.get(b.taskId) ?? 0) + 1);
  for (const p of plays) favCounts.set(`library-${p.family}`, (favCounts.get(`library-${p.family}`) ?? 0) + 1);
  const fav = [...favCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (fav) {
    const id = fav[0];
    const lib = id.startsWith('library-') ? id.slice(8) : '';
    const name = isLibraryFamily(lib) ? FAMILY[lib].name : isTrainTask(id as any) ? TRAIN_BY_ID[id as keyof typeof TRAIN_BY_ID].title : TASKS[id as keyof typeof TASKS]?.name ?? 'A game';
    highlights.push({ id: 'fav', emoji: '❤️', title: 'Favourite game', value: name, detail: `played ${fav[1]}×`, colors: ['#D63C7E', '#FF9CC7'] });
  }
  if (kpis.minutes > 0) highlights.push({ id: 'time', emoji: '⏱️', title: 'Focus time', value: kpis.minutes >= 60 ? `${Math.floor(kpis.minutes / 60)}h ${kpis.minutes % 60}m` : `${kpis.minutes} min`, detail: `across ${kpis.sessions} sessions`, colors: ['#1F9AA8', '#7FDCE4'] });

  // ---- Accuracy over time ----
  const buckets = range === 'week' ? 7 : range === 'month' ? 4 : 13;
  const size = (days * DAY) / buckets;
  const bucketLabels = Array.from({ length: buckets }, (_, i) => {
    const t = new Date(from + i * size);
    return range === 'week' ? t.toLocaleDateString(dateLocale(), { weekday: 'narrow' }) : t.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' });
  });
  const series = kids.map((c) => ({
    childId: c.id,
    name: first(c.name),
    color: c.color,
    points: Array.from({ length: buckets }, (_, i) => mean(accs(sess.filter((s) => s.childId === c.id && inRange(s.startedAt, from + i * size, from + (i + 1) * size))))),
  }));

  // ---- Skill map (now vs before) ----
  const dom = (xs: Session[], d: Domain) => mean(xs.flatMap((s) => s.blocks.filter((b) => TASKS[b.taskId]?.domain === d && b.accuracy !== null).map((b) => b.accuracy as number)));
  const skills = SCORED_DOMAINS.map((d) => ({ domain: d, label: DOMAIN_LABEL[d], now: dom(now$, d), prev: dom(prev$, d) }));

  // ---- Calendar (always the last 5 weeks) ----
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const calendar = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(today.getTime() - (34 - i) * DAY);
    const key = d.toDateString();
    const sec = sess.filter((s) => dayKey(s.startedAt) === key).reduce((t, s) => t + s.activeSec, 0) + data.libraryPlays.filter((p) => ids.has(p.childId) && dayKey(p.playedAt) === key).reduce((t, p) => t + p.activeSec, 0);
    return { date: d.toISOString(), minutes: Math.round(sec / 60) };
  });

  // ---- Mood ----
  const counts = (['happy', 'calm', 'excited', 'tired', 'worried', 'grumpy'] as Feeling[]).map((f) => ({ feeling: f, count: feels.filter((k) => k.feeling === f).length }));
  const lowByDay = Array(7).fill(0);
  for (const k of feels) if (LOW.includes(k.feeling)) lowByDay[new Date(k.at).getDay()]++;
  const maxLow = Math.max(...lowByDay);
  const low = feels.filter((k) => LOW.includes(k.feeling)).length;

  // ---- Skill Builders ----
  const fams = new Map<LibraryFamilyId, LibraryPlay[]>();
  for (const p of plays) if (isLibraryFamily(p.family)) fams.set(p.family, [...(fams.get(p.family) ?? []), p]);
  const builders = [...fams.entries()]
    .map(([family, ps]) => ({ family, name: FAMILY[family].name, plays: ps.length, stars: mean(ps.map((p) => p.stars)), hard: ps.filter((p) => p.parentRating === 'hard' || p.stars <= 1).length }))
    .sort((a, b) => b.plays - a.plays);

  // ---- Clinic ----
  const clinic = kids
    .map((c) => {
      const vs = data.visits.filter((v) => v.childId === c.id && v.status === 'done').sort((a, b) => a.startedAt.localeCompare(b.startedAt)).slice(-6);
      return {
        childId: c.id,
        name: first(c.name),
        ratings: vs.filter((v) => v.ratings).map((v) => ({ date: v.startedAt, value: ((v.ratings!.attention + v.ratings!.engagement + v.ratings!.calm) / 3) })),
        met: vs.filter((v) => v.goalResult === 'met').length,
        partly: vs.filter((v) => v.goalResult === 'partly').length,
        notYet: vs.filter((v) => v.goalResult === 'notYet').length,
      };
    })
    .filter((x) => x.ratings.length || x.met + x.partly + x.notYet);
  const tagList = data.visits.filter((v) => ids.has(v.childId)).flatMap((v) => v.observations);
  const tags = CLINIC_TAGS.map((t) => ({ tag: t.id, label: t.label, emoji: t.emoji, tone: t.tone, count: tagList.filter((o) => o.tag === t.id).length })).filter((t) => t.count > 0);

  // ---- Engine decisions, in plain words ----
  const decisions = [...now$]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .flatMap((s) =>
      s.blocks
        .filter((b) => b.levelAfter !== b.levelBefore)
        .map((b) => {
          const c = data.children.find((x) => x.id === s.childId);
          const game = isTrainTask(b.taskId) ? TRAIN_BY_ID[b.taskId].title : TASKS[b.taskId]?.name ?? 'a game';
          const up = b.levelAfter > b.levelBefore;
          const acc = b.accuracy !== null ? `${Math.round(b.accuracy * 100)}% right` : 'a steady round';
          return {
            childId: s.childId,
            name: c ? first(c.name) : 'Child',
            at: s.startedAt,
            up,
            text: `${up ? 'Made' : 'Eased'} ${game} ${up ? 'harder' : 'easier'} · level ${b.levelBefore} → ${b.levelAfter}`,
            why: up ? `Because ${c ? first(c.name) : 'the child'} got ${acc} two rounds in a row.` : `Because ${c ? first(c.name) : 'the child'} found it tricky (${acc}) — keeping it fun.`,
          };
        }),
    );

  return {
    from,
    to,
    kpis,
    alerts,
    rows,
    highlights,
    series,
    bucketLabels,
    skills,
    calendar,
    mood: { counts, lowDay: maxLow >= 2 ? WEEKDAY[lowByDay.indexOf(maxLow)] : null, low, total: feels.length },
    builders,
    clinic,
    tags,
    decisions,
  };
}
