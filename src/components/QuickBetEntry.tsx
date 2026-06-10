'use client';

import React, { useState, useMemo } from 'react';
import { Match, Bet, Player } from '../types';
import Flag from './Flag';
import BetDrawer from './BetDrawer';
import { teamZhName } from '../lib/teamNames';
import { Search } from 'lucide-react';
import { useBettorFilter } from './ClientProviders';

interface QuickBetEntryProps {
  initialMatches: Match[];
  initialBets: Bet[];
  initialPlayers: Player[];
}

export default function QuickBetEntry({ initialMatches, initialBets, initialPlayers }: QuickBetEntryProps) {
  const [search, setSearch] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [bets, setBets] = useState<Bet[]>(initialBets);
  const { bettorId: contextBettorId, setBettorId: setContextBettorId } = useBettorFilter();
  // 记账页默认选第一个具体投注人（context 为 'all' 时 fallback 到 'self'）
  const selectedBettorId = contextBettorId === 'all' ? 'self' : contextBettorId;
  const setSelectedBettorId = (id: string) => setContextBettorId(id);

  const players = initialPlayers;

  const filteredMatches = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return initialMatches;
    return initialMatches.filter(m =>
      m.teamA.toLowerCase().includes(q) ||
      m.teamB.toLowerCase().includes(q) ||
      teamZhName(m.teamA).includes(q) ||
      teamZhName(m.teamB).includes(q) ||
      m.group.toLowerCase().includes(q)
    );
  }, [initialMatches, search]);

  const handleBetSaved = async () => {
    // Reload bets via API
    try {
      const res = await fetch('/api/bets');
      if (res.ok) {
        const data = await res.json();
        setBets(data);
      }
    } catch {
      // ignore
    }
  };

  const handleScoreSynced = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-apple-fg">快速记账</h1>
        <p className="text-apple-secondary-fg text-sm mt-1">搜索比赛，选择投注人，快速录入注单。</p>
      </div>

      {/* Bettor selector */}
      <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        {players.map(player => (
          <button
            key={player.id}
            onClick={() => setSelectedBettorId(player.id)}
            className={`flex-shrink-0 flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              selectedBettorId === player.id
                ? 'text-white border-transparent'
                : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
            }`}
            style={selectedBettorId === player.id ? { backgroundColor: player.color, borderColor: player.color } : {}}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedBettorId === player.id ? 'rgba(255,255,255,0.6)' : player.color }}
            />
            <span>{player.name}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 text-apple-secondary-fg" size={16} />
        <input
          type="text"
          placeholder="搜索球队名、赛事阶段..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-apple-card-bg border border-apple-card-border rounded-apple-xl pl-10 pr-4 py-3 text-sm text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50 backdrop-blur-md shadow-sm"
        />
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-10 text-sm text-apple-secondary-fg">未找到匹配赛事。</div>
        ) : (
          filteredMatches.map(match => {
            const matchBetCount = bets.filter(b => b.matchId === match.id && (b.bettorId ?? 'self') === selectedBettorId).length;
            return (
              <button
                key={match.id}
                onClick={() => setSelectedMatch(match)}
                className="w-full text-left bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-4 backdrop-blur-md shadow-sm hover:border-apple-accent/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col space-y-1">
                      <span className="flex items-center space-x-2 text-sm font-semibold text-apple-fg">
                        <Flag teamName={match.teamA} size={14} />
                        <span>{teamZhName(match.teamA)}</span>
                      </span>
                      <span className="flex items-center space-x-2 text-sm font-semibold text-apple-fg">
                        <Flag teamName={match.teamB} size={14} />
                        <span>{teamZhName(match.teamB)}</span>
                      </span>
                    </div>

                    {match.status === 'finished' && (
                      <span className="text-lg font-bold text-apple-fg">
                        {match.scoreA} - {match.scoreB}
                      </span>
                    )}
                  </div>

                  <div className="text-right space-y-1">
                    <div className="text-[11px] text-apple-secondary-fg font-medium">{match.group}</div>
                    <div className="text-[11px] text-apple-secondary-fg">
                      {new Date(match.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                    </div>
                    {matchBetCount > 0 && (
                      <div className="text-[10px] font-bold text-apple-accent">{matchBetCount} 笔注单</div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Reuse BetDrawer with selected bettorId injected via wrapper */}
      <BetDrawerWithBettor
        match={selectedMatch}
        bets={bets}
        bettorId={selectedBettorId}
        onClose={() => setSelectedMatch(null)}
        onBetSaved={handleBetSaved}
        onScoreSynced={handleScoreSynced}
      />
    </div>
  );
}

// Thin wrapper that passes bettorId into BetDrawer's save call
function BetDrawerWithBettor({
  match,
  bets,
  bettorId,
  onClose,
  onBetSaved,
  onScoreSynced
}: {
  match: Match | null;
  bets: Bet[];
  bettorId: string;
  onClose: () => void;
  onBetSaved: () => void;
  onScoreSynced: () => void;
}) {
  return (
    <BetDrawer
      isOpen={!!match}
      onClose={onClose}
      match={match}
      bets={bets}
      bettorId={bettorId}
      onBetSaved={onBetSaved}
      onScoreSynced={onScoreSynced}
    />
  );
}
