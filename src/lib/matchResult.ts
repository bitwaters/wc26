import { Match } from '../types';

/**
 * Returns the winning team name for a finished match.
 * Uses explicit `winner` when set (e.g. knockout after extra time / penalties).
 */
export function getMatchWinner(
  match: Match,
  resolvedTeamA: string,
  resolvedTeamB: string
): string | null {
  if (match.status !== 'finished' || match.scoreA === null || match.scoreB === null) {
    return null;
  }

  if (match.winner) {
    const w = match.winner.toLowerCase();
    if (resolvedTeamA.toLowerCase().includes(w) || w.includes(resolvedTeamA.toLowerCase())) return resolvedTeamA;
    if (resolvedTeamB.toLowerCase().includes(w) || w.includes(resolvedTeamB.toLowerCase())) return resolvedTeamB;
    // Stored winner doesn't match either resolved team — fall through to score-based resolution
  }

  if (match.scoreA > match.scoreB) return resolvedTeamA;
  if (match.scoreB > match.scoreA) return resolvedTeamB;
  return null;
}

/**
 * Returns the losing team name for a finished match.
 */
export function getMatchLoser(
  match: Match,
  resolvedTeamA: string,
  resolvedTeamB: string
): string | null {
  const winner = getMatchWinner(match, resolvedTeamA, resolvedTeamB);
  if (!winner) return null;
  return winner === resolvedTeamA ? resolvedTeamB : resolvedTeamA;
}

/**
 * Infer winner team name from scores when teams are concrete (non-placeholder).
 */
export function inferWinnerFromScores(
  match: Match,
  scoreA: number,
  scoreB: number,
  llmWinner: string | null
): string | null {
  if (scoreA > scoreB) return isPlaceholderTeam(match.teamA) ? null : match.teamA;
  if (scoreB > scoreA) return isPlaceholderTeam(match.teamB) ? null : match.teamB;

  if (llmWinner && !isPlaceholderTeam(match.teamA) && !isPlaceholderTeam(match.teamB)) {
    const winnerLower = llmWinner.toLowerCase();
    if (match.teamA.toLowerCase().includes(winnerLower) || winnerLower.includes(match.teamA.toLowerCase())) {
      return match.teamA;
    }
    if (match.teamB.toLowerCase().includes(winnerLower) || winnerLower.includes(match.teamB.toLowerCase())) {
      return match.teamB;
    }
  }

  return null;
}

function isPlaceholderTeam(name: string): boolean {
  return (
    name.includes('Winner') ||
    name.includes('Runner-up') ||
    name.includes('3rd') ||
    name.includes('Loser')
  );
}
