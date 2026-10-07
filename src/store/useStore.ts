import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { avatarColors } from '../theme';
import { MIN_MINUTES } from '../engine/scheduler';
import { nextLevel } from '../engine/studio';
import { nextLibraryLevel } from '../library/catalog';
import type { Child, LibraryPlay, LibraryVersion, ClinicObservation, ClinicVisit, CustomActivity, Dim, Feeling, KidCheckIn, StudioPlay, Domain, Note, NoteAttachment, NoteCard, NoteDetails, Reminder, Role, Session, TaskId, TaskState } from '../types';
import { generateTrainHistory } from '../engine/demo';
import { addDemoHeroes, addDemoNames, demoCheckIns, demoVisits, addDemoStudioGames, upgradeSavedHeroes, buildSeed, enrichDemo, makeFamilyCode, makeTasks, uid, addDemoMonthPlan } from './seed';

import { DEFAULT_SETTINGS, type AppSettings } from './settings';
import { checkRemove, defaultTeam, makeMember, type Team, type TeamMember, type TeamRole } from '../engine/team';

/** Storage key for the persisted store (localStorage on web). */
const STORE_KEY = 'bloom-focus-v1';

type NewChild = { name: string; age: number; focus: Domain; sessionMinutes: number };

type State = {
  role: Role | null;
  userName: string;
  /** Name of the child's therapist — surfaced in the parent UX. */
  therapistDisplayName: string | null;
  /** The child a parent account is linked to. */
  parentChildId: string | null;
  children: Child[];
  sessions: Session[];
  notes: Note[];
  /** Parent's daily home-practice reminder (local notification). */
  reminder: Reminder;
  /** 4-digit code that locks the parent's Progress and Profile tabs; null = no lock. */
  parentPin: string | null;
  /** Game sound effects. */
  soundOn: boolean;
  /** Gentler games: softer feedback, slower pace, no warning buzz. */
  calmMode: boolean;
  /** Games whose practice round has been played on this device. */
  practiced: TaskId[];
  /** Plays of therapist-made Game Studio games (kept apart from the adaptive engine's sessions). */
  studioPlays: StudioPlay[];
  /** Feelings the child picked in the start flow (newest last). */
  kidCheckIns: KidCheckIn[];
  /** Goes at Activity Library activities (app games and parent-marked paper work). */
  libraryPlays: LibraryPlay[];
  /** The therapist's saved versions of Skill Builders. */
  libraryVersions: LibraryVersion[];
  /** Settings page (account, notifications, appearance, defaults…). */
  settings: AppSettings;
  /** Fun Zone time used today, for the daily limit. */
  funTime: { day: string; sec: number };
  /** In-clinic sessions run by the therapist. */
  clinicVisits: ClinicVisit[];
  /** When each role last opened Notifications on this device (newer items are unread). */
  notifSeen: Partial<Record<Role, string>>;
  /** Live-server mode: messages pushed to this user while the app is open (feeds notifications). */
  inbox: Note[];
  /** Clinic team (therapist side): who works here and which children each person sees. */
  team: Team | null;

  signIn: (role: Role, userName: string, parentChildId?: string | null) => void;
  addMember: (name: string, role: TeamRole, childIds: string[]) => void;
  updateMember: (id: string, patch: Partial<Omit<TeamMember, 'id'>>) => void;
  removeMember: (id: string) => void;
  /** Act as another team member on this device (demo of separate logins). */
  switchMember: (id: string) => void;
  signOut: () => void;
  addChild: (c: NewChild) => string;
  updateChild: (id: string, patch: Partial<Omit<Child, 'id' | 'tasks'>>) => void;
  /** Adds or replaces a therapist-built activity (matched by id). */
  saveCustomActivity: (childId: string, activity: CustomActivity) => void;
  removeCustomActivity: (childId: string, activityId: string) => void;
  /** Records a studio game play and, when auto-adjust is on, moves that game's level. */
  recordStudioPlay: (play: StudioPlay) => { levelChange: -1 | 0 | 1 };
  removeChild: (id: string) => void;
  setTaskEnabled: (childId: string, taskId: TaskId, enabled: boolean) => void;
  setTaskParam: (childId: string, taskId: TaskId, dim: Dim | 'reinforceEvery', value: number) => void;
  toggleLock: (childId: string, taskId: TaskId, dim: Dim) => void;
  recordSession: (
    session: Session,
    taskStates: Partial<Record<TaskId, TaskState>>,
    childPatch?: Partial<Omit<Child, 'id' | 'tasks'>>,
  ) => void;
  setReminder: (r: Reminder) => void;
  setParentPin: (pin: string | null) => void;
  setPrefs: (p: Partial<Pick<State, 'soundOn' | 'calmMode'>>) => void;
  markPracticed: (id: TaskId) => void;
  addNote: (
    childId: string,
    from: Role,
    text: string,
    extra?: { attachments?: NoteAttachment[]; details?: NoteDetails; card?: NoteCard },
  ) => void;
  /** Demo mode: the reader opened the conversation, so the other side's messages become read. */
  markNotesRead: (childId: string, reader: Role) => void;
  addKidCheckIn: (childId: string, feeling: Feeling) => void;
  /** Adds or replaces a clinic visit (matched by id). */
  saveVisit: (visit: ClinicVisit) => void;
  markNotificationsSeen: (role: Role) => void;
  /** Records a library play and, when auto-level is on, moves that activity's level. */
  recordLibraryPlay: (play: LibraryPlay) => { levelChange: -1 | 0 | 1 };
  saveLibraryVersion: (v: LibraryVersion) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  addFunTime: (sec: number) => void;
  removeLibraryVersion: (id: string) => void;
  addInboxNote: (note: Note) => void;
  addVisitObservation: (visitId: string, obs: Omit<ClinicObservation, 'id' | 'at'>) => void;
  addVisitSession: (visitId: string, sessionId: string) => void;
  addVisitLibraryPlay: (visitId: string, playId: string) => void;
  setTherapistDisplayName: (name: string | null) => void;
  resetDemo: () => void;
};

