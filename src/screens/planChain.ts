import { isTrain, libraryFamilyOf } from '../engine/clinic';
import type { TrainTaskId } from '../engine/trainTasks';
import type { PlanGame } from '../types';

type Nav = { navigate: (...args: any[]) => void; replace: (...args: any[]) => void };

/**
 * Opens one game of a plan (Focus game or Skill Builder) with the rest of the plan queued,
 * so a clinic session or today's training plays straight through a mixed list.
 * `replace` swaps the current game screen for the next one.
 */
export function openPlanStep(nav: Nav, childId: string, steps: PlanGame[], opts: { visitId?: string; replace?: boolean } = {}): boolean {
  const [head, ...rest] = steps;
  if (!head) return false;
  const go = opts.replace ? nav.replace : nav.navigate;
  const fam = libraryFamilyOf(head.taskId);
  if (fam) {
    go('LibraryPlay', {
      childId,
      family: fam,
      level: head.level ?? 1,
      ...(head.customId ? { activityId: head.customId } : {}),
      ...(head.versionId ? { versionId: head.versionId } : {}),
      ...(opts.visitId ? { visitId: opts.visitId } : {}),
      next: rest,
    });
    return true;
  }
  if (!isTrain(head.taskId)) return openPlanStep(nav, childId, rest, opts);
  go('TrainGame', {
    childId,
    taskId: head.taskId as TrainTaskId,
    ...(head.customId ? { customId: head.customId } : {}),
    ...(opts.visitId ? { visitId: opts.visitId } : {}),
    next: rest,
  });
  return true;
}
