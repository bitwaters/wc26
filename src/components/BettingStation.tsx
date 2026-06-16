'use client';

import React, { useState, useCallback } from 'react';
import { Match, Player, Bet } from '../types';
import { teamZhName } from '../lib/teamNames';
import Flag from './Flag';
import { Search, ChevronLeft, ShoppingCart, X } from 'lucide-react';
import MatchOddsPanel, { OddsSelection, selectionKey } from './MatchOddsPanel';
import BetSlip from './BetSlip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlipItem {
  key: string;
  selection: OddsSelection;
  odds: string;
  betSelection: string;
}

interface BettingStationProps {
  matches: Match[];
  players: Player[];
  recentBets: Bet[];
}

// ---------------------------------------------------------------------------
// MatchCard — hoisted to module scope so React doesn't remount on every render
// ---------------------------------------------------------------------------

function MatchCard({
  match,
  isSelected,
  onClick,
}: {
  match: Match;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isFinished = match.status === 'finished';
  const matchDate = new Date(match.date);
  const dateStr = matchDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  const timeStr = matchDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-apple-xl border transition-all ${
        isSelected
          ? 'bg-apple-accent/10 border-apple-accent/40'
          : 'bg-apple-card-bg border-apple-card-border hover:border-apple-accent/30'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-apple-fg truncate">
            <Flag teamName={match.teamA} size={12} />
            <span className="truncate">{teamZhName(match.teamA)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-apple-fg truncate">
            <Flag teamName={match.teamB} size={12} />
            <span className="truncate">{teamZhName(match.teamB)}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {isFinished ? (
            <div className="text-base font-bold text-apple-fg tabular-nums">
              {match.scoreA} - {match.scoreB}
            </div>
          ) : (
            <div className="text-[11px] text-apple-secondary-fg font-medium">{timeStr}</div>
          )}
          <div className="text-[10px] text-apple-secondary-fg">{dateStr}</div>
          <div className={`text-[10px] font-bold ${isFinished ? 'text-apple-success' : 'text-apple-accent'}`}>
            {isFinished ? '已结束' : match.group}
          </div>
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// BettingStation — top-level client component for /betting
// ---------------------------------------------------------------------------

export default function BettingStation({ matches, players }: BettingStationProps) {
  const [search, setSearch] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Mobile nav: 'list' | 'odds' | 'slip'
  const [mobilePanel, setMobilePanel] = useState<'list' | 'odds' | 'slip'>('list');

  // lg desktop (1024-1280px): show slip panel overlay
  const [showSlipPanel, setShowSlipPanel] = useState(false);

  // Bet slip state
  const [slipItems, setSlipItems] = useState<SlipItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const filteredMatches = matches.filter(m => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      m.teamA.toLowerCase().includes(q) ||
      m.teamB.toLowerCase().includes(q) ||
      teamZhName(m.teamA).includes(q) ||
      teamZhName(m.teamB).includes(q) ||
      m.group.toLowerCase().includes(q)
    );
  });

  const selectedMatch = matches.find(m => m.id === selectedMatchId) ?? null;

  const handleMatchClick = useCallback((matchId: string) => {
    setSelectedMatchId(matchId);
    setMobilePanel('odds');
  }, []);

  const handleSelect = useCallback((selection: OddsSelection | null, key: string) => {
    if (selection === null) {
      setSelectedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setSlipItems(prev => prev.filter(i => i.key !== key));
    } else {
      setSelectedKeys(prev => new Set([...prev, key]));
      setSlipItems(prev => {
        if (prev.some(i => i.key === key)) return prev;
        return [...prev, { key, selection, odds: '', betSelection: selection.betSelection }];
      });
    }
  }, []);

  const handleRemove = useCallback((key: string) => {
    setSlipItems(prev => prev.filter(i => i.key !== key));
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const handleOddsChange = useCallback((key: string, odds: string) => {
    setSlipItems(prev => prev.map(i => (i.key === key ? { ...i, odds } : i)));
  }, []);

  const handleSelectionChange = useCallback((key: string, betSelection: string) => {
    setSlipItems(prev => prev.map(i => (i.key === key ? { ...i, betSelection } : i)));
  }, []);

  const handleClear = useCallback(() => {
    setSlipItems([]);
    setSelectedKeys(new Set());
  }, []);

  const searchBar = (
    <div className="relative">
      <Search className="absolute left-3 top-3 text-apple-secondary-fg" size={15} />
      <input
        type="text"
        placeholder="搜索球队、小组..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-apple-card-bg border border-apple-card-border rounded-apple-xl pl-9 pr-3 py-2.5 text-sm text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50"
      />
    </div>
  );

  const matchListItems = (
    <div className="space-y-1.5">
      {filteredMatches.length === 0 && (
        <div className="text-center py-8 text-sm text-apple-secondary-fg">未找到赛事</div>
      )}
      {filteredMatches.map(match => (
        <MatchCard
          key={match.id}
          match={match}
          isSelected={selectedMatchId === match.id}
          onClick={() => {
            setSelectedMatchId(match.id);
            setMobilePanel('odds');
          }}
        />
      ))}
    </div>
  );

  const oddsPanel = selectedMatch ? (
    <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-2xl overflow-hidden">
      {/* Match header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-apple-border/10">
        <div className="flex items-center gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm font-bold text-apple-fg">
              <Flag teamName={selectedMatch.teamA} size={16} />
              {teamZhName(selectedMatch.teamA)}
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-apple-fg">
              <Flag teamName={selectedMatch.teamB} size={16} />
              {teamZhName(selectedMatch.teamB)}
            </div>
          </div>
          {selectedMatch.status === 'finished' ? (
            <div className="text-3xl font-black text-apple-fg tabular-nums">
              {selectedMatch.scoreA} - {selectedMatch.scoreB}
            </div>
          ) : (
            <div className="text-sm font-semibold text-apple-secondary-fg">
              {new Date(selectedMatch.date).toLocaleDateString('zh-CN', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </div>
          )}
        </div>
        <div className="text-right text-[11px] text-apple-secondary-fg">
          <div className="font-semibold">{selectedMatch.group}</div>
          <div>{selectedMatch.stadium}</div>
          {selectedMatch.status === 'finished' && (
            <div className="text-apple-success font-bold mt-0.5">已结束</div>
          )}
        </div>
      </div>
      {/* Odds — scrollable */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <MatchOddsPanel match={selectedMatch} onSelect={handleSelect} selectedKeys={selectedKeys} />
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-center h-48 text-sm text-apple-secondary-fg bg-apple-card-bg border border-apple-card-border rounded-apple-2xl">
      从左侧选择赛事
    </div>
  );

  const betSlipContent = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-apple-fg">注单栏</h2>
        {slipItems.length > 0 && (
          <button
            onClick={handleClear}
            className="text-[11px] text-apple-secondary-fg hover:text-apple-danger transition-colors"
          >
            清空
          </button>
        )}
      </div>
      <BetSlip
        items={slipItems}
        players={players}
        onRemove={handleRemove}
        onOddsChange={handleOddsChange}
        onSelectionChange={handleSelectionChange}
        onClear={handleClear}
      />
    </div>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <>
      {/* ================================================================== */}
      {/* MOBILE layout (< lg): drill-down panels                            */}
      {/* ================================================================== */}
      <div className="lg:hidden">
        {mobilePanel === 'list' && (
          <div className="space-y-3">
            {slipItems.length > 0 && (
              <button
                onClick={() => setMobilePanel('slip')}
                className="w-full flex items-center justify-between bg-apple-accent text-white text-xs font-bold px-4 py-2.5 rounded-apple-xl"
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart size={14} />
                  注单栏 ({slipItems.length} 项已选)
                </span>
                <span>去填写赔率 →</span>
              </button>
            )}
            {searchBar}
            {matchListItems}
          </div>
        )}

        {mobilePanel === 'odds' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMobilePanel('list')}
                className="flex items-center gap-1 text-apple-accent text-sm font-semibold"
              >
                <ChevronLeft size={18} />
                赛事列表
              </button>
              {slipItems.length > 0 && (
                <button
                  onClick={() => setMobilePanel('slip')}
                  className="flex items-center gap-1.5 bg-apple-accent text-white text-xs font-bold px-3 py-1.5 rounded-full"
                >
                  <ShoppingCart size={12} />
                  注单 ({slipItems.length})
                </button>
              )}
            </div>
            {oddsPanel}
          </div>
        )}

        {mobilePanel === 'slip' && (
          <div className="space-y-3">
            <div className="flex items-center">
              <button
                onClick={() => setMobilePanel(selectedMatchId ? 'odds' : 'list')}
                className="flex items-center gap-1 text-apple-accent text-sm font-semibold"
              >
                <ChevronLeft size={18} />
                {selectedMatchId ? '返回盘口' : '赛事列表'}
              </button>
            </div>
            <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-2xl p-5">
              {betSlipContent}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* MEDIUM DESKTOP (lg – xl): two columns + floating slip panel        */}
      {/* ================================================================== */}
      <div className="hidden lg:flex xl:hidden gap-5 h-full relative">
        {/* Left: match list */}
        <div className="w-52 flex-shrink-0 space-y-3">
          {searchBar}
          <div
            className="space-y-1.5 overflow-y-auto pr-0.5"
            style={{ maxHeight: 'calc(100vh - 200px)', scrollbarWidth: 'thin' }}
          >
            {filteredMatches.length === 0 && (
              <div className="text-center py-8 text-sm text-apple-secondary-fg">未找到赛事</div>
            )}
            {filteredMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                isSelected={selectedMatchId === match.id}
                onClick={() => setSelectedMatchId(match.id)}
              />
            ))}
          </div>
        </div>

        {/* Center: odds panel */}
        <div className="flex-1 min-w-0">
          {oddsPanel}
        </div>

        {/* Floating slip button + dropdown panel */}
        <div className="fixed right-6 top-20 z-40">
          <button
            onClick={() => setShowSlipPanel(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-apple-xl text-xs font-bold shadow-lg transition-all ${
              slipItems.length > 0
                ? 'bg-apple-accent text-white'
                : 'bg-apple-card-bg border border-apple-card-border text-apple-secondary-fg'
            }`}
          >
            <ShoppingCart size={14} />
            注单
            {slipItems.length > 0 && (
              <span className="bg-white/25 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black">
                {slipItems.length}
              </span>
            )}
          </button>

          {showSlipPanel && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-apple-card-bg border border-apple-card-border rounded-apple-2xl shadow-xl p-5">
              <button
                onClick={() => setShowSlipPanel(false)}
                className="absolute top-3 right-3 text-apple-secondary-fg hover:text-apple-fg p-1"
              >
                <X size={14} />
              </button>
              {betSlipContent}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* LARGE DESKTOP (≥ xl): three columns side-by-side                   */}
      {/* ================================================================== */}
      <div className="hidden xl:flex gap-5 h-full">
        {/* Left: match list */}
        <div className="w-52 2xl:w-60 flex-shrink-0 space-y-3">
          {searchBar}
          <div
            className="space-y-1.5 overflow-y-auto pr-0.5"
            style={{ maxHeight: 'calc(100vh - 200px)', scrollbarWidth: 'thin' }}
          >
            {filteredMatches.length === 0 && (
              <div className="text-center py-8 text-sm text-apple-secondary-fg">未找到赛事</div>
            )}
            {filteredMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                isSelected={selectedMatchId === match.id}
                onClick={() => setSelectedMatchId(match.id)}
              />
            ))}
          </div>
        </div>

        {/* Center: odds panel */}
        <div className="flex-1 min-w-0">
          {oddsPanel}
        </div>

        {/* Right: bet slip */}
        <div className="w-60 2xl:w-72 flex-shrink-0">
          <div className="sticky top-6 bg-apple-card-bg border border-apple-card-border rounded-apple-2xl p-5">
            {betSlipContent}
          </div>
        </div>
      </div>
    </>
  );
}

export type { SlipItem };
