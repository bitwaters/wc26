import { Player, Bet, DepositCurrency } from '../types';

export interface CurrencyAccount {
  currency: DepositCurrency;
  deposit: number;       // 该货币的初始预存
  netPnl: number;        // 已结算净盈亏
  balance: number;       // deposit + netPnl
  pendingStake: number;  // 待结算本金
  isEstimate: boolean;   // 有待结算注单时为 true
}

export interface PlayerAccount {
  accounts: CurrencyAccount[]; // 只包含有数据的货币
}

function calcCurrencyAccount(
  currency: DepositCurrency,
  deposit: number,
  bets: Bet[]
): CurrencyAccount {
  const currBets = bets.filter(b => (b.stakeCurrency ?? 'CNY') === currency);

  const settledBets = currBets.filter(b => b.status !== 'pending');
  const pendingBets = currBets.filter(b => b.status === 'pending');

  const netPnl = settledBets.reduce((acc, b) => {
    if (b.status === 'won') return acc + b.stake * (b.odds - 1);
    if (b.status === 'lost') return acc - b.stake;
    return acc; // void
  }, 0);

  const pendingStake = pendingBets.reduce((acc, b) => acc + b.stake, 0);
  const balance = deposit + netPnl;

  return { currency, deposit, netPnl, balance, pendingStake, isEstimate: pendingBets.length > 0 };
}

export function calcPlayerAccount(player: Player, bets: Bet[]): PlayerAccount {
  const playerBets = bets.filter(b => (b.bettorId ?? 'self') === player.id);

  // 判断该玩家涉及哪些货币
  const currencies = new Set<DepositCurrency>(['CNY']);
  // 预存货币算作一种
  if (player.depositCurrency) currencies.add(player.depositCurrency);
  // 注单里出现的货币
  playerBets.forEach(b => currencies.add(b.stakeCurrency ?? 'CNY'));

  const accounts: CurrencyAccount[] = [];

  currencies.forEach(currency => {
    const deposit = (player.depositCurrency ?? 'CNY') === currency ? player.initialDeposit : 0;
    const acc = calcCurrencyAccount(currency, deposit, playerBets);
    // 只保留有实际数据的货币：calcCurrencyAccount 已过滤，pendingStake>0 或 netPnl≠0 或有预存即保留
    if (deposit > 0 || acc.pendingStake > 0 || acc.netPnl !== 0) {
      accounts.push(acc);
    }
  });

  // CNY 在前，USDT 在后
  accounts.sort((a, b) => (a.currency === 'CNY' ? -1 : 1) - (b.currency === 'CNY' ? -1 : 1));

  return { accounts };
}
