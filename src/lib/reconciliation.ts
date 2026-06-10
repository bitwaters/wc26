import { Player, Bet } from '../types';

export interface PlayerAccount {
  netPnl: number;
  balance: number;
  pendingStake: number;
  isEstimate: boolean;
}

export function calcPlayerAccount(player: Player, bets: Bet[]): PlayerAccount {
  const playerBets = bets.filter(b => (b.bettorId ?? 'self') === player.id);

  const settledBets = playerBets.filter(b => b.status !== 'pending');
  const pendingBets = playerBets.filter(b => b.status === 'pending');

  const netPnl = settledBets.reduce((acc, b) => {
    if (b.status === 'won') return acc + b.stake * (b.odds - 1);
    if (b.status === 'lost') return acc - b.stake;
    return acc; // void
  }, 0);

  const pendingStake = pendingBets.reduce((acc, b) => acc + b.stake, 0);
  const balance = player.initialDeposit + netPnl;

  return { netPnl, balance, pendingStake, isEstimate: pendingBets.length > 0 };
}
