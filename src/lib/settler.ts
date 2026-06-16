import { Bet, BetLeg, Match, BetStatus } from '../types';

/**
 * Normalizes a score selection string by removing all whitespace.
 */
function normalizeScore(scoreStr: string): string {
  return scoreStr
    .replace(/\s+/g, '')
    .replace(/[:–—−－]/g, '-');
}

/**
 * Settle a single bet leg (or a regular single bet) against a finished match.
 * Returns the resolved BetStatus, or 'pending' if it cannot be auto-settled.
 */
export function settleBet(bet: Pick<Bet, 'betType' | 'betSelection' | 'status' | 'metadata'>, match: Match): BetStatus {
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

    // Legacy handicap (whole-line only) — kept for historical data compatibility
    case 'handicap': {
      const handicapValue = bet.metadata?.handicapValue;
      if (handicapValue === undefined) return 'pending';

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

    // Asian handicap: supports whole lines and quarter-ball lines (-0.25, -0.75, etc.)
    // Quarter lines split the stake: half on the lower line, half on the upper line.
    // 'half_won' = half stake wins at full odds + half stake refunded (net gain).
    // 'half_lost' = half stake refunded + half stake lost (net partial loss).
    case 'asian_handicap': {
      const hv = bet.metadata?.handicapValue;
      if (hv === undefined) return 'pending';

      const selection = bet.betSelection.toLowerCase().trim();
      const teamALower = match.teamA.toLowerCase().trim();
      const teamBLower = match.teamB.toLowerCase().trim();

      const isTeamA = selection === teamALower || selection === '1' || selection === '主';
      const isTeamB = selection === teamBLower || selection === '2' || selection === '客';
      if (!isTeamA && !isTeamB) return 'pending';

      // Effective score difference from the perspective of the selected team
      const rawDiff = isTeamA ? (scoreA - scoreB) : (scoreB - scoreA);
      const adjDiff = rawDiff + hv;

      // Use Math.round to avoid float imprecision (e.g. 0.75×4=3.0000000000000004)
      const isQuarterLine = Math.abs(Math.round(hv * 4) % 2) === 1;

      if (!isQuarterLine) {
        // Whole line or half line
        if (adjDiff > 0) return 'won';
        if (adjDiff < 0) return 'lost';
        return 'void'; // exact tie → push
      }

      // Quarter line: split into lower and upper half-lines
      const lowerHv = Math.floor(Math.round(hv * 2)) / 2; // round first to avoid float errors
      const upperHv = lowerHv + 0.5;

      const lowerDiff = rawDiff + lowerHv;
      const upperDiff = rawDiff + upperHv;

      const lowerResult = lowerDiff > 0 ? 'won' : lowerDiff < 0 ? 'lost' : 'void';
      const upperResult = upperDiff > 0 ? 'won' : upperDiff < 0 ? 'lost' : 'void';

      // Both won
      if (lowerResult === 'won' && upperResult === 'won') return 'won';
      // Both lost
      if (lowerResult === 'lost' && upperResult === 'lost') return 'lost';
      // Both void (shouldn't happen on quarter lines, but guard anyway)
      if (lowerResult === 'void' && upperResult === 'void') return 'void';
      // Half-win / half-void → half stake wins at full odds, half refunded
      if ((lowerResult === 'won' && upperResult === 'void') ||
          (lowerResult === 'void' && upperResult === 'won')) return 'half_won';
      // Half-loss / half-void → half stake lost, half refunded
      if ((lowerResult === 'lost' && upperResult === 'void') ||
          (lowerResult === 'void' && upperResult === 'lost')) return 'half_lost';
      // Half-win / half-loss → break even
      return 'void';
    }

    case 'over_under': {
      const threshold = bet.metadata?.threshold;
      if (threshold === undefined) return 'pending';

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

    // Both Teams To Score
    case 'btts': {
      const selection = bet.betSelection.toLowerCase().trim();
      const bothScored = scoreA > 0 && scoreB > 0;
      if (selection === 'yes' || selection === '是') {
        return bothScored ? 'won' : 'lost';
      }
      if (selection === 'no' || selection === '否') {
        return bothScored ? 'lost' : 'won';
      }
      return 'pending';
    }

    // Total goals bracket: '0' | '1' | '2' | '3' | '4' | '5+'
    case 'total_goals': {
      const totalGoals = scoreA + scoreB;
      const selection = bet.betSelection.trim();
      if (selection === '5+') {
        return totalGoals >= 5 ? 'won' : 'lost';
      }
      const targetGoals = parseInt(selection, 10);
      if (isNaN(targetGoals)) return 'pending';
      return totalGoals === targetGoals ? 'won' : 'lost';
    }

    // Half-time data not available from ESPN — always keep pending for manual settle
    case 'ht_ft':
    case 'first_half_1x2':
    case 'first_half_ou':
      return 'pending';

    case 'custom':
    default:
      return (bet as Bet).status ?? 'pending';
  }
}

// ---------------------------------------------------------------------------
// Parlay settlement
// ---------------------------------------------------------------------------

/**
 * Settle a single parlay leg against a finished match.
 */
function settleParalyLeg(leg: BetLeg, match: Match): BetStatus {
  return settleBet(
    { betType: leg.betType, betSelection: leg.betSelection, status: leg.status, metadata: leg.metadata },
    match
  );
}

/**
 * Settle a parlay bet by evaluating each leg independently.
 *
 * Rules:
 * - Any leg `lost`  → whole parlay `lost`
 * - Any leg still `pending` (match unfinished) → whole parlay `pending`
 * - All non-void legs `won` → whole parlay `won`
 * - All legs `void` → whole parlay `void`
 */
export function settleParlay(bet: Bet, matchMap: Map<string, Match>): BetStatus {
  const legs = bet.legs;
  if (!legs || legs.length === 0) return 'pending';

  const legStatuses: BetStatus[] = legs.map(leg => {
    const match = matchMap.get(leg.matchId);
    if (!match) return leg.status; // unknown match → keep current status
    return settleParalyLeg(leg, match);
  });

  if (legStatuses.some(s => s === 'lost')) return 'lost';
  if (legStatuses.some(s => s === 'pending')) return 'pending';
  if (legStatuses.every(s => s === 'void')) return 'void';
  // Remaining non-void must all be 'won'
  return 'won';
}

// ---------------------------------------------------------------------------
// Batch settlement
// ---------------------------------------------------------------------------

/**
 * Re-settles all auto-settleable bets against finished matches.
 * Updates bets whose status changed (including corrections after score edits).
 * Also updates individual parlay leg statuses.
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
    // --- Parlay ---
    if (bet.betType === 'parlay') {
      if (!bet.legs || bet.legs.length === 0) return bet;

      // Settle each leg
      const updatedLegs: BetLeg[] = bet.legs.map(leg => {
        const match = matchMap.get(leg.matchId);
        if (!match) return leg;
        const newLegStatus = settleParalyLeg(leg, match);
        return newLegStatus !== leg.status ? { ...leg, status: newLegStatus } : leg;
      });

      const newStatus = settleParlay({ ...bet, legs: updatedLegs }, matchMap);
      const legsChanged = updatedLegs.some((leg, i) => leg.status !== bet.legs![i].status);

      if (newStatus !== bet.status || legsChanged) {
        changedCount++;
        if (bet.status === 'pending' && newStatus !== 'pending') settledCount++;
        return { ...bet, legs: updatedLegs, status: newStatus };
      }
      return bet;
    }

    // --- Single bet ---
    const match = matchMap.get(bet.matchId);
    if (!match || match.status !== 'finished') return bet;
    if (bet.betType === 'custom') return bet;

    const newStatus = settleBet(bet, match);
    if (newStatus === 'pending') return bet;

    if (newStatus !== bet.status) {
      changedCount++;
      if (bet.status === 'pending') settledCount++;
      return { ...bet, status: newStatus };
    }
    return bet;
  });

  return { updatedBets, settledCount, changedCount };
}
