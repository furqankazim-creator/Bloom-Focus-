import { describe, expect, it } from 'vitest';
import { checkRemove, defaultTeam, makeMember, visibleChildren, visibleVersions, type Team } from '../src/engine/team';
import type { Child } from '../src/types';

const kids = [{ id: 'a', name: 'Ali' }, { id: 'b', name: 'Sarah' }, { id: 'c', name: 'Hassan' }] as Child[];

describe('clinic team', () => {
  const base = defaultTeam('Dr Amna', kids, 'm1');
  const team: Team = { ...base, members: [...base.members, makeMember('Dr Sara', 'therapist', ['b'], 1, 'm2')] };

  it('admins see every child', () => {
    expect(visibleChildren(team, kids).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });
  it('therapists see only their children', () => {
    expect(visibleChildren({ ...team, activeId: 'm2' }, kids).map((c) => c.id)).toEqual(['b']);
  });
  it('keeps at least one admin', () => {
    expect(checkRemove(team, 'm1')).toBeTruthy();
    expect(checkRemove(team, 'm2')).toBeNull();
  });
  it('shares only shared versions with others', () => {
    const v = [{ id: '1', ownerId: 'm1' }, { id: '2', ownerId: 'm1', shared: true }, { id: '3' }];
    expect(visibleVersions({ ...team, activeId: 'm2' }, v).map((x) => x.id)).toEqual(['2', '3']);
    expect(visibleVersions(team, v)).toHaveLength(3);
  });
});
