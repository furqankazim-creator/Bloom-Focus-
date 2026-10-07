import { useMemo } from 'react';
import { activeMember, isAdmin, visibleChildren, visibleVersions } from '../engine/team';
import { useStore } from './useStore';

/** Children the signed-in person may see: all for parents and admins, shared ones for therapists. */
export function useVisibleChildren() {
  const children = useStore((s) => s.children);
  const team = useStore((s) => s.team);
  const role = useStore((s) => s.role);
  return useMemo(() => (role === 'therapist' ? visibleChildren(team, children) : children), [role, team, children]);
}

/** Saved Skill Builder versions: own, older ones and those shared with the team. */
export function useVisibleVersions() {
  const versions = useStore((s) => s.libraryVersions);
  const team = useStore((s) => s.team);
  return useMemo(() => visibleVersions(team, versions), [team, versions]);
}

export function useTeamMember() {
  const team = useStore((s) => s.team);
  return { team, me: activeMember(team), admin: isAdmin(team) };
}
