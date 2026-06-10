import { describe, it, expect } from 'vitest';
import { calcPlayerAccount } from './reconciliation';
import { Player, Bet } from '../types';

const player: Player = {
  id: 'self',
  name: '我',
  color: '#3b82f6',
  initialDeposit: 500,
  createdAt: '2026-01-01T00:00:00Z'
};

function makeBet(overrides: Partial<Bet>): Bet {
  return {
    id: 'b1',
    matchId: 'm1',
    betType: '1X2',
    betSelection: 'TeamA',
    odds: 2.0,
    stake: 100,
    status: 'pending',
    createdAt: '2026-01-01T00:00:00Z',
    bettorId: 'self',
    ...overrides
  };
}

describe('calcPlayerAccount', () => {
  it('no bets: balance equals initialDeposit', () => {
    const result = calcPlayerAccount(player, []);
    expect(result.netPnl).toBe(0);
    expect(result.balance).toBe(500);
    expect(result.pendingStake).toBe(0);
    expect(result.isEstimate).toBe(false);
  });

  it('won bet: profit = stake * (odds - 1)', () => {
    const bets = [makeBet({ status: 'won', stake: 100, odds: 2.0 })];
    const result = calcPlayerAccount(player, bets);
    expect(result.netPnl).toBe(100);
    expect(result.balance).toBe(600);
    expect(result.isEstimate).toBe(false);
  });

  it('lost bet: profit = -stake', () => {
    const bets = [makeBet({ status: 'lost', stake: 100 })];
    const result = calcPlayerAccount(player, bets);
    expect(result.netPnl).toBe(-100);
    expect(result.balance).toBe(400);
    expect(result.isEstimate).toBe(false);
  });

  it('void bet: no profit impact', () => {
    const bets = [makeBet({ status: 'void', stake: 100 })];
    const result = calcPlayerAccount(player, bets);
    expect(result.netPnl).toBe(0);
    expect(result.balance).toBe(500);
  });

  it('pending bet: pendingStake and isEstimate', () => {
    const bets = [makeBet({ status: 'pending', stake: 80 })];
    const result = calcPlayerAccount(player, bets);
    expect(result.netPnl).toBe(0);
    expect(result.pendingStake).toBe(80);
    expect(result.isEstimate).toBe(true);
  });

  it('only counts bets matching player.id', () => {
    const bets = [
      makeBet({ status: 'won', stake: 100, odds: 2.0, bettorId: 'self' }),
      makeBet({ id: 'b2', status: 'won', stake: 200, odds: 3.0, bettorId: 'p_other' })
    ];
    const result = calcPlayerAccount(player, bets);
    expect(result.netPnl).toBe(100);
  });

  it('mixed settled and pending bets', () => {
    const bets = [
      makeBet({ id: 'b1', status: 'won', stake: 100, odds: 2.0 }),
      makeBet({ id: 'b2', status: 'lost', stake: 50 }),
      makeBet({ id: 'b3', status: 'pending', stake: 30 })
    ];
    const result = calcPlayerAccount(player, bets);
    expect(result.netPnl).toBe(50);  // 100 - 50
    expect(result.balance).toBe(550);
    expect(result.pendingStake).toBe(30);
    expect(result.isEstimate).toBe(true);
  });
});
