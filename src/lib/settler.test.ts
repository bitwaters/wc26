import { describe, it, expect } from 'vitest';
import { settleBet, settleAllBets } from './settler';
import { Bet, Match } from '../types';

const finishedMatch: Match = {
  id: 'match_1',
  group: 'Group A',
  teamA: 'Mexico',
  teamB: 'South Africa',
  scoreA: 2,
  scoreB: 1,
  date: '2026-06-01T00:00:00Z',
  stadium: 'Test',
  status: 'finished'
};

describe('settleBet', () => {
  it('settles 1X2 home win', () => {
    const bet: Bet = {
      id: 'b1',
      matchId: 'match_1',
      betType: '1X2',
      betSelection: 'Mexico',
      odds: 2,
      stake: 10,
      status: 'pending',
      createdAt: '2026-06-01T00:00:00Z'
    };
    expect(settleBet(bet, finishedMatch)).toBe('won');
  });

  it('settles handicap push as void', () => {
    const drawMatch: Match = { ...finishedMatch, scoreA: 1, scoreB: 1 };
    const bet: Bet = {
      id: 'b2',
      matchId: 'match_1',
      betType: 'handicap',
      betSelection: 'Mexico',
      odds: 1.9,
      stake: 10,
      status: 'pending',
      createdAt: '2026-06-01T00:00:00Z',
      metadata: { handicapValue: 0 }
    };
    expect(settleBet(bet, drawMatch)).toBe('void');
  });

  it('keeps custom bet status unchanged', () => {
    const bet: Bet = {
      id: 'b3',
      matchId: 'match_1',
      betType: 'custom',
      betSelection: 'Red card',
      odds: 5,
      stake: 10,
      status: 'won',
      createdAt: '2026-06-01T00:00:00Z'
    };
    expect(settleBet(bet, finishedMatch)).toBe('won');
  });
});

describe('settleAllBets', () => {
  it('re-settles when score correction changes outcome', () => {
    const bets: Bet[] = [{
      id: 'b1',
      matchId: 'match_1',
      betType: '1X2',
      betSelection: 'Mexico',
      odds: 2,
      stake: 10,
      status: 'lost',
      createdAt: '2026-06-01T00:00:00Z'
    }];

    const { updatedBets, changedCount } = settleAllBets(bets, [finishedMatch]);
    expect(updatedBets[0].status).toBe('won');
    expect(changedCount).toBe(1);
  });
});
