'use client';

import React, { useState, useEffect } from 'react';
import { Match, Bet, DepositCurrency } from '../types';
import Flag from './Flag';
import { apiFetch } from '../lib/apiClient';
import { X, Cpu, Trash2, Calendar, MapPin, Receipt, ShieldAlert, Sparkles } from 'lucide-react';
import { teamZhName } from '../lib/teamNames';

const KNOCKOUT_GROUPS = new Set([
  'Round of 32',
  'Round of 16',
  'Quarterfinals',
  'Semifinals',
  'Third Place Match',
  'Final'
]);

function isKnockoutMatch(match: Match): boolean {
  return KNOCKOUT_GROUPS.has(match.group);
}

interface BetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  bets: Bet[];
  onBetSaved: () => void;
  onScoreSynced: () => void;
  bettorId?: string;
  defaultStakeCurrency?: DepositCurrency;
}

export default function BetDrawer({
  isOpen,
  onClose,
  match,
  bets,
  onScoreSynced,
  onBetSaved,
}: BetDrawerProps) {
  // Manual settle fields
  const [showManualSettle, setShowManualSettle] = useState(false);
  const [manualScoreA, setManualScoreA] = useState('');
  const [manualScoreB, setManualScoreB] = useState('');
  const [manualWinner, setManualWinner] = useState('');

  // Syncing states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState('');
  const [syncError, setSyncError] = useState('');

  const isMatchInPast = match ? new Date(match.date).getTime() < Date.now() : false;

  useEffect(() => {
    if (match) {
      setManualScoreA(match.scoreA !== null && match.scoreA !== undefined ? String(match.scoreA) : '');
      setManualScoreB(match.scoreB !== null && match.scoreB !== undefined ? String(match.scoreB) : '');
      setManualWinner(match.winner ?? '');
      setSyncSummary('');
      setSyncError('');
    }
  }, [match?.id]);

  const matchBets = bets.filter(b => match && b.matchId === match.id);

  if (!match) return null;

  // Handle Score Syncing via ESPN/LLM
  const handleScoreSync = async () => {
    setIsSyncing(true);
    setSyncError('');
    setSyncSummary('');
    try {
      const response = await apiFetch('/api/sync-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '同步比分失败。');
      }

      if (data.success) {
        setSyncSummary(data.summary || '比分已成功更新！');
        onScoreSynced();
      } else {
        setSyncError(data.reason || '比赛尚未结束。');
      }
    } catch (e) {
      setSyncError((e as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Manual Score Settle
  const handleManualSettle = async () => {
    if (manualScoreA === '' || manualScoreB === '') {
      alert('请完整填写双方比分。');
      return;
    }

    const scoreA = Number(manualScoreA);
    const scoreB = Number(manualScoreB);

    if (isKnockoutMatch(match) && scoreA === scoreB && !manualWinner) {
      alert('淘汰赛平局请指定点球/加时胜者。');
      return;
    }

    try {
      const response = await apiFetch('/api/manual-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          scoreA,
          scoreB,
          winner: manualWinner || undefined
        })
      });

      if (!response.ok) {
        throw new Error('手动结算比分失败。');
      }

      onScoreSynced();
      setShowManualSettle(false);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // Handle Bet Delete
  const handleDeleteBet = async (betId: string) => {
    if (!confirm('您确定要删除这笔下注记录吗？')) return;
    try {
      const response = await apiFetch(`/api/bets?betId=${betId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('删除下注单失败。');
      }

      onBetSaved();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Bottom Sheet Panel */}
      <div className={`fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[88vh] bg-apple-bg rounded-t-[24px] border-t border-apple-border/20 shadow-2xl transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-y-0' : 'translate-y-full'
      }`}>
        {/* Drag handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-apple-border/50" />
        </div>

        {/* Fixed Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-apple-border/10">
          <h2 className="text-md font-bold tracking-tight text-apple-fg flex items-center">
            <Receipt className="mr-2 text-apple-secondary-fg" size={18} />
            赛事详情
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-apple-secondary-bg text-apple-secondary-fg hover:text-apple-fg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6 pb-10">

          {/* Match Details */}
          <div className="bg-apple-secondary-bg/40 border border-apple-border/10 rounded-apple-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-[11px] text-apple-secondary-fg font-semibold tracking-wider uppercase">
              <span>{match.group}</span>
              <span className="flex items-center">
                <Calendar size={12} className="mr-1" />
                {new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex flex-col items-center space-y-1.5 w-5/12 text-center">
                <Flag teamName={match.teamA} size={20} />
                <span className="text-xs font-bold text-apple-fg truncate w-full">{teamZhName(match.teamA)}</span>
              </div>

              <div className="text-sm font-semibold text-apple-secondary-fg w-2/12 text-center">
                {match.status === 'finished' ? (
                  <span className="text-lg font-bold text-apple-fg">
                    {match.scoreA} - {match.scoreB}
                  </span>
                ) : (
                  <span>VS</span>
                )}
              </div>

              <div className="flex flex-col items-center space-y-1.5 w-5/12 text-center">
                <Flag teamName={match.teamB} size={20} />
                <span className="text-xs font-bold text-apple-fg truncate w-full">{teamZhName(match.teamB)}</span>
              </div>
            </div>

            <div className="flex items-center text-[11px] text-apple-secondary-fg border-t border-apple-border/5 pt-2">
              <MapPin size={12} className="mr-1 flex-shrink-0" />
              <span className="truncate">{match.stadium}</span>
            </div>
          </div>

          {/* Score Sync Panel (only if match is in the past and not yet finished) */}
          {isMatchInPast && (
            <div className="border border-apple-border/20 rounded-apple-lg p-5 space-y-4 bg-gradient-to-tr from-apple-accent/5 to-transparent">
              <div className="flex items-center space-x-2 text-apple-fg">
                <Cpu size={18} className="text-apple-accent" />
                <h3 className="text-sm font-bold tracking-tight">比分同步</h3>
              </div>
              <p className="text-xs text-apple-secondary-fg leading-relaxed">
                同步该场比赛最终比分并自动结算相关注单。
              </p>

              <button
                onClick={handleScoreSync}
                disabled={isSyncing}
                className="w-full flex items-center justify-center space-x-2 bg-apple-fg text-apple-bg font-semibold text-xs py-2.5 px-4 rounded-apple-md hover:bg-apple-fg/90 transition-all disabled:opacity-50"
              >
                <Sparkles size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? '正在同步中...' : '同步比分'}</span>
              </button>

              {syncSummary && (
                <div className="bg-apple-success/10 border border-apple-success/30 text-apple-success text-xs p-3 rounded-[8px] leading-relaxed">
                  {syncSummary}
                </div>
              )}

              {syncError && (
                <div className="bg-apple-danger/10 border border-apple-danger/30 text-apple-danger text-xs p-3 rounded-[8px] space-y-2">
                  <div className="flex items-center space-x-1.5">
                    <ShieldAlert size={14} />
                    <strong>同步失败</strong>
                  </div>
                  <p className="leading-relaxed">{syncError}</p>
                  <button
                    onClick={() => setShowManualSettle(prev => !prev)}
                    className="text-[10px] underline block text-apple-danger/80 hover:text-apple-danger font-semibold uppercase tracking-wider"
                  >
                    {showManualSettle ? '隐藏手动录入' : '手动录入比分'}
                  </button>
                </div>
              )}

              {showManualSettle && (
                <div className="border-t border-apple-border/10 pt-3 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-1/2">
                      <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">主队比分 ({teamZhName(match.teamA)})</label>
                      <input
                        type="number"
                        value={manualScoreA}
                        onChange={e => setManualScoreA(e.target.value)}
                        className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md p-2 text-sm text-apple-fg focus:outline-none"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">客队比分 ({teamZhName(match.teamB)})</label>
                      <input
                        type="number"
                        value={manualScoreB}
                        onChange={e => setManualScoreB(e.target.value)}
                        className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md p-2 text-sm text-apple-fg focus:outline-none"
                      />
                    </div>
                  </div>
                  {isKnockoutMatch(match) &&
                    manualScoreA !== '' &&
                    manualScoreB !== '' &&
                    Number(manualScoreA) === Number(manualScoreB) && (
                    <div>
                      <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">点球/加时胜者</label>
                      <select
                        value={manualWinner}
                        onChange={e => setManualWinner(e.target.value)}
                        className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md p-2 text-xs text-apple-fg focus:outline-none"
                      >
                        <option value="">请选择胜者</option>
                        <option value={match.teamA}>{teamZhName(match.teamA)}</option>
                        <option value={match.teamB}>{teamZhName(match.teamB)}</option>
                      </select>
                    </div>
                  )}
                  <button
                    onClick={handleManualSettle}
                    className="w-full text-xs font-bold py-2 bg-apple-secondary-bg hover:bg-apple-border/40 text-apple-fg border border-apple-border/20 rounded-apple-md transition-colors"
                  >
                    确认手动结算比分
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Existing wagers for this match */}
          <div className="border-t border-apple-border/10 pt-6 space-y-4">
            <h3 className="text-sm font-bold tracking-tight text-apple-fg">本场已录入注单 ({matchBets.length})</h3>

            {matchBets.length === 0 ? (
              <div className="text-center py-4 text-xs text-apple-secondary-fg">
                本场比赛暂未录入投注记录。前往<a href="/betting" className="text-apple-accent underline ml-0.5">投注台</a>记账。
              </div>
            ) : (
              <div className="space-y-3">
                {matchBets.map(bet => {
                  const statusColors: Record<string, string> = {
                    pending: 'bg-apple-secondary-bg text-apple-secondary-fg border-apple-border/10',
                    won: 'bg-apple-success/10 text-apple-success border-apple-success/20',
                    half_won: 'bg-apple-success/5 text-apple-success/70 border-apple-success/10',
                    lost: 'bg-apple-danger/10 text-apple-danger border-apple-danger/20',
                    half_lost: 'bg-apple-danger/5 text-apple-danger/70 border-apple-danger/10',
                    void: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
                  };

                  const statusLabels: Record<string, string> = {
                    pending: '待结算',
                    won: '赢 (红单)',
                    half_won: '半赢',
                    lost: '输 (黑单)',
                    half_lost: '半输',
                    void: '走水'
                  };

                  let detailStr = `${bet.betType.toUpperCase()}: ${bet.betSelection}`;
                  if (bet.betType === 'handicap' || bet.betType === 'asian_handicap') {
                    const hcVal = bet.metadata?.handicapValue ?? 0;
                    detailStr = `让球: ${bet.betSelection} (${hcVal >= 0 ? '+' : ''}${hcVal})`;
                  } else if (bet.betType === 'over_under') {
                    detailStr = `大小球: ${bet.betSelection === 'over' ? '大' : '小'} ${bet.metadata?.threshold}`;
                  }

                  return (
                    <div
                      key={bet.id}
                      className="flex items-center justify-between p-3 rounded-apple-lg border border-apple-border/20 bg-apple-secondary-bg/20 text-xs"
                    >
                      <div className="space-y-1 w-9/12">
                        <div className="font-semibold text-apple-fg truncate">{detailStr}</div>
                        <div className="flex items-center space-x-2 text-[10px] text-apple-secondary-fg font-medium">
                          <span>赔率: {bet.odds.toFixed(2)}</span>
                          <span>•</span>
                          <span>本金: ¥{bet.stake}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 w-3/12 justify-end">
                        <span className={`px-2 py-0.5 rounded-[4px] border text-[9px] font-bold uppercase ${statusColors[bet.status]}`}>
                          {statusLabels[bet.status]}
                        </span>

                        <button
                          onClick={() => handleDeleteBet(bet.id)}
                          className="p-1 hover:bg-apple-secondary-bg text-apple-secondary-fg hover:text-apple-danger rounded-full transition-colors"
                          title="删除投注记录"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
