import { Predictions, Match } from '../types';
import { getMatchLoser, getMatchWinner } from './matchResult';
import { calcGroupStandings, isGroupComplete } from './groupStandings';

export const THIRD_PLACE_ALLOCATIONS = [
  { matchId: 'match_75', allowed: ['Group A', 'Group B', 'Group C', 'Group D', 'Group F'] },
  { matchId: 'match_78', allowed: ['Group C', 'Group D', 'Group F', 'Group G', 'Group H'] },
  { matchId: 'match_79', allowed: ['Group C', 'Group E', 'Group F', 'Group H', 'Group I'] },
  { matchId: 'match_80', allowed: ['Group E', 'Group H', 'Group I', 'Group J', 'Group K'] },
  { matchId: 'match_81', allowed: ['Group A', 'Group E', 'Group H', 'Group I', 'Group J'] },
  { matchId: 'match_82', allowed: ['Group B', 'Group E', 'Group F', 'Group I', 'Group J'] },
  { matchId: 'match_85', allowed: ['Group E', 'Group F', 'Group G', 'Group I', 'Group J'] },
  { matchId: 'match_88', allowed: ['Group D', 'Group E', 'Group I', 'Group J', 'Group L'] }
];

/**
 * Solves third-place assignments using backtracking with FIFA slot constraints.
 * Returns null when no valid assignment exists for the selected 8 groups.
 */
export function solveThirdPlaceAssignments(bestThirdTeams: string[]): Record<string, string> | null {
  if (bestThirdTeams.length !== 8) {
    return null;
  }

  const assignments: Record<string, string> = {};
  const available = new Set(bestThirdTeams);

  function backtrack(slotIdx: number): boolean {
    if (slotIdx === THIRD_PLACE_ALLOCATIONS.length) {
      return available.size === 0;
    }

    const slot = THIRD_PLACE_ALLOCATIONS[slotIdx];
    for (const group of slot.allowed) {
      if (!available.has(group)) continue;

      assignments[slot.matchId] = group;
      available.delete(group);

      if (backtrack(slotIdx + 1)) {
        return true;
      }

      available.add(group);
      delete assignments[slot.matchId];
    }

    return false;
  }

  return backtrack(0) ? assignments : null;
}

export function resolveTeamName(
  placeholder: string,
  track: 'sandbox' | 'live',
  predictions: Predictions,
  matches: Match[]
): string {
  if (!placeholder) return '';

  const cleanName = placeholder.trim();

  if (cleanName.startsWith('Winner Group ')) {
    const groupName = cleanName.replace('Winner ', '');
    if (track === 'live' && isGroupComplete(groupName, matches)) {
      const groupMatches = matches.filter(m => m.group === groupName);
      const teams = [...new Set(groupMatches.flatMap(m => [m.teamA, m.teamB]))];
      const computed = calcGroupStandings(teams, groupMatches);
      if (computed[0]) return computed[0].team;
    }
    const standings = predictions.groupStandings[groupName];
    return standings && standings[0] ? standings[0] : placeholder;
  }

  if (cleanName.startsWith('Runner-up Group ')) {
    const groupName = cleanName.replace('Runner-up ', '');
    if (track === 'live' && isGroupComplete(groupName, matches)) {
      const groupMatches = matches.filter(m => m.group === groupName);
      const teams = [...new Set(groupMatches.flatMap(m => [m.teamA, m.teamB]))];
      const computed = calcGroupStandings(teams, groupMatches);
      if (computed[1]) return computed[1].team;
    }
    const standings = predictions.groupStandings[groupName];
    return standings && standings[1] ? standings[1] : placeholder;
  }

  if (cleanName.startsWith('3rd Group ')) {
    const match = matches.find(m => m.teamA === placeholder || m.teamB === placeholder);
    if (match) {
      const thirdPlaceMap = solveThirdPlaceAssignments(predictions.bestThirdTeams);
      const assignedGroup = thirdPlaceMap?.[match.id];
      if (assignedGroup) {
        const standings = predictions.groupStandings[assignedGroup];
        return standings && standings[2] ? standings[2] : `3rd ${assignedGroup}`;
      }
    }
    return placeholder;
  }

  if (cleanName.startsWith('Winner Match ')) {
    const refMatchId = `match_${cleanName.replace('Winner Match ', '')}`;
    if (track === 'sandbox') {
      const predictedWinner = predictions.bracket[refMatchId];
      if (predictedWinner) return predictedWinner;

      const refMatch = matches.find(m => m.id === refMatchId);
      if (refMatch) {
        const resolvedA = resolveTeamName(refMatch.teamA, 'sandbox', predictions, matches);
        const resolvedB = resolveTeamName(refMatch.teamB, 'sandbox', predictions, matches);
        return `Winner of ${resolvedA} vs ${resolvedB}`;
      }
      return placeholder;
    }

    const actualMatch = matches.find(m => m.id === refMatchId);
    if (actualMatch && actualMatch.status === 'finished' && actualMatch.scoreA !== null && actualMatch.scoreB !== null) {
      const resolvedA = resolveTeamName(actualMatch.teamA, 'live', predictions, matches);
      const resolvedB = resolveTeamName(actualMatch.teamB, 'live', predictions, matches);
      const winner = getMatchWinner(actualMatch, resolvedA, resolvedB);
      return winner ?? placeholder;
    }
    return placeholder;
  }

  if (cleanName.startsWith('Loser Match ')) {
    const refMatchId = `match_${cleanName.replace('Loser Match ', '')}`;
    if (track === 'sandbox') {
      const predictedWinner = predictions.bracket[refMatchId];
      const refMatch = matches.find(m => m.id === refMatchId);
      if (refMatch && predictedWinner) {
        const resolvedA = resolveTeamName(refMatch.teamA, 'sandbox', predictions, matches);
        const resolvedB = resolveTeamName(refMatch.teamB, 'sandbox', predictions, matches);
        return predictedWinner === resolvedA ? resolvedB : resolvedA;
      }
      return placeholder;
    }

    const actualMatch = matches.find(m => m.id === refMatchId);
    if (actualMatch && actualMatch.status === 'finished' && actualMatch.scoreA !== null && actualMatch.scoreB !== null) {
      const resolvedA = resolveTeamName(actualMatch.teamA, 'live', predictions, matches);
      const resolvedB = resolveTeamName(actualMatch.teamB, 'live', predictions, matches);
      const loser = getMatchLoser(actualMatch, resolvedA, resolvedB);
      return loser ?? placeholder;
    }
    return placeholder;
  }

  return placeholder;
}

export function resolveBracketMatches(
  track: 'sandbox' | 'live',
  predictions: Predictions,
  matches: Match[]
): Match[] {
  return matches.map(match => {
    if (
      match.group === 'Round of 32' ||
      match.group === 'Round of 16' ||
      match.group === 'Quarterfinals' ||
      match.group === 'Semifinals' ||
      match.group === 'Third Place Match' ||
      match.group === 'Final'
    ) {
      return {
        ...match,
        teamA: resolveTeamName(match.teamA, track, predictions, matches),
        teamB: resolveTeamName(match.teamB, track, predictions, matches)
      };
    }
    return match;
  });
}
