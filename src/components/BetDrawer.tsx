'use client';

import React, { useState, useEffect } from 'react';
import { Match, Bet, BetType } from '../types';
import Flag from './Flag';
import { apiFetch } from '../lib/apiClient';
import { X, Cpu, Save, Trash2, Calendar, MapPin, Receipt, ShieldAlert, Sparkles } from 'lucide-react';
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
}

export default function BetDrawer({
  isOpen,
  onClose,
  match,
  bets,
  onBetSaved,
  onScoreSynced,
  bettorId = 'self'
}: BetDrawerProps) {
  const [betType, setBetType] = useState<BetType>('1X2');
  const [betSelection, setBetSelection] = useState('');
  const [odds, setOdds] = useState('');
  const [stake, setStake] = useState('');
  const [notes, setNotes] = useState('');

  // Handicap specific
  const [handicapValue, setHandicapValue] = useState('-0.5');
  const [handicapTeam, setHandicapTeam] = useState('1'); // '1' = Team A, '2' = Team B

  // Over/Under specific
  const [ouSelection, setOuSelection] = useState('over');
  const [ouThreshold, setOuThreshold] = useState('2.5');

  // Manual fallback override
  const [showManualSettle, setShowManualSettle] = useState(false);
  const [manualScoreA, setManualScoreA] = useState('');
  const [manualScoreB, setManualScoreB] = useState('');
  const [manualWinner, setManualWinner] = useState('');

  // Syncing states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState('');
  const [syncError, setSyncError] = useState('');
  const [isSavingBet, setIsSavingBet] = useState(false);

  // Derived: no state needed, pure computation from match.date
  const isMatchInPast = match ? new Date(match.date).getTime() < Date.now() : false;

  // Reset manual score fields whenever the active match changes
  useEffect(() => {
    if (match) {
      setManualScoreA(match.scoreA !== null && match.scoreA !== undefined ? String(match.scoreA) : '');
      setManualScoreB(match.scoreB !== null && match.scoreB !== undefined ? String(match.scoreB) : '');
      setManualWinner(match.winner ?? '');
      setSyncSummary('');
      setSyncError('');
    }
  }, [match?.id]);

  // Filter wagers for this match
  const matchBets = bets.filter(b => match && b.matchId === match.id);

  if (!match) return null;

  // Handle Score Syncing via LLM
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
        onScoreSynced(); // Reload data
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

  // Handle Bet Save
  const handleSaveBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!odds || !stake) {
      alert('请填入下注赔率和本金。');
      return;
    }

    setIsSavingBet(true);

    let finalSelection = betSelection;
    const metadata: NonNullable<Bet['metadata']> = {};

    // Assemble fields based on type
    if (betType === '1X2' && !finalSelection) {
      alert('请选择胜平负投注项。');
      setIsSavingBet(false);
      return;
    }

    if (betType === 'handicap') {
      const team = handicapTeam === '1' ? match.teamA : match.teamB;
      finalSelection = team;
      metadata.handicapValue = Number(handicapValue);
    } else if (betType === 'over_under') {
      finalSelection = ouSelection;
      metadata.threshold = Number(ouThreshold);
    }

    try {
      const response = await apiFetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          betType,
          betSelection: finalSelection,
          odds: Number(odds),
          stake: Number(stake),
          metadata,
          notes,
          bettorId
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save bet.');
      }

      // Reset fields
      setOdds('');
      setStake('');
      setNotes('');
      onBetSaved();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsSavingBet(false);
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

        {/* Fixed Header — never scrolls */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-apple-border/10">
          <h2 className="text-md font-bold tracking-tight text-apple-fg flex items-center">
            <Receipt className="mr-2 text-apple-secondary-fg" size={18} />
            赛事投注单
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

            {/* Teams display */}
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

          {/* AI Score Sync Panel (only if match is in the past) */}
          {isMatchInPast && (
            <div className="border border-apple-border/20 rounded-apple-lg p-5 space-y-4 bg-gradient-to-tr from-apple-accent/5 to-transparent">
              <div className="flex items-center space-x-2 text-apple-fg">
                <Cpu size={18} className="text-apple-accent" />
                <h3 className="text-sm font-bold tracking-tight">AI 赛果同步</h3>
              </div>
              <p className="text-xs text-apple-secondary-fg leading-relaxed">
                该场比赛已结束。点击同步，AI 将爬取搜索结果并解析最终比分以结算您的下注。
              </p>

              <button
                onClick={handleScoreSync}
                disabled={isSyncing}
                className="w-full flex items-center justify-center space-x-2 bg-apple-fg text-apple-bg font-semibold text-xs py-2.5 px-4 rounded-apple-md hover:bg-apple-fg/90 transition-all disabled:opacity-50"
              >
                <Sparkles size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? '正在同步中...' : '通过 AI 同步比分'}</span>
              </button>

              {syncSummary && (
                <div className="bg-apple-success/10 border border-apple-success/30 text-apple-success text-xs p-3 rounded-[8px] leading-relaxed">
                  <strong>AI:</strong> {syncSummary}
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

          {/* Place Bet Form */}
          <form onSubmit={handleSaveBet} className="space-y-4">
            <h3 className="text-sm font-bold tracking-tight text-apple-fg">录入投注记录</h3>

            {/* Bet Type Selection */}
            <div>
              <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">投注玩法</label>
              <select
                value={betType}
                onChange={e => {
                  setBetType(e.target.value as BetType);
                  setBetSelection('');
                }}
                className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md px-3 py-2 text-xs font-semibold text-apple-fg focus:outline-none"
              >
                <option value="1X2">胜平负 (1X2)</option>
                <option value="handicap">让球 (Handicap)</option>
                <option value="over_under">大小球 (Over/Under)</option>
                <option value="correct_score">波胆 (Correct Score)</option>
                <option value="custom">自定义 (Custom)</option>
              </select>
            </div>

            {/* Dynamic selection inputs */}
            {betType === '1X2' && (
              <div>
                <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-2 uppercase">选择投注项</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBetSelection(match.teamA)}
                    className={`text-xs py-2 rounded-apple-md font-bold border transition-all truncate px-1 ${
                      betSelection.toLowerCase() === match.teamA.toLowerCase()
                        ? 'bg-apple-accent border-apple-accent text-white'
                        : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
                    }`}
                  >
                    {teamZhName(match.teamA)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetSelection('Draw')}
                    className={`text-xs py-2 rounded-apple-md font-bold border transition-all ${
                      betSelection.toLowerCase() === 'draw'
                        ? 'bg-apple-accent border-apple-accent text-white'
                        : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
                    }`}
                  >
                    平局
                  </button>
                  <button
                    type="button"
                    onClick={() => setBetSelection(match.teamB)}
                    className={`text-xs py-2 rounded-apple-md font-bold border transition-all truncate px-1 ${
                      betSelection.toLowerCase() === match.teamB.toLowerCase()
                        ? 'bg-apple-accent border-apple-accent text-white'
                        : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
                    }`}
                  >
                    {teamZhName(match.teamB)}
                  </button>
                </div>
              </div>
            )}

            {betType === 'handicap' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-2 uppercase">选择受让队伍</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setHandicapTeam('1')}
                      className={`text-xs py-2 rounded-apple-md font-bold border transition-all truncate px-1.5 ${
                        handicapTeam === '1'
                          ? 'bg-apple-accent border-apple-accent text-white'
                          : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
                      }`}
                    >
                      {teamZhName(match.teamA)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHandicapTeam('2')}
                      className={`text-xs py-2 rounded-apple-md font-bold border transition-all truncate px-1.5 ${
                        handicapTeam === '2'
                          ? 'bg-apple-accent border-apple-accent text-white'
                          : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
                      }`}
                    >
                      {teamZhName(match.teamB)}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">让球数值</label>
                  <input 
                    type="text" 
                    placeholder="例如 -1.5, +0.5" 
                    value={handicapValue}
                    onChange={e => setHandicapValue(e.target.value)}
                    className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md p-2 text-xs text-apple-fg focus:outline-none font-semibold"
                  />
                </div>
              </div>
            )}

            {betType === 'over_under' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-2 uppercase">大小球选择</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOuSelection('over')}
                      className={`text-xs py-2 rounded-apple-md font-bold border transition-all ${
                        ouSelection === 'over'
                          ? 'bg-apple-accent border-apple-accent text-white'
                          : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
                      }`}
                    >
                      大球 (Over)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOuSelection('under')}
                      className={`text-xs py-2 rounded-apple-md font-bold border transition-all ${
                        ouSelection === 'under'
                          ? 'bg-apple-accent border-apple-accent text-white'
                          : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
                      }`}
                    >
                      小球 (Under)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">进球线门槛 (大小)</label>
                  <input 
                    type="text" 
                    placeholder="例如 2.5, 3.0" 
                    value={ouThreshold}
                    onChange={e => setOuThreshold(e.target.value)}
                    className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md p-2 text-xs text-apple-fg focus:outline-none font-semibold"
                  />
                </div>
              </div>
            )}

            {betType === 'correct_score' && (
              <div>
                <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">预测具体比分 (波胆)</label>
                <input 
                  type="text" 
                  placeholder="例如 2-1 (主队 - 客队)" 
                  value={betSelection}
                  onChange={e => setBetSelection(e.target.value)}
                  className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md p-2 text-xs text-apple-fg focus:outline-none font-semibold"
                />
              </div>
            )}

            {betType === 'custom' && (
              <div>
                <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">自定义投注描述</label>
                <input 
                  type="text" 
                  placeholder="例如 梅西首发破门、全场产生红牌等" 
                  value={betSelection}
                  onChange={e => setBetSelection(e.target.value)}
                  className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md p-2 text-xs text-apple-fg focus:outline-none font-semibold"
                />
              </div>
            )}

            {/* Odds & Stakes */}
            <div className="flex space-x-3">
              <div className="w-1/2">
                <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">下注赔率</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="例如 1.85" 
                  value={odds}
                  onChange={e => setOdds(e.target.value)}
                  className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md p-2 text-xs text-apple-fg focus:outline-none font-semibold"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">下注本金</label>
                <input 
                  type="number" 
                  placeholder="例如 50"
                  value={stake}
                  onChange={e => setStake(e.target.value)}
                  className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md p-2 text-xs text-apple-fg focus:outline-none font-semibold"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-1 uppercase">理由/备注</label>
              <textarea 
                placeholder="选填，记录投注分析或理由..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md p-2.5 text-xs text-apple-fg focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingBet}
              className="w-full flex items-center justify-center space-x-2 bg-apple-accent hover:bg-apple-accent/90 text-white font-semibold text-xs py-3 rounded-apple-md transition-all disabled:opacity-50"
            >
              <Save size={14} />
              <span>{isSavingBet ? '记录中...' : '记录该笔下注'}</span>
            </button>
          </form>

          {/* Active Wagers list */}
          <div className="border-t border-apple-border/10 pt-6 space-y-4">
            <h3 className="text-sm font-bold tracking-tight text-apple-fg">本场已录入注单 ({matchBets.length})</h3>

            {matchBets.length === 0 ? (
              <div className="text-center py-4 text-xs text-apple-secondary-fg">
                本场比赛暂未录入投注记录。
              </div>
            ) : (
              <div className="space-y-3">
                {matchBets.map(bet => {
                  const statusColors = {
                    pending: 'bg-apple-secondary-bg text-apple-secondary-fg border-apple-border/10',
                    won: 'bg-apple-success/10 text-apple-success border-apple-success/20',
                    lost: 'bg-apple-danger/10 text-apple-danger border-apple-danger/20',
                    void: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20'
                  };

                  const statusLabels = {
                    pending: '待结算',
                    won: '赢 (红单)',
                    lost: '输 (黑单)',
                    void: '走水'
                  };

                  let detailStr = `${bet.betType.toUpperCase()}: ${bet.betSelection}`;
                  if (bet.betType === 'handicap') {
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
