import { describe, it, expect } from 'vitest';
import { validateScoreSyncResult } from './scoreValidation';
import { Match } from '../types';

const groupMatch: Match = {
  id: 'match_1',
  group: 'Group A',
  teamA: 'Mexico',
  teamB: 'South Africa',
  scoreA: null,
  scoreB: null,
  date: '2026-06-01T00:00:00Z',
  stadium: 'Test',
  status: 'scheduled'
};

describe('validateScoreSyncResult', () => {
  it('accepts valid finished score', () => {
    const error = validateScoreSyncResult({
      status: 'finished',
      scoreA: 2,
      scoreB: 1,
      winner: 'Mexico',
      summary: 'Mexico wins'
    }, groupMatch);
    expect(error).toBeNull();
  });

  it('rejects negative scores', () => {
    const error = validateScoreSyncResult({
      status: 'finished',
      scoreA: -1,
      scoreB: 0,
      winner: null,
      summary: 'bad'
    }, groupMatch);
    expect(error).toContain('negative');
  });

  it('rejects knockout draw without winner', () => {
    const knockout: Match = { ...groupMatch, group: 'Final' };
    const error = validateScoreSyncResult({
      status: 'finished',
      scoreA: 1,
      scoreB: 1,
      winner: null,
      summary: 'draw'
    }, knockout);
    expect(error).toContain('draw');
  });
});
