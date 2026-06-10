import { describe, it, expect } from 'vitest';
import { calcGroupStandings, isGroupComplete } from './groupStandings';
import { Match } from '../types';

const teams = ['Mexico', 'South Africa', 'South Korea', 'Denmark'];

function makeMatch(id: string, teamA: string, teamB: string, scoreA: number | null, scoreB: number | null, group = 'Group A'): Match {
  return {
    id,
    group,
    teamA,
    teamB,
    scoreA,
    scoreB,
    date: '2026-06-11T12:00:00Z',
    stadium: 'Test Stadium',
    status: scoreA !== null && scoreB !== null ? 'finished' : 'scheduled'
  };
}

describe('calcGroupStandings', () => {
  it('empty matches returns all teams with 0s', () => {
    const rows = calcGroupStandings(teams, []);
    expect(rows).toHaveLength(4);
    rows.forEach(r => {
      expect(r.played).toBe(0);
      expect(r.pts).toBe(0);
    });
  });

  it('null score matches are ignored', () => {
    const matches = [makeMatch('m1', 'Mexico', 'South Africa', null, null)];
    const rows = calcGroupStandings(teams, matches);
    expect(rows.every(r => r.played === 0)).toBe(true);
  });

  it('win gives 3 pts, loss 0', () => {
    const matches = [makeMatch('m1', 'Mexico', 'South Africa', 2, 0)];
    const rows = calcGroupStandings(teams, matches);
    const mex = rows.find(r => r.team === 'Mexico')!;
    const sa = rows.find(r => r.team === 'South Africa')!;
    expect(mex.pts).toBe(3);
    expect(mex.won).toBe(1);
    expect(mex.gd).toBe(2);
    expect(sa.pts).toBe(0);
    expect(sa.lost).toBe(1);
    expect(sa.gd).toBe(-2);
  });

  it('draw gives 1 pt each', () => {
    const matches = [makeMatch('m1', 'Mexico', 'South Africa', 1, 1)];
    const rows = calcGroupStandings(teams, matches);
    const mex = rows.find(r => r.team === 'Mexico')!;
    const sa = rows.find(r => r.team === 'South Africa')!;
    expect(mex.pts).toBe(1);
    expect(sa.pts).toBe(1);
    expect(mex.drawn).toBe(1);
  });

  it('sorts by pts desc, then gd desc, then gf desc', () => {
    const matches = [
      makeMatch('m1', 'Mexico', 'South Africa', 3, 0),
      makeMatch('m2', 'South Korea', 'Denmark', 1, 0),
      makeMatch('m3', 'Mexico', 'Denmark', 2, 0),
      makeMatch('m4', 'South Africa', 'South Korea', 0, 0),
    ];
    const rows = calcGroupStandings(teams, matches);
    expect(rows[0].team).toBe('Mexico');     // 6 pts
    expect(rows[1].team).toBe('South Korea'); // 4 pts
    // South Africa (1pt gd=-3) and Denmark (0pt) below
    expect(rows[3].pts).toBe(0);
  });

  it('alphabetical tiebreak when all else equal', () => {
    const rows = calcGroupStandings(['Beta', 'Alpha'], []);
    expect(rows[0].team).toBe('Alpha');
  });
});

describe('isGroupComplete', () => {
  it('returns false with fewer than 6 matches', () => {
    const matches = [makeMatch('m1', 'Mexico', 'South Africa', 1, 0)];
    expect(isGroupComplete('Group A', matches)).toBe(false);
  });

  it('returns false if any match not finished', () => {
    const matches = [
      makeMatch('m1', 'Mexico', 'South Africa', 1, 0),
      makeMatch('m2', 'South Korea', 'Denmark', 1, 0),
      makeMatch('m3', 'Mexico', 'Denmark', 2, 0),
      makeMatch('m4', 'South Africa', 'South Korea', 0, 0),
      makeMatch('m5', 'Mexico', 'South Korea', 1, 0),
      makeMatch('m6', 'South Africa', 'Denmark', null, null),
    ];
    expect(isGroupComplete('Group A', matches)).toBe(false);
  });

  it('returns true when all 6 finished', () => {
    const matches = Array.from({ length: 6 }, (_, i) =>
      makeMatch(`m${i}`, 'Mexico', 'South Africa', 1, 0)
    );
    expect(isGroupComplete('Group A', matches)).toBe(true);
  });
});
