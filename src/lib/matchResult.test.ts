import { describe, it, expect } from 'vitest';
import { getMatchWinner, getMatchLoser, inferWinnerFromScores } from './matchResult';
import { Match } from '../types';

const knockoutMatch: Match = {
  id: 'match_100',
  group: 'Semifinals',
  teamA: 'Brazil',
  teamB: 'France',
  scoreA: 1,
  scoreB: 1,
  winner: 'France',
  date: '2026-07-01T00:00:00Z',
  stadium: 'Test',
  status: 'finished'
};

describe('matchResult', () => {
  it('uses explicit winner on knockout draw', () => {
    expect(getMatchWinner(knockoutMatch, 'Brazil', 'France')).toBe('France');
    expect(getMatchLoser(knockoutMatch, 'Brazil', 'France')).toBe('Brazil');
  });

  it('infers winner from decisive score', () => {
    const match: Match = { ...knockoutMatch, scoreA: 2, scoreB: 1, winner: null };
    expect(inferWinnerFromScores(match, 2, 1, null)).toBe('Brazil');
  });

  it('returns null winner on draw without winner field', () => {
    const match: Match = { ...knockoutMatch, winner: null };
    expect(getMatchWinner(match, 'Brazil', 'France')).toBeNull();
  });
});
