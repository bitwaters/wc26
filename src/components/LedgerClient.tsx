'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Bet, Match, BetType, BetStatus, Player } from '../types';
import { useBettorFilter } from './ClientProviders';
import Flag from './Flag';
import { apiFetch } from '../lib/apiClient';
import { teamZhName } from '../lib/teamNames';
import PlayerChips from './PlayerChips';
import {
  Search,
  Download,
  Upload,
  Trash2
} from 'lucide-react';

const statusLabels: Record<BetStatus, string> = {
  pending: '待结算',
  won: '赢',
  lost: '输',
  void: '走水'
};

interface LedgerClientProps {
  initialBets: Bet[];
  initialMatches: Match[];
  initialPlayers?: Player[];
}

export default function LedgerClient({ initialBets, initialMatches, initialPlayers = [] }: LedgerClientProps) {
  const [bets, setBets] = useState<Bet[]>(initialBets);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<BetStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<BetType | 'all'>('all');
  const { bettorId: filterBettorId, setBettorId: setFilterBettorId } = useBettorFilter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Map matches for easy lookup of names/scores
  const matchMap = useMemo(() => {
    const map = new Map<string, Match>();
    initialMatches.forEach(m => map.set(m.id, m));
    return map;
  }, [initialMatches]);

  // Handle Bet Delete
  const handleDeleteBet = async (betId: string) => {
    if (!confirm('您确定要删除这笔下注记录吗？')) return;
    try {
      const response = await apiFetch(`/api/bets?betId=${betId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('删除下注失败。');
      }

      setBets(prev => prev.filter(b => b.id !== betId));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // Filter wagers
  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      const match = matchMap.get(bet.matchId);
      const teamA = match?.teamA || '';
      const teamB = match?.teamB || '';
      const notes = bet.metadata?.notes || '';
      const selection = bet.betSelection;

      const searchLower = search.toLowerCase();
      const matchesSearch = 
        teamA.toLowerCase().includes(searchLower) ||
        teamB.toLowerCase().includes(searchLower) ||
        notes.toLowerCase().includes(searchLower) ||
        selection.toLowerCase().includes(searchLower);

      const matchesStatus = filterStatus === 'all' || bet.status === filterStatus;
      const matchesType = filterType === 'all' || bet.betType === filterType;
      const matchesBettor = filterBettorId === 'all' || (bet.bettorId ?? 'self') === filterBettorId;

      return matchesSearch && matchesStatus && matchesType && matchesBettor;
    });
  }, [bets, search, filterStatus, filterType, filterBettorId, matchMap]);

  // Export Ledger to JSON file
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "投注账本_bets_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Ledger from JSON file
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const merge = confirm(
          '导入模式选择：\n\n确定 = 合并导入（保留现有记录，同 ID 覆盖）\n取消 = 完全替换（清空现有账本后导入）'
        );

        const response = await apiFetch('/api/bets/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bets: parsed,
            mode: merge ? 'merge' : 'replace'
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to import bets.');
        }

        alert(`成功导入 ${data.count} 笔下注记录！`);
        window.location.reload();
      } catch (err) {
        alert('解析文件失败: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const getSettleDetail = (bet: Bet) => {
    let detail = bet.betSelection;
    if (bet.betType === 'handicap') {
      const val = bet.metadata?.handicapValue;
      detail = `${bet.betSelection} (${val !== undefined && val >= 0 ? '+' : ''}${val})`;
    } else if (bet.betType === 'over_under') {
      detail = `${bet.betSelection.toUpperCase()} ${bet.metadata?.threshold}`;
    }
    return detail;
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      
      {/* Header with action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-apple-fg">下注账本</h1>
          <p className="text-apple-secondary-fg text-sm mt-1">
            查看、搜索并管理您的全部世界杯投注记录。
          </p>
        </div>

        {/* Apple Style Import/Export buttons */}
        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 text-xs font-bold py-2 px-4 bg-apple-secondary-bg hover:bg-apple-border/40 text-apple-fg border border-apple-border/20 rounded-apple-md transition-all shadow-sm"
          >
            <Download size={14} />
            <span>导出备份</span>
          </button>
          
          <button
            onClick={handleImportClick}
            className="flex items-center space-x-2 text-xs font-bold py-2 px-4 bg-apple-secondary-bg hover:bg-apple-border/40 text-apple-fg border border-apple-border/20 rounded-apple-md transition-all shadow-sm"
          >
            <Upload size={14} />
            <span>导入备份</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json"
            className="hidden" 
          />
        </div>
      </div>

      {/* Player filter chips */}
      {initialPlayers.length > 0 && (
        <PlayerChips
          players={initialPlayers}
          bets={bets}
          selectedId={filterBettorId}
          onChange={setFilterBettorId}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-4 sm:p-5 backdrop-blur-md shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 text-apple-secondary-fg" size={16} />
            <input
              type="text"
              placeholder="搜索队伍、赔率、备注等..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md pl-10 pr-4 py-2.5 text-sm text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50"
            />
          </div>

          {/* Select filter dropdowns */}
          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">

            {/* Status Select */}
            <div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as BetStatus | 'all')}
                className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md px-3 py-2.5 text-xs font-bold text-apple-fg focus:outline-none"
              >
                <option value="all">全部结算状态</option>
                <option value="pending">待结算</option>
                <option value="won">红单 (赢)</option>
                <option value="lost">黑单 (输)</option>
                <option value="void">走水 (退款)</option>
              </select>
            </div>

            {/* Type Select */}
            <div>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as BetType | 'all')}
                className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md px-3 py-2.5 text-xs font-bold text-apple-fg focus:outline-none"
              >
                <option value="all">全部投注玩法</option>
                <option value="1X2">胜平负 (1X2)</option>
                <option value="handicap">让球 (Handicap)</option>
                <option value="over_under">大小球 (O/U)</option>
                <option value="correct_score">波胆 (Score)</option>
                <option value="custom">自定义 (Custom)</option>
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* Ledger Table Section */}
      <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl overflow-hidden backdrop-blur-md shadow-sm">
        
        {/* DESKTOP/TABLET TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-apple-border/20 bg-apple-secondary-bg/30 text-[10px] font-bold text-apple-secondary-fg tracking-wider uppercase">
                <th className="py-4 px-6">赛事对阵</th>
                <th className="py-4 px-6">投注人</th>
                <th className="py-4 px-6">比赛日期</th>
                <th className="py-4 px-6">下注详情</th>
                <th className="py-4 px-6">赔率 / 本金</th>
                <th className="py-4 px-6 text-center">结算状态</th>
                <th className="py-4 px-6 text-right">净收益</th>
                <th className="py-4 px-6 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-apple-border/10 text-xs">
              {filteredBets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-apple-secondary-fg">
                    未找到符合过滤条件的下注单。
                  </td>
                </tr>
              ) : (
                filteredBets.map(bet => {
                  const match = matchMap.get(bet.matchId);
                  const settleDetail = getSettleDetail(bet);
                  
                  // Calculate Profit
                  let pnl = 0;
                  if (bet.status === 'won') {
                    pnl = bet.stake * bet.odds - bet.stake;
                  } else if (bet.status === 'lost') {
                    pnl = -bet.stake;
                  }

                  const statusColors = {
                    pending: 'bg-apple-secondary-bg text-apple-secondary-fg border-apple-border/10',
                    won: 'bg-apple-success/10 text-apple-success border-apple-success/20',
                    lost: 'bg-apple-danger/10 text-apple-danger border-apple-danger/20',
                    void: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
                  };

                  return (
                    <tr key={bet.id} className="hover:bg-apple-secondary-bg/20 transition-colors">
                      {/* Match */}
                      <td className="py-4 px-6">
                        {match ? (
                          <div className="flex items-center space-x-3 font-semibold text-apple-fg">
                            <div className="flex flex-col space-y-1">
                              <span className="flex items-center space-x-2">
                                <Flag teamName={match.teamA} size={11} />
                                <span>{teamZhName(match.teamA)}</span>
                              </span>
                              <span className="flex items-center space-x-2">
                                <Flag teamName={match.teamB} size={11} />
                                <span>{teamZhName(match.teamB)}</span>
                              </span>
                            </div>
                            {match.status === 'finished' && (
                              <span className="text-[10px] text-apple-secondary-fg bg-apple-secondary-bg px-1.5 py-0.5 rounded-[4px] border border-apple-border/20">
                                {match.scoreA} - {match.scoreB}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-apple-secondary-fg">未知赛事</span>
                        )}
                      </td>

                      {/* Bettor */}
                      <td className="py-4 px-6">
                        {(() => {
                          const bid = bet.bettorId ?? 'self';
                          const player = initialPlayers.find(p => p.id === bid);
                          return player ? (
                            <span className="flex items-center space-x-1.5 text-xs font-semibold">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: player.color }} />
                              <span className="text-apple-fg">{player.name}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-apple-secondary-fg">已删除</span>
                          );
                        })()}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 text-apple-secondary-fg">
                        {match ? new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '暂无'}
                      </td>

                      {/* Wager selection */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-apple-fg">{settleDetail}</div>
                        <div className="text-[10px] text-apple-secondary-fg font-medium tracking-wide uppercase mt-0.5">
                          {bet.betType}
                        </div>
                      </td>

                      {/* Odds & Stake */}
                      <td className="py-4 px-6">
                        <div className="font-semibold text-apple-fg">@{bet.odds.toFixed(2)}</div>
                        <div className="text-[10px] text-apple-secondary-fg font-medium mt-0.5">
                          {`¥${bet.stake}`}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase ${statusColors[bet.status]}`}>
                          {statusLabels[bet.status]}
                        </span>
                      </td>

                      {/* PnL */}
                      <td className={`py-4 px-6 text-right font-bold ${
                        bet.status === 'won' 
                          ? 'text-apple-success' 
                          : bet.status === 'lost' 
                            ? 'text-apple-danger' 
                            : 'text-apple-secondary-fg'
                      }`}>
                        {bet.status === 'won' ? '+' : ''}
                        {bet.status === 'pending' || bet.status === 'void' ? '—' : `¥${pnl.toFixed(2)}`}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDeleteBet(bet.id)}
                          className="p-1.5 hover:bg-apple-secondary-bg text-apple-secondary-fg hover:text-apple-danger rounded-full transition-colors inline-block"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE LIST CARDS VIEW */}
        <div className="block md:hidden divide-y divide-apple-border/10">
          {filteredBets.length === 0 ? (
            <div className="text-center py-10 text-xs text-apple-secondary-fg">
              未找到符合过滤条件的下注单。
            </div>
          ) : (
            filteredBets.map(bet => {
              const match = matchMap.get(bet.matchId);
              const settleDetail = getSettleDetail(bet);
              
              let pnl = 0;
              if (bet.status === 'won') {
                pnl = bet.stake * bet.odds - bet.stake;
              } else if (bet.status === 'lost') {
                pnl = -bet.stake;
              }

              const statusColors = {
                pending: 'bg-apple-secondary-bg text-apple-secondary-fg border-apple-border/10',
                won: 'bg-apple-success/10 text-apple-success border-apple-success/20',
                lost: 'bg-apple-danger/10 text-apple-danger border-apple-danger/20',
                void: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
              };

              return (
                <div key={bet.id} className="p-4 space-y-4">
                  {/* Match info row */}
                  <div className="flex items-center justify-between">
                    {match ? (
                      <div className="flex items-center space-x-2 font-bold text-apple-fg text-xs">
                        <span className="flex items-center space-x-1.5">
                          <Flag teamName={match.teamA} size={10} />
                          <span className="truncate max-w-[80px]">{teamZhName(match.teamA)}</span>
                        </span>
                        <span className="text-apple-secondary-fg">vs</span>
                        <span className="flex items-center space-x-1.5">
                          <Flag teamName={match.teamB} size={10} />
                          <span className="truncate max-w-[80px]">{teamZhName(match.teamB)}</span>
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-apple-secondary-fg">未知比赛</span>
                    )}

                    <div className="text-[10px] text-apple-secondary-fg font-semibold">
                      {match ? new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '暂无'}
                    </div>
                  </div>

                  {/* Bet details row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-apple-fg">{settleDetail}</div>
                      <div className="text-[9px] text-apple-secondary-fg font-medium tracking-wide uppercase mt-0.5">
                        {bet.betType} • @{bet.odds.toFixed(2)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-apple-secondary-fg font-medium">本金</div>
                      <div className="text-xs font-bold text-apple-fg">
                        {`¥${bet.stake}`}
                      </div>
                    </div>
                  </div>

                  {/* Settle status and profit row */}
                  <div className="flex items-center justify-between pt-2 border-t border-apple-border/5">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-[4px] border text-[8px] font-bold uppercase ${statusColors[bet.status]}`}>
                        {statusLabels[bet.status]}
                      </span>
                      <button
                        onClick={() => handleDeleteBet(bet.id)}
                        className="p-1 hover:bg-apple-secondary-bg text-apple-secondary-fg hover:text-apple-danger rounded-full transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <div className={`text-xs font-bold ${
                      bet.status === 'won' 
                        ? 'text-apple-success' 
                        : bet.status === 'lost' 
                          ? 'text-apple-danger' 
                          : 'text-apple-secondary-fg'
                    }`}>
                      {bet.status === 'won' ? '+' : ''}
                      {bet.status === 'pending' || bet.status === 'void' ? '—' : `¥${pnl.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
