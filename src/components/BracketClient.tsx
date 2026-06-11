'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Predictions, Match, Bet } from '../types';
import { resolveBracketMatches } from '../lib/bracketResolver';
import BracketMatchCard from './BracketMatchCard';
import BetDrawer from './BetDrawer';
import { apiFetch } from '../lib/apiClient';
import { Award, Edit3, Smartphone, Eye } from 'lucide-react';

interface BracketClientProps {
  initialPredictions: Predictions;
  initialMatches: Match[];
  initialBets: Bet[];
}

const rounds = [
  { id: 'r32', label: '32强', startIdx: 72, count: 16 },
  { id: 'r16', label: '16强', startIdx: 88, count: 8 },
  { id: 'qf', label: '1/4决赛', startIdx: 96, count: 4 },
  { id: 'sf', label: '半决赛', startIdx: 100, count: 2 },
  { id: 'final', label: '决赛 & 季军赛', startIdx: 102, count: 2 } // Final & 3rd place
];

export default function BracketClient({ 
  initialPredictions, 
  initialMatches, 
  initialBets 
}: BracketClientProps) {
  const [track, setTrack] = useState<'sandbox' | 'live'>('sandbox');
  const [predictions, setPredictions] = useState<Predictions>(initialPredictions);
  const [matches] = useState<Match[]>(initialMatches);
  const [bets, setBets] = useState<Bet[]>(initialBets);
  const [activeMobileTab, setActiveMobileTab] = useState<string>('r32');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const reloadData = async () => {
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

  const reloadAll = () => {
    window.location.reload();
  };

  // Slices matches by round
  const roundMatchesMap = useMemo(() => {
    // First, resolve the placeholders in the matches list based on the predictions
    const resolvedMatches = resolveBracketMatches(track, predictions, matches);
    
    const map: Record<string, Match[]> = {};
    rounds.forEach(r => {
      map[r.id] = resolvedMatches.slice(r.startIdx, r.startIdx + r.count);
    });
    return map;
  }, [track, predictions, matches]);

  // Handle selecting predicted winner in Sandbox mode
  const handleSelectWinner = async (matchId: string, teamName: string) => {
    const updatedBracket = { ...predictions.bracket };
    
    // Toggle or update
    if (updatedBracket[matchId] === teamName) {
      delete updatedBracket[matchId];
    } else {
      updatedBracket[matchId] = teamName;
    }

    // Recursively clear downstream predictions that depend on this match outcome
    const clearDownstream = (mid: string, bracketObj: Record<string, string>) => {
      const cleanMid = mid.replace('match_', '');
      // Look for matches referencing this winner or loser
      matches.forEach(m => {
        if (
          m.teamA.includes(`Winner Match ${cleanMid}`) || 
          m.teamA.includes(`Loser Match ${cleanMid}`) ||
          m.teamB.includes(`Winner Match ${cleanMid}`) ||
          m.teamB.includes(`Loser Match ${cleanMid}`)
        ) {
          delete bracketObj[m.id];
          clearDownstream(m.id, bracketObj);
        }
      });
    };

    clearDownstream(matchId, updatedBracket);

    const newPredictions = {
      ...predictions,
      bracket: updatedBracket
    };

    setPredictions(newPredictions);

    // Save predictions to data/predictions.json
    try {
      await apiFetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bracket: updatedBracket })
      });
    } catch (e) {
      console.error('Failed to save predicted winner:', e);
    }
  };

  const handleOpenBetSlip = (match: Match) => {
    // To make sure we open the drawer with the original matches list containing placeholders
    // (which we need inside the BetDrawer for resolving teams), we pass the original match
    const original = matches.find(m => m.id === match.id) || match;
    setSelectedMatch(original);
    setIsDrawerOpen(true);
  };

  // Handle manual/drag scroll tracking (desktop only)
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Detect which column is closest to the left of the scroll container
    let closestRoundId = 'r32';
    let minDistance = Infinity;

    rounds.forEach(r => {
      const col = columnRefs.current[r.id];
      if (col) {
        const distance = Math.abs(col.offsetLeft - container.scrollLeft - container.offsetLeft - 16);
        if (distance < minDistance) {
          minDistance = distance;
          closestRoundId = r.id;
        }
      }
    });

    if (activeMobileTab !== closestRoundId) {
      setActiveMobileTab(closestRoundId);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8 pb-10">
      
      {/* Header Segment */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-apple-fg flex items-center">
            <Award className="mr-3 text-apple-accent" size={32} />
            淘汰赛对阵图
          </h1>
          <p className="text-apple-secondary-fg text-sm mt-1">
            {track === 'sandbox' 
              ? '点击队伍即可预测比赛结果并填写您的淘汰赛对阵图。' 
              : '追踪世界杯真实赛果，并与您的预测进行对比。'}
          </p>
        </div>

        {/* Dual Track Controller */}
        <div className="inline-flex p-0.5 rounded-apple-md bg-apple-secondary-bg border border-apple-border/20 self-start md:self-auto z-10 shadow-sm">
          <button
            onClick={() => setTrack('sandbox')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-apple-sm text-xs font-semibold transition-all duration-200 ${
              track === 'sandbox'
                ? 'bg-apple-bg text-apple-fg shadow-sm'
                : 'text-apple-secondary-fg hover:text-apple-fg'
            }`}
          >
            <Edit3 size={14} />
            <span>沙盒预测</span>
          </button>
          <button
            onClick={() => setTrack('live')}
            className={`flex items-center space-x-2 px-4 py-1.5 rounded-apple-sm text-xs font-semibold transition-all duration-200 ${
              track === 'live'
                ? 'bg-apple-bg text-apple-fg shadow-sm'
                : 'text-apple-secondary-fg hover:text-apple-fg'
            }`}
          >
            <Eye size={14} />
            <span>实时赛况</span>
          </button>
        </div>
      </div>

      {/* Mobile Round Tabs */}
      <div className="flex lg:hidden overflow-x-auto pb-2 border-b border-apple-border/10 space-x-2 scrollbar-none z-10">
        {rounds.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveMobileTab(r.id)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              activeMobileTab === r.id
                ? 'bg-apple-accent border-apple-accent text-white shadow-sm'
                : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Mobile: 按轮次列表视图 */}
      <div className="lg:hidden space-y-3">
        {roundMatchesMap[activeMobileTab]?.map((match, idx) => {
          const roundIdx = rounds.findIndex(r => r.id === activeMobileTab);
          const isFinal = activeMobileTab === 'final';
          return (
            <div key={match.id}>
              {isFinal && (
                <div className="text-[10px] font-bold text-apple-accent tracking-wider uppercase mb-1 px-1">
                  {idx === 0 ? 'World Cup Final' : 'Third Place Playoff'}
                </div>
              )}
              <BracketMatchCard
                match={match}
                originalMatch={initialMatches[rounds[roundIdx].startIdx + idx]}
                track={track}
                predictions={predictions}
                matches={matches}
                bets={bets}
                onSelectWinner={handleSelectWinner}
                onOpenBetSlip={handleOpenBetSlip}
              />
            </div>
          );
        })}
      </div>

      {/* Desktop: 横向树状对阵图 */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="hidden lg:flex w-full overflow-x-auto select-none grab-scroll-container pb-10 space-x-8 scroll-smooth items-center snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
      >
        
        {/* ROUND of 32 COLUMN */}
        <div 
          ref={el => { columnRefs.current['r32'] = el; }}
          className="flex flex-col justify-around h-[1600px] py-4 space-y-4 snap-start flex-shrink-0"
        >
          {roundMatchesMap['r32']?.map((match, idx) => (
            <BracketMatchCard
              key={match.id}
              match={match}
              originalMatch={initialMatches[rounds[0].startIdx + idx]}
              track={track}
              predictions={predictions}
              matches={matches}
              bets={bets}
              onSelectWinner={handleSelectWinner}
              onOpenBetSlip={handleOpenBetSlip}
            />
          ))}
        </div>

        {/* SVG Connector 1 (R32 -> R16) */}
        <div className="hidden md:flex flex-col justify-around h-[1600px] w-8 text-apple-border/15 flex-shrink-0 select-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <svg key={i} className="h-[96px] w-8" viewBox="0 0 32 64" preserveAspectRatio="none">
              <path d="M 0 8 L 16 8 L 16 32 L 32 32 M 16 32 L 16 56 L 0 56" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ))}
        </div>

        {/* ROUND of 16 COLUMN */}
        <div 
          ref={el => { columnRefs.current['r16'] = el; }}
          className="flex flex-col justify-around h-[1600px] py-4 space-y-8 snap-start flex-shrink-0"
        >
          {roundMatchesMap['r16']?.map((match, idx) => (
            <BracketMatchCard
              key={match.id}
              match={match}
              originalMatch={initialMatches[rounds[1].startIdx + idx]}
              track={track}
              predictions={predictions}
              matches={matches}
              bets={bets}
              onSelectWinner={handleSelectWinner}
              onOpenBetSlip={handleOpenBetSlip}
            />
          ))}
        </div>

        {/* SVG Connector 2 (R16 -> QF) */}
        <div className="hidden md:flex flex-col justify-around h-[1600px] w-8 text-apple-border/15 flex-shrink-0 select-none">
          {Array.from({ length: 4 }).map((_, i) => (
            <svg key={i} className="h-[192px] w-8" viewBox="0 0 32 128" preserveAspectRatio="none">
              <path d="M 0 16 L 16 16 L 16 64 L 32 64 M 16 64 L 16 112 L 0 112" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ))}
        </div>

        {/* QUARTERFINALS COLUMN */}
        <div 
          ref={el => { columnRefs.current['qf'] = el; }}
          className="flex flex-col justify-around h-[1600px] py-4 space-y-16 snap-start flex-shrink-0"
        >
          {roundMatchesMap['qf']?.map((match, idx) => (
            <BracketMatchCard
              key={match.id}
              match={match}
              originalMatch={initialMatches[rounds[2].startIdx + idx]}
              track={track}
              predictions={predictions}
              matches={matches}
              bets={bets}
              onSelectWinner={handleSelectWinner}
              onOpenBetSlip={handleOpenBetSlip}
            />
          ))}
        </div>

        {/* SVG Connector 3 (QF -> SF) */}
        <div className="hidden md:flex flex-col justify-around h-[1600px] w-8 text-apple-border/15 flex-shrink-0 select-none">
          {Array.from({ length: 2 }).map((_, i) => (
            <svg key={i} className="h-[384px] w-8" viewBox="0 0 32 256" preserveAspectRatio="none">
              <path d="M 0 32 L 16 32 L 16 128 L 32 128 M 16 128 L 16 224 L 0 224" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          ))}
        </div>

        {/* SEMIFINALS COLUMN */}
        <div 
          ref={el => { columnRefs.current['sf'] = el; }}
          className="flex flex-col justify-around h-[1600px] py-4 space-y-32 snap-start flex-shrink-0"
        >
          {roundMatchesMap['sf']?.map((match, idx) => (
            <BracketMatchCard
              key={match.id}
              match={match}
              originalMatch={initialMatches[rounds[3].startIdx + idx]}
              track={track}
              predictions={predictions}
              matches={matches}
              bets={bets}
              onSelectWinner={handleSelectWinner}
              onOpenBetSlip={handleOpenBetSlip}
            />
          ))}
        </div>

        {/* SVG Connector 4 (SF -> Finals) */}
        <div className="hidden md:flex flex-col justify-around h-[1600px] w-8 text-apple-border/15 flex-shrink-0 select-none">
          <svg className="h-[768px] w-8" viewBox="0 0 32 512" preserveAspectRatio="none">
            <path d="M 0 64 L 16 64 L 16 256 L 32 256 M 16 256 L 16 448 L 0 448" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>

        {/* FINALS COLUMN (Final and 3rd Place Match) */}
        <div 
          ref={el => { columnRefs.current['final'] = el; }}
          className="flex flex-col justify-around h-[1600px] py-4 space-y-32 snap-start flex-shrink-0"
        >
          {roundMatchesMap['final']?.map((match, idx) => (
            <div key={match.id} className="space-y-2">
              <div className="text-[10px] font-bold text-apple-accent tracking-wider uppercase text-center">
                {idx === 0 ? 'World Cup Final' : 'Third Place Playoff'}
              </div>
              <BracketMatchCard
                match={match}
                originalMatch={initialMatches[rounds[4].startIdx + idx]}
                track={track}
                predictions={predictions}
                matches={matches}
                bets={bets}
                onSelectWinner={handleSelectWinner}
                onOpenBetSlip={handleOpenBetSlip}
              />
            </div>
          ))}
        </div>

      </div>

      {/* Desktop swipe tip */}
      <div className="hidden lg:flex items-center justify-center space-x-2 text-apple-secondary-fg text-xs animate-pulse">
        <Smartphone size={14} />
        <span>左右滑动以查看完整的淘汰赛对阵图</span>
      </div>

      {/* Sliding Wager Drawer Component */}
      <BetDrawer
        key={selectedMatch?.id || 'empty'}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        match={selectedMatch}
        bets={bets}
        onBetSaved={reloadData}
        onScoreSynced={reloadAll}
      />

    </div>
  );
}
