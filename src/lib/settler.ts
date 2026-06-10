import { Bet, Match, BetStatus } from '../types';

/**
 * Normalizes a score selection string by removing all whitespace.
 */
function normalizeScore(scoreStr: string): string {
  return scoreStr
    .replace(/\s+/g, '')
    .replace(/[:–—−－]/g, '-');
}

/**
 * Settles a single bet based on the actual match scores.
 * Returns the resolved BetStatus, or 'pending' if it cannot be auto-settled.
 */
export function settleBet(bet: Bet, match: Match): BetStatus {
  if (match.status !== 'finished' || match.scoreA === null || match.scoreB === null) {
    return 'pending';
  }

  const scoreA = match.scoreA;
  const scoreB = match.scoreB;

  switch (bet.betType) {
    case '1X2': {
      const selection = bet.betSelection.toLowerCase().trim();
      const teamALower = match.teamA.toLowerCase().trim();
      const teamBLower = match.teamB.toLowerCase().trim();

      if (selection === 'draw' || selection === 'x' || selection === '平' || selection === '平局') {
        return scoreA === scoreB ? 'won' : 'lost';
      }
      if (selection === teamALower || selection === '1' || selection === '主胜') {
        return scoreA > scoreB ? 'won' : 'lost';
      }
      if (selection === teamBLower || selection === '2' || selection === '客胜') {
        return scoreA < scoreB ? 'won' : 'lost';
      }
      return 'pending';
    }

    case 'handicap': {
      const handicapValue = bet.metadata?.handicapValue;
      if (handicapValue === undefined) {
        return 'pending';
      }

      const selection = bet.betSelection.toLowerCase().trim();
      const teamALower = match.teamA.toLowerCase().trim();
      const teamBLower = match.teamB.toLowerCase().trim();

      if (selection === teamALower || selection === '1' || selection === '主') {
        const diff = scoreA + handicapValue - scoreB;
        if (diff > 0) return 'won';
        if (diff < 0) return 'lost';
        return 'void';
      }

      if (selection === teamBLower || selection === '2' || selection === '客') {
        const diff = scoreB + handicapValue - scoreA;
        if (diff > 0) return 'won';
        if (diff < 0) return 'lost';
        return 'void';
      }
      return 'pending';
    }

    case 'over_under': {
      const threshold = bet.metadata?.threshold;
      if (threshold === undefined) {
        return 'pending';
      }

      const selection = bet.betSelection.toLowerCase().trim();
      const totalGoals = scoreA + scoreB;

      if (selection === 'over' || selection === '大' || selection === '大于') {
        if (totalGoals > threshold) return 'won';
        if (totalGoals < threshold) return 'lost';
        return 'void';
      }

      if (selection === 'under' || selection === '小' || selection === '小于') {
        if (totalGoals < threshold) return 'won';
        if (totalGoals > threshold) return 'lost';
        return 'void';
      }
      return 'pending';
    }

    case 'correct_score': {
      const selection = normalizeScore(bet.betSelection);
      const actualScore = `${scoreA}-${scoreB}`;
      return selection === actualScore ? 'won' : 'lost';
    }

    case 'custom':
    default:
      return bet.status;
  }
}

/**
 * Re-settles all auto-settleable bets against finished matches.
 * Updates bets whose status changed (including corrections after score edits).
 */
export function settleAllBets(
  bets: Bet[],
  matches: Match[]
): { updatedBets: Bet[]; settledCount: number; changedCount: number } {
  let settledCount = 0;
  let changedCount = 0;
  const matchMap = new Map<string, Match>();
  matches.forEach(m => matchMap.set(m.id, m));

  const updatedBets = bets.map(bet => {
    const match = matchMap.get(bet.matchId);
    if (!match || match.status !== 'finished') {
      return bet;
    }

    if (bet.betType === 'custom') {
      return bet;
    }

    const newStatus = settleBet(bet, match);
    if (newStatus === 'pending') {
      return bet;
    }

    if (newStatus !== bet.status) {
      changedCount++;
      if (bet.status === 'pending') {
        settledCount++;
      }
      return { ...bet, status: newStatus };
    }

    return bet;
  });

  return { updatedBets, settledCount, changedCount };
}
