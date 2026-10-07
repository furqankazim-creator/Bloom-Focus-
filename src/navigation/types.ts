import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { TrainTaskId } from '../engine/trainTasks';
import type { Character, PlanGame, SceneStyle, StudioTemplate } from '../types';

export type TabParamList = {
  Today: undefined;
  Children: undefined;
  Plan: { childId?: string } | undefined;
  Insights: undefined;
  Home: undefined;
  Train: undefined;
  Progress: undefined;
  Profile: undefined;
  /** `childId` opens that child's conversation. */
  Notes: { childId?: string } | undefined;
};

export type FunGameId = 'bubbles' | 'memory' | 'dots' | 'breathe';

export type RootStackParamList = {
  Welcome: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ChildProfile: { childId: string };
  EditChild: { childId?: string };
  Tuning: { childId: string };
  /** `fromHub`: started from the child's start flow, so the summary returns there. */
  Session: { childId: string; mode?: 'baseline'; fromHub?: boolean };
  Summary: { sessionId: string; fresh?: boolean; fromHub?: boolean };
  /** `customId` plays a therapist-built custom activity on top of `taskId`. */
  /** `next`: the rest of today's training, played one after another (from the child's start flow). */
  /** `visitId`: played inside a therapist's clinic session (shows the therapist bar). */
  TrainGame: { childId: string; taskId: TrainTaskId; queue?: TrainTaskId[]; customId?: string; next?: PlanGame[]; visitId?: string };
  /** The therapist's in-clinic session: briefing → plan → play → wrap-up. */
  ClinicSession: { childId: string; visitId?: string };
  Notifications: undefined;
  /** The clinic's Activity Library (therapist). `childId` pre-selects who to assign to. */
  Library: { childId?: string } | undefined;
  LibraryActivity: { family: string; childId?: string };
  /** Plays a library app game: an assigned activity, or a family + level (preview / from a message). */
  LibraryPlay: {
    childId: string;
    activityId?: string;
    family?: string;
    level?: number;
    preview?: boolean;
    /** Preview of unsaved changes from the Customise screen. */
    custom?: Partial<Record<1 | 2 | 3, Record<string, any>>>;
    heroes?: Character[];
    scene?: SceneStyle;
    /** Play one of the therapist's saved versions. */
    versionId?: string;
    /** Played inside a clinic session (shows the therapist bar). */
    visitId?: string;
    /** The rest of the plan, played one after another. */
    next?: PlanGame[];
  };
  /** Customise a Skill Builder: for a child's assigned copy, a saved version, or a new one. */
  LibraryCustomise: { family: string; childId?: string; activityId?: string; versionId?: string };
  /** Step-by-step cards for a paper / flashcard activity, done with a parent. */
  LibrarySteps: { childId: string; activityId?: string; family?: string; level?: number; preview?: boolean; custom?: Partial<Record<1 | 2 | 3, Record<string, any>>> };
  SessionDetail: { sessionId: string; childId?: string };
  SkillDetail: { childId: string; taskId: TrainTaskId };
  Settings: undefined;
  ClinicTeam: undefined;
  /** The child's start flow: feelings check-in → training → Fun Zone. */
  KidHub: { childId: string };
  /** A just-for-fun game from the Fun Zone (not part of training). */
  FunGame: { childId: string; game: FunGameId };
  ActivityBuilder: { childId: string; activityId?: string; taskId?: TrainTaskId };
  /** Game Studio editor; `activityId` edits an existing studio game. */
  GameStudio: { childId: string; activityId?: string; template?: StudioTemplate };
  /** Plays a studio game. `preview` lets the therapist try it without recording a play. */
  StudioPlay: { childId: string; activityId: string; preview?: boolean };
};

export type RootProps<K extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, K>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
