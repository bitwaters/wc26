import { Match } from '../types';

export interface StandingRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

/**
 * Compute group standings from finished matches.
 * Only matches between the given teams with non-null scores are counted.
 */
export function calcGroupStandings(teams: string[], matches: Match[]): StandingRow[] {
  const teamSet = new Set(teams.map(t => t.toLowerCase()));

  const rows = new Map<string, StandingRow>();
  for (const team of teams) {
    rows.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  }

  for (const match of matches) {
    if (match.scoreA === null || match.scoreB === null) continue;
    if (match.status !== 'finished') continue;

    const ta = match.teamA;
    const tb = match.teamB;
    if (!teamSet.has(ta.toLowerCase()) || !teamSet.has(tb.toLowerCase())) continue;

    // Find canonical rows (case-insensitive lookup)
    const rowA = [...rows.values()].find(r => r.team.toLowerCase() === ta.toLowerCase());
    const rowB = [...rows.values()].find(r => r.team.toLowerCase() === tb.toLowerCase());
    if (!rowA || !rowB) continue;

    const sA = match.scoreA;
    const sB = match.scoreB;

    rowA.played++;
    rowB.played++;
    rowA.gf += sA;
    rowA.ga += sB;
    rowB.gf += sB;
    rowB.ga += sA;

    if (sA > sB) {
      rowA.won++;  rowA.pts += 3;
      rowB.lost++;
    } else if (sA < sB) {
      rowB.won++;  rowB.pts += 3;
      rowA.lost++;
    } else {
      rowA.drawn++; rowA.pts++;
      rowB.drawn++; rowB.pts++;
    }
  }

  // Recompute GD
  for (const row of rows.values()) {
    row.gd = row.gf - row.ga;
  }

  return [...rows.values()].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.team.localeCompare(b.team); // alphabetical tiebreak
  });
}

/**
 * Returns true when all 6 intra-group matches for a group are finished.
 */
export function isGroupComplete(groupName: string, matches: Match[]): boolean {
  const groupMatches = matches.filter(m => m.group === groupName);
  if (groupMatches.length < 6) return false;
  return groupMatches.every(m => m.status === 'finished');
}
