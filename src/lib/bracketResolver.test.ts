import { describe, it, expect } from 'vitest';
import { solveThirdPlaceAssignments, THIRD_PLACE_ALLOCATIONS } from './bracketResolver';

describe('solveThirdPlaceAssignments', () => {
  it('returns assignment satisfying slot constraints for a solvable set', () => {
    const groups = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F', 'Group G', 'Group H'];
    const result = solveThirdPlaceAssignments(groups);
    expect(result).not.toBeNull();

    for (const slot of THIRD_PLACE_ALLOCATIONS) {
      const assigned = result![slot.matchId];
      expect(slot.allowed).toContain(assigned);
    }

    expect(new Set(Object.values(result!)).size).toBe(8);
  });

  it('returns null when only two third-place groups are provided', () => {
    expect(solveThirdPlaceAssignments(['Group K', 'Group L'])).toBeNull();
  });

  it('returns null when duplicate groups prevent filling all slots', () => {
    const duplicates = Array(8).fill('Group A');
    expect(solveThirdPlaceAssignments(duplicates)).toBeNull();
  });
});
