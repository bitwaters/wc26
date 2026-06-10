'use client';

import { Player, Bet } from '../types';
import { calcPlayerAccount } from '../lib/reconciliation';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface ReconciliationTableProps {
  players: Player[];
  bets: Bet[];
}

export default function ReconciliationTable({ players, bets }: ReconciliationTableProps) {
  const rows = players.map(player => ({
    player,
    account: calcPlayerAccount(player, bets)
  }));

  const fmt = (n: number) =>
    `¥${Math.abs(n).toFixed(0)}`;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-apple-fg">对账汇总</h3>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-apple-border/20 text-[10px] font-bold text-apple-secondary-fg tracking-wider uppercase">
              <th className="py-3 px-4">投注人</th>
              <th className="py-3 px-4 text-right">预存</th>
              <th className="py-3 px-4 text-right">已结算净盈亏</th>
              <th className="py-3 px-4 text-right">余额</th>
              <th className="py-3 px-4 text-right">待结算本金</th>
              <th className="py-3 px-4 text-right">应还金额</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apple-border/10">
            {rows.map(({ player, account }) => (
              <tr key={player.id} className="hover:bg-apple-secondary-bg/20">
                <td className="py-3 px-4">
                  <span className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: player.color }} />
                    <span className="font-semibold text-apple-fg">{player.name}</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-apple-secondary-fg">{fmt(player.initialDeposit)}</td>
                <td className={`py-3 px-4 text-right font-semibold ${account.netPnl >= 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
                  <span className="flex items-center justify-end space-x-1">
                    {account.netPnl >= 0
                      ? <TrendingUp size={12} />
                      : <TrendingDown size={12} />}
                    <span>{account.netPnl >= 0 ? '+' : '-'}{fmt(account.netPnl)}</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-semibold text-apple-fg">{fmt(account.balance)}</td>
                <td className="py-3 px-4 text-right text-apple-secondary-fg">
                  {account.pendingStake > 0 ? (
                    <span className="flex items-center justify-end space-x-1">
                      <Clock size={11} />
                      <span>{fmt(account.pendingStake)}</span>
                    </span>
                  ) : '—'}
                </td>
                <td className={`py-3 px-4 text-right font-bold ${account.balance > 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
                  {account.isEstimate ? '~' : ''}{fmt(account.balance)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden space-y-3">
        {rows.map(({ player, account }) => (
          <div key={player.id} className="p-3 rounded-apple-lg bg-apple-secondary-bg/30 border border-apple-border/20 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.color }} />
              <span className="text-sm font-bold text-apple-fg">{player.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <div className="text-apple-secondary-fg">预存</div>
                <div className="font-semibold text-apple-fg">{fmt(player.initialDeposit)}</div>
              </div>
              <div>
                <div className="text-apple-secondary-fg">净盈亏</div>
                <div className={`font-semibold ${account.netPnl >= 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
                  {account.netPnl >= 0 ? '+' : '-'}{fmt(account.netPnl)}
                </div>
              </div>
              <div>
                <div className="text-apple-secondary-fg">应还</div>
                <div className={`font-bold ${account.balance > 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
                  {account.isEstimate ? '~' : ''}{fmt(account.balance)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