/** The sample data plus a past clinic visit and a week of feelings check-ins. */
const withDemoExtras = (seed: ReturnType<typeof buildSeed>) => ({
  ...seed,
  clinicVisits: demoVisits(seed.children),
  kidCheckIns: demoCheckIns(seed.children),
});

const mapChild = (children: Child[], id: string, fn: (c: Child) => Child) =>
  children.map((c) => (c.id === id ? fn(c) : c));

const mapTask = (c: Child, taskId: TaskId, fn: (t: TaskState) => TaskState): Child => ({
  ...c,
  tasks: { ...c.tasks, [taskId]: fn(c.tasks[taskId]) },
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      role: null,
      userName: '',
      therapistDisplayName: null,
      parentChildId: null,
      reminder: { enabled: false, hour: 17 },
      parentPin: null,
      soundOn: true,
      calmMode: false,
      practiced: [],
      studioPlays: [],
      ...withDemoExtras(buildSeed()),
      notifSeen: {},
      inbox: [],
      libraryPlays: [],
      libraryVersions: [],
      settings: DEFAULT_SETTINGS,
      funTime: { day: '', sec: 0 },
      team: null,

      signIn: (role, userName, parentChildId = null) => {
        const name = userName.trim();
        const team = role === 'therapist' ? get().team ?? defaultTeam(name, get().children) : get().team;
        set({
          role,
          userName,
          parentChildId,
          team,
          // Remember who is who so each side sees real names in Messages.
          children: name
            ? get().children.map((c) =>
                role === 'therapist' ? { ...c, therapistName: name } : c.id === parentChildId ? { ...c, parentName: name } : c,
              )
            : get().children,
        });
      },
      addMember: (name, role, childIds) => {
        const team = get().team ?? defaultTeam(get().userName, get().children);
        set({ team: { ...team, members: [...team.members, makeMember(name, role, childIds, team.members.length, uid())] } });
      },
      updateMember: (id, patch) => {
        const team = get().team;
        if (!team) return;
        const members = team.members.map((m) => (m.id === id ? { ...m, ...patch } : m));
        set({ team: { ...team, members }, ...(id === team.activeId && patch.name ? { userName: patch.name } : {}) });
      },
      removeMember: (id) => {
        const team = get().team;
        if (!team || checkRemove(team, id)) return;
        const members = team.members.filter((m) => m.id !== id);
        const activeId = team.activeId === id ? members[0].id : team.activeId;
        set({ team: { members, activeId }, userName: members.find((m) => m.id === activeId)!.name });
      },
      switchMember: (id) => {
        const team = get().team;
        const m = team?.members.find((x) => x.id === id);
        if (!team || !m) return;
        set({ team: { ...team, activeId: id }, userName: m.name });
      },
      signOut: () => set({ role: null, parentChildId: null, therapistDisplayName: null }),
      setTherapistDisplayName: (therapistDisplayName) => set({ therapistDisplayName }),

      addChild: (c) => {
        const id = uid();
        const child: Child = {
          id,
          name: c.name.trim(),
          age: c.age,
          focus: c.focus,
          color: avatarColors[get().children.length % avatarColors.length],
          createdAt: new Date().toISOString(),
          sessionMinutes: c.sessionMinutes,
          currentMinutes: Math.min(MIN_MINUTES, c.sessionMinutes),
          baselineAt: null,
          familyCode: makeFamilyCode(get().children.map((x) => x.familyCode)),
          rewardTheme: 'stars',
          homeSessionsPerWeek: get().settings.defaultHomeDays,
          homeNote: '',
          tasks: makeTasks(c.age, c.focus),
          iqScore: null,
          cognitiveAge: null,
          diagnosis: [],
          favouriteCharacters: [],
          interests: [],
          sensory: {},
          communicationStyle: 'verbal',
          supportNeeds: [],
        };
        // The person who adds a child works with them.
        const team = get().team;
        set({
          children: [...get().children, child],
          ...(team ? { team: { ...team, members: team.members.map((m) => (m.id === team.activeId ? { ...m, childIds: [...m.childIds, id] } : m)) } } : {}),
        });
        return id;
      },
      saveCustomActivity: (childId, activity) =>
        set({
          children: mapChild(get().children, childId, (c) => {
            const list = c.customActivities ?? [];
            const exists = list.some((a) => a.id === activity.id);
            return { ...c, customActivities: exists ? list.map((a) => (a.id === activity.id ? activity : a)) : [...list, activity] };
          }),
        }),
      recordStudioPlay: (play) => {
        let levelChange: -1 | 0 | 1 = 0;
        set({
          studioPlays: [...get().studioPlays, play],
          children: mapChild(get().children, play.childId, (c) => ({
            ...c,
            customActivities: (c.customActivities ?? []).map((a) => {
              if (a.id !== play.activityId || !a.studio) return a;
              const next = nextLevel(a.studio, play.stars);
              levelChange = next.changed;
              return { ...a, studio: { ...a.studio, level: next.level, streak: next.streak } };
            }),
          })),
        });
        return { levelChange };
      },
      removeCustomActivity: (childId, activityId) =>
        set({
          children: mapChild(get().children, childId, (c) => ({
            ...c,
            customActivities: (c.customActivities ?? []).filter((a) => a.id !== activityId),
          })),
        }),
      updateChild: (id, patch) =>
        set({
          children: mapChild(get().children, id, (c) => ({
            ...c,
            ...patch,
            // A changed home program note becomes a fresh notification for the family.
            ...(patch.homeNote !== undefined && patch.homeNote.trim() !== (c.homeNote ?? '').trim() ? { homeNoteAt: new Date().toISOString() } : {}),
          })),
        }),
      removeChild: (id) =>
        set({
          children: get().children.filter((c) => c.id !== id),
          sessions: get().sessions.filter((s) => s.childId !== id),
          notes: get().notes.filter((n) => n.childId !== id),
          parentChildId: get().parentChildId === id ? null : get().parentChildId,
        }),
      setTaskEnabled: (childId, taskId, enabled) =>
        set({
          children: mapChild(get().children, childId, (c) => mapTask(c, taskId, (t) => ({ ...t, enabled }))),
        }),
      setTaskParam: (childId, taskId, dim, value) =>
        set({
          children: mapChild(get().children, childId, (c) =>
            mapTask(c, taskId, (t) => ({ ...t, streak: 0, params: { ...t.params, [dim]: value } })),
          ),
        }),
      toggleLock: (childId, taskId, dim) =>
        set({
          children: mapChild(get().children, childId, (c) =>
            mapTask(c, taskId, (t) => ({
              ...t,
              locked: t.locked.includes(dim) ? t.locked.filter((d) => d !== dim) : [...t.locked, dim],
            })),
          ),
        }),
      recordSession: (session, taskStates, childPatch) =>
        set({
          sessions: [...get().sessions, session],
          children: mapChild(get().children, session.childId, (c) => ({
            ...c,
            ...childPatch,
            tasks: { ...c.tasks, ...taskStates },
          })),
        }),
      setReminder: (reminder) => set({ reminder }),
      setParentPin: (parentPin) => set({ parentPin }),
      setPrefs: (p) => set(p),
      markPracticed: (id) => set({ practiced: get().practiced.includes(id) ? get().practiced : [...get().practiced, id] }),
      addNote: (childId, from, text, extra = {}) => {
        const now = new Date().toISOString();
        set({
          notes: [
            ...get().notes,
            {
              id: uid(),
              childId,
              from,
              text: text.trim(),
              createdAt: now,
              // Both roles share this device in the demo, so a message is delivered as soon as it's saved.
              deliveredAt: now,
              readAt: null,
              ...(extra.attachments?.length ? { attachments: extra.attachments } : {}),
              ...(extra.details ? { details: extra.details } : {}),
              ...(extra.card ? { card: extra.card } : {}),
            },
          ],
        });
      },
      addKidCheckIn: (childId, feeling) =>
        set({ kidCheckIns: [...get().kidCheckIns, { id: uid(), childId, feeling, at: new Date().toISOString() }].slice(-200) }),
      updateSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
      addFunTime: (sec) => {
        const day = new Date().toDateString();
        const cur = get().funTime;
        set({ funTime: { day, sec: (cur.day === day ? cur.sec : 0) + Math.max(0, Math.round(sec)) } });
      },
      saveLibraryVersion: (v) => {
        const list = get().libraryVersions;
        set({ libraryVersions: list.some((x) => x.id === v.id) ? list.map((x) => (x.id === v.id ? v : x)) : [...list, v] });
      },
      removeLibraryVersion: (id) => set({ libraryVersions: get().libraryVersions.filter((v) => v.id !== id) }),
      recordLibraryPlay: (play) => {
        let levelChange: -1 | 0 | 1 = 0;
        set({
          libraryPlays: [...get().libraryPlays, play].slice(-500),
          children: mapChild(get().children, play.childId, (c) => ({
            ...c,
            customActivities: (c.customActivities ?? []).map((a) => {
              if (a.id !== play.activityId || !a.library?.autoLevel) return a;
              const next = nextLibraryLevel(a.library.level, a.library.streak ?? 0, play.stars);
              levelChange = next.changed;
              return { ...a, library: { ...a.library, level: next.level, streak: next.streak } };
            }),
          })),
        });
        return { levelChange };
      },
      markNotificationsSeen: (role) => set({ notifSeen: { ...get().notifSeen, [role]: new Date().toISOString() } }),
      addInboxNote: (note) => {
        if (get().inbox.some((n) => n.id === note.id)) return;
        set({ inbox: [...get().inbox, note].slice(-50) });
      },
      saveVisit: (visit) => {
        const list = get().clinicVisits;
        set({ clinicVisits: list.some((v) => v.id === visit.id) ? list.map((v) => (v.id === visit.id ? visit : v)) : [...list, visit] });
      },
      addVisitObservation: (visitId, obs) =>
        set({
          clinicVisits: get().clinicVisits.map((v) =>
            v.id === visitId ? { ...v, observations: [...v.observations, { ...obs, id: uid(), at: new Date().toISOString() }] } : v,
          ),
        }),
      addVisitLibraryPlay: (visitId, playId) =>
        set({ clinicVisits: get().clinicVisits.map((v) => (v.id === visitId ? { ...v, libraryPlayIds: [...(v.libraryPlayIds ?? []), playId] } : v)) }),
      addVisitSession: (visitId, sessionId) =>
        set({ clinicVisits: get().clinicVisits.map((v) => (v.id === visitId ? { ...v, sessionIds: [...v.sessionIds, sessionId] } : v)) }),
      markNotesRead: (childId, reader) => {
        const notes = get().notes;
        if (!notes.some((n) => n.childId === childId && n.from !== reader && !n.readAt)) return;
        const now = new Date().toISOString();
        set({
          notes: notes.map((n) =>
            n.childId === childId && n.from !== reader && !n.readAt ? { ...n, deliveredAt: n.deliveredAt ?? now, readAt: now } : n,
          ),
        });
      },
      resetDemo: () => set({ ...withDemoExtras(buildSeed()), role: null, parentChildId: null, reminder: { enabled: false, hour: 17 }, parentPin: null, practiced: [], studioPlays: [], libraryPlays: [], libraryVersions: [], team: null }),
    }),
    {
      name: STORE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: 20,
      migrate: (persisted, version) => {
        const state = persisted as State;

        // v3 added adaptive session length, the starting check and family codes.
        if (version < 3 && state?.children) {
          const taken: string[] = [];
          state.children = state.children.map((c) => {
            const familyCode = c.familyCode ?? makeFamilyCode(taken);
            taken.push(familyCode);
            return {
              ...c,
              currentMinutes: c.currentMinutes ?? c.sessionMinutes,
              baselineAt: c.baselineAt === undefined ? c.createdAt : c.baselineAt,
              familyCode,
            };
          });
          state.reminder = state.reminder ?? { enabled: false, hour: 17 };
        }
        // Any task added since this data was saved starts initialized (v8 Lumosity/Peak additions).
        if (state?.children) {
          state.children = state.children.map((c) => {
            const defaults = makeTasks(c.age, c.focus);
            const tasks = { ...c.tasks };
            for (const id of Object.keys(defaults) as TaskId[]) {
              if (!tasks[id]) tasks[id] = { ...defaults[id], enabled: true };
            }
            return { ...c, tasks };
          });
        }
        // v5 added the parent PIN.
        if (state) {
          state.parentPin = state.parentPin ?? null;
          // v7 added sound, calm mode and practice-round tracking.
          state.soundOn = state.soundOn ?? true;
          state.calmMode = state.calmMode ?? false;
          state.practiced = state.practiced ?? [];
          state.studioPlays = (state as any).studioPlays ?? [];
          state.kidCheckIns = (state as any).kidCheckIns ?? [];
          // v9 added therapistDisplayName & deep child customization.
          state.therapistDisplayName = (state as any).therapistDisplayName ?? null;
        }
        // v10 added learning profiles, custom activities and a richer sample conversation.
        if (version < 10 && state?.children && state.sessions) {
          state.notes = [...(state.notes ?? []), ...enrichDemo(state.children, state.sessions)];
        }
        // v11 added Game Studio games (and their play log).
        if (version < 11 && state?.children) addDemoStudioGames(state.children);
        // v12 added hero worlds (multiple heroes and scene styles).
        if (version < 12 && state?.children) addDemoHeroes(state.children);
        // v13 gave built-in heroes fun names, categories and 3D artwork.
        if (version < 13 && state?.children) upgradeSavedHeroes(state.children);
        // v14 added therapist and parent names to each child (shown in Messages).
        if (version < 14 && state?.children) addDemoNames(state.children, state.userName, state.role);
        // v15 added clinic sessions (with a sample last visit and a week of feelings for the sample children).
        if (state) {
          state.notifSeen = (state as any).notifSeen ?? {};
          state.libraryPlays = (state as any).libraryPlays ?? [];
          state.libraryVersions = (state as any).libraryVersions ?? [];
          state.settings = { ...DEFAULT_SETTINGS, ...((state as any).settings ?? {}), notif: { ...DEFAULT_SETTINGS.notif, ...((state as any).settings?.notif ?? {}) } };
          state.funTime = (state as any).funTime ?? { day: '', sec: 0 };
          state.team = (state as any).team ?? (state.role === 'therapist' && state.children ? defaultTeam(state.userName, state.children) : null);
          state.inbox = (state as any).inbox ?? [];
          state.clinicVisits = (state as any).clinicVisits ?? (version < 15 && state.children ? demoVisits(state.children) : []);
          if (version < 15 && state.children && !state.kidCheckIns.length) state.kidCheckIns = demoCheckIns(state.children);
        }
        // v20 added a sample 4-week plan.
        if (version < 20 && state?.children && state.sessions) addDemoMonthPlan(state.children, state.sessions);
        // v6 added demo home-practice history for the Train games to the sample children.
        if (version < 6 && state?.children && state.sessions) {
          for (const c of state.children) {
            if (!c.id.startsWith('seed-') || state.sessions.some((s) => s.id.startsWith(`demo-${c.id}-`))) continue;
            const home = generateTrainHistory(c);
            c.tasks = { ...c.tasks, ...home.tasks };
            state.sessions = [...state.sessions, ...home.sessions];
          }
        }
        // v9: back-fill deep customization fields onto existing children (new optional fields, so empty/none defaults are safe).
        if (version < 9 && state?.children) {
          state.children = state.children.map((c) => ({
            iqScore: null,
            cognitiveAge: null,
            diagnosis: [],
            favouriteCharacters: [],
            interests: [],
            sensory: {},
            communicationStyle: 'verbal',
            supportNeeds: [],
            ...c,
          }));
        }
        return state;
      },
    },
  ),
);

export const useChild = (id: string | undefined) =>
  useStore((s) => s.children.find((c) => c.id === id));

/**
 * Web demo: the therapist and the parent are often open in two browser windows. Each window keeps
 * its own copy of the store, so pull in the other window's saves — new messages, read ticks and
 * plan changes then appear live without refreshing the page.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // Only shared data syncs; who is signed in (role, name, linked child) stays per window.
  const SHARED = ['children', 'sessions', 'notes', 'studioPlays', 'clinicVisits', 'libraryPlays', 'libraryVersions'] as const;
  window.addEventListener('storage', (e) => {
    if (e.key !== STORE_KEY || !e.newValue) return;
    try {
      const incoming = JSON.parse(e.newValue)?.state as Partial<State> | undefined;
      if (!incoming) return;
      const current = useStore.getState();
      const patch: Partial<State> = {};
      for (const key of SHARED) {
        // Skip unchanged data so the two windows don't keep echoing writes back and forth.
        if (incoming[key] && JSON.stringify(incoming[key]) !== JSON.stringify(current[key])) (patch as any)[key] = incoming[key];
      }
      if (Object.keys(patch).length) useStore.setState(patch);
    } catch {
      // Ignore malformed or partial writes; the next save will sync.
    }
  });
}
