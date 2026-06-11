'use client';

import { Player, Bet, DepositCurrency } from '../types';
import { calcPlayerAccount, CurrencyAccount } from '../lib/reconciliation';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface ReconciliationTableProps {
  players: Player[];
  bets: Bet[];
}

function fmtAmt(n: number, currency: DepositCurrency) {
  const abs = Math.abs(n).toFixed(0);
  return currency === 'USDT' ? `${abs} U` : `¥${abs}`;
}

function AccountRow({ acc }: { acc: CurrencyAccount }) {
  const { currency, deposit, netPnl, balance, pendingStake, isEstimate } = acc;
  const tag = currency === 'USDT'
    ? <span className="text-[8px] font-bold bg-amber-400/20 text-amber-600 px-1 py-0.5 rounded ml-1">USDT</span>
    : null;

  return (
    <div className="grid grid-cols-3 gap-2 text-[11px] py-1">
      <div>
        <div className="text-apple-secondary-fg flex items-center">预存{tag}</div>
        <div className="font-semibold text-apple-fg">{fmtAmt(deposit, currency)}</div>
      </div>
      <div>
        <div className="text-apple-secondary-fg">净盈亏</div>
        <div className={`font-semibold ${netPnl >= 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
          {netPnl >= 0 ? '+' : '-'}{fmtAmt(netPnl, currency)}
        </div>
      </div>
      <div>
        <div className="text-apple-secondary-fg">应还{isEstimate ? ' ~' : ''}</div>
        <div className={`font-bold ${balance > 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
          {fmtAmt(balance, currency)}
          {pendingStake > 0 && (
            <span className="ml-1 text-[9px] text-apple-secondary-fg font-normal">
              (+{fmtAmt(pendingStake, currency)}待)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReconciliationTable({ players, bets }: ReconciliationTableProps) {
  const rows = players.map(player => ({
    player,
    account: calcPlayerAccount(player, bets)
  }));

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-apple-fg">对账汇总</h3>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-apple-border/20 text-[10px] font-bold text-apple-secondary-fg tracking-wider uppercase">
              <th className="py-3 px-4">投注人</th>
              <th className="py-3 px-4 text-right">货币</th>
              <th className="py-3 px-4 text-right">预存</th>
              <th className="py-3 px-4 text-right">已结算净盈亏</th>
              <th className="py-3 px-4 text-right">余额</th>
              <th className="py-3 px-4 text-right">待结算本金</th>
              <th className="py-3 px-4 text-right">应还金额</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-apple-border/10">
            {rows.map(({ player, account }) =>
              account.accounts.map((acc, i) => (
                <tr key={`${player.id}-${acc.currency}`} className="hover:bg-apple-secondary-bg/20">
                  {i === 0 && (
                    <td className="py-3 px-4" rowSpan={account.accounts.length}>
                      <span className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: player.color }} />
                        <span className="font-semibold text-apple-fg">{player.name}</span>
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-4 text-right">
                    {acc.currency === 'USDT'
                      ? <span className="text-[10px] font-bold bg-amber-400/20 text-amber-600 px-1.5 py-0.5 rounded">USDT</span>
                      : <span className="text-[10px] font-bold bg-blue-400/20 text-blue-600 px-1.5 py-0.5 rounded">CNY</span>
                    }
                  </td>
                  <td className="py-3 px-4 text-right text-apple-secondary-fg">{fmtAmt(acc.deposit, acc.currency)}</td>
                  <td className={`py-3 px-4 text-right font-semibold ${acc.netPnl >= 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
                    <span className="flex items-center justify-end space-x-1">
                      {acc.netPnl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>{acc.netPnl >= 0 ? '+' : '-'}{fmtAmt(acc.netPnl, acc.currency)}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-apple-fg">{fmtAmt(acc.balance, acc.currency)}</td>
                  <td className="py-3 px-4 text-right text-apple-secondary-fg">
                    {acc.pendingStake > 0 ? (
                      <span className="flex items-center justify-end space-x-1">
                        <Clock size={11} />
                        <span>{fmtAmt(acc.pendingStake, acc.currency)}</span>
                      </span>
                    ) : '—'}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold ${acc.balance > 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
                    {acc.isEstimate ? '~' : ''}{fmtAmt(acc.balance, acc.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — vertical scroll */}
      <div className="block md:hidden space-y-3 max-h-[320px] overflow-y-auto pr-1">
        {rows.map(({ player, account }) => (
          <div key={player.id} className="p-3 rounded-apple-lg bg-apple-secondary-bg/30 border border-apple-border/20 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.color }} />
              <span className="text-sm font-bold text-apple-fg">{player.name}</span>
            </div>
            <div className="space-y-2 divide-y divide-apple-border/10">
              {account.accounts.map(acc => (
                <div key={acc.currency} className="pt-1.5 first:pt-0">
                  {account.accounts.length > 1 && (
                    <div className="text-[9px] font-bold text-apple-secondary-fg uppercase tracking-wider mb-1">
                      {acc.currency}
                    </div>
                  )}
                  <AccountRow acc={acc} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
