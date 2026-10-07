/**
 * Clinic team: several therapists on one clinic account. Admins see every child and manage the
 * team; therapists see the children shared with them. Demo mode keeps the team on this device —
 * real sharing between phones needs the clinic server. Pure TypeScript so it can be tested.
 */
import type { Child } from '../types';

export type TeamRole = 'admin' | 'therapist';

export type TeamMember = {
  id: string;
  name: string;
  role: TeamRole;
  /** Children this person works with; admins always see everyone. */
  childIds: string[];
  color: string;
  joinedAt: string;
};

export type Team = { members: TeamMember[]; activeId: string };

const COLORS = ['#F2B49A', '#CDE5E3', '#F2D78A', '#DDEEDA', '#F1D5CF', '#D9D2F5'];

export function makeMember(name: string, role: TeamRole, childIds: string[], index: number, id: string, now = new Date()): TeamMember {
  return { id, name: name.trim(), role, childIds, color: COLORS[index % COLORS.length], joinedAt: now.toISOString() };
}

/** The first team: the signed-in therapist as admin. */
export function defaultTeam(userName: string, children: Child[], id = 'member-1'): Team {
  return { members: [makeMember(userName || 'Therapist', 'admin', children.map((c) => c.id), 0, id)], activeId: id };
}

export function activeMember(team: Team | null | undefined): TeamMember | undefined {
  return team?.members.find((m) => m.id === team.activeId) ?? team?.members[0];
}

export const isAdmin = (team: Team | null | undefined) => (team ? activeMember(team)?.role === 'admin' : true);

/** Children the active person may see (everyone without a team, or for an admin). */
export function visibleChildren(team: Team | null | undefined, children: Child[]): Child[] {
  const me = activeMember(team);
  if (!me || me.role === 'admin') return children;
  const ids = new Set(me.childIds);
  return children.filter((c) => ids.has(c.id));
}

/** Who works with a child (for the "Shared with" line on a profile). */
export function membersFor(team: Team | null | undefined, childId: string): TeamMember[] {
  return (team?.members ?? []).filter((m) => m.role === 'admin' || m.childIds.includes(childId));
}

/** A team always keeps at least one admin; returns an error message or null. */
export function checkRemove(team: Team, memberId: string): string | null {
  const m = team.members.find((x) => x.id === memberId);
  if (!m) return 'Not found';
  if (team.members.length === 1) return 'A clinic needs at least one person.';
  if (m.role === 'admin' && team.members.filter((x) => x.role === 'admin').length === 1) return 'Make someone else an admin first.';
  return null;
}

/** Saved Skill Builder versions this person can use: their own, legacy ones, and any shared with the team. */
export function visibleVersions<V extends { ownerId?: string; shared?: boolean }>(team: Team | null | undefined, versions: V[]): V[] {
  const me = activeMember(team);
  if (!me) return versions;
  return versions.filter((v) => !v.ownerId || v.ownerId === me.id || v.shared);
}
