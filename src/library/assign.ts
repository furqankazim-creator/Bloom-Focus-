import { BASE_PARAMS } from '../engine/tasks';
import { uid } from '../store/seed';
import type { Character, Child, CustomActivity, LibraryCard, SceneStyle } from '../types';
import { FAMILY, libraryTaskId, type LibraryFamilyId } from './catalog';
import type { LibraryCustom } from './settings';
import { scheduleLabel } from '../engine/schedule';

export type LibraryExtras = {
  id?: string;
  name?: string;
  heroes?: Character[];
  scene?: SceneStyle;
  custom?: LibraryCustom;
  autoLevel?: boolean;
  versionId?: string;
  createdAt?: string;
  /** Fixed days of the week (0 = Sunday). */
  days?: number[];
};

/** A Skill Builder assigned to a child, as a home activity (shows up for the family). */
export function libraryActivity(family: LibraryFamilyId, level: number, timesPerWeek: number, note: string, child?: Child, extras: LibraryExtras = {}): CustomActivity {
  const f = FAMILY[family];
  const heroes = extras.heroes ?? (child?.favouriteCharacters ?? []).slice(0, 1);
  return {
    id: extras.id ?? uid(),
    taskId: libraryTaskId(family),
    library: {
      family,
      level,
      autoLevel: extras.autoLevel ?? true,
      streak: 0,
      ...(extras.custom && Object.keys(extras.custom).length ? { custom: extras.custom } : {}),
      ...(extras.versionId ? { versionId: extras.versionId } : {}),
    },
    name: extras.name?.trim() || f.name,
    instructions: note.trim(),
    heroes,
    ...(heroes[0] ? { hero: heroes[0] } : {}),
    ...(extras.scene ? { scene: extras.scene } : {}),
    supportLevel: f.mode === 'app' ? 'independent' : 'hands-on',
    timesPerWeek: extras.days?.length || timesPerWeek,
    ...(extras.days?.length ? { days: extras.days } : {}),
    adaptive: true,
    params: BASE_PARAMS,
    createdAt: extras.createdAt ?? new Date().toISOString(),
  };
}

export function libraryCard(a: CustomActivity): LibraryCard {
  const f = FAMILY[a.library!.family as LibraryFamilyId];
  return {
    type: 'library',
    activityId: a.id,
    family: f.id,
    title: a.name || f.name,
    level: a.library!.level,
    mode: f.mode,
    minutes: f.minutes,
    steps: f.steps.slice(0, 8),
    schedule: scheduleLabel(a.days, a.timesPerWeek),
    ...(a.instructions ? { therapistNote: a.instructions.slice(0, 200) } : {}),
  };
}
