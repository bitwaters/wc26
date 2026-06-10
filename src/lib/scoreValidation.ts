import { Match } from '../types';
import { ScoreSyncResult } from './llm';
import { inferWinnerFromScores } from './matchResult';

export interface ValidatedScoreUpdate {
  scoreA: number;
  scoreB: number;
  winner: string | null;
}

/**
 * Validates LLM score output before persisting and settling bets.
 * Returns an error message string, or null if valid.
 */
export function validateScoreSyncResult(
  result: ScoreSyncResult,
  match: Match
): string | null {
  if (result.status !== 'finished') {
    return null;
  }

  if (result.scoreA === null || result.scoreB === null) {
    return 'LLM reported match as finished but could not parse valid scores.';
  }

  if (!Number.isInteger(result.scoreA) || !Number.isInteger(result.scoreB)) {
    return 'Scores must be whole numbers.';
  }

  if (result.scoreA < 0 || result.scoreB < 0) {
    return 'Scores cannot be negative.';
  }

  if (result.scoreA > 20 || result.scoreB > 20) {
    return 'Scores look unreasonably high.';
  }

  const inferredWinner = inferWinnerFromScores(match, result.scoreA, result.scoreB, result.winner);

  const isKnockoutRound = [
    'Round of 32',
    'Round of 16',
    'Quarterfinals',
    'Semifinals',
    'Third Place Match',
    'Final'
  ].includes(match.group);

  if (isKnockoutRound && result.scoreA === result.scoreB && !inferredWinner && !result.winner) {
    return 'Knockout match ended in a draw but no penalty/extra-time winner was provided.';
  }

  if (
    result.winner &&
    inferredWinner &&
    result.scoreA !== result.scoreB &&
    !teamNamesMatch(result.winner, inferredWinner)
  ) {
    return 'LLM winner does not match the reported score.';
  }

  return null;
}

export function toValidatedScoreUpdate(
  result: ScoreSyncResult,
  match: Match
): ValidatedScoreUpdate {
  const scoreA = result.scoreA as number;
  const scoreB = result.scoreB as number;
  const winner = inferWinnerFromScores(match, scoreA, scoreB, result.winner) ?? result.winner;

  return { scoreA, scoreB, winner };
}

function teamNamesMatch(a: string, b: string): boolean {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  return aLower === bLower || aLower.includes(bLower) || bLower.includes(aLower);
}
