'use client';

import React, { useState, useMemo } from 'react';
import { Match } from '../types';
import Flag from './Flag';
import { teamZhName } from '../lib/teamNames';
import { Search } from 'lucide-react';

interface MatchScoresListProps {
  matches: Match[];
}

export default function MatchScoresList({ matches }: MatchScoresListProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const base = q
      ? matches.filter(m =>
          m.teamA.toLowerCase().includes(q) ||
          m.teamB.toLowerCase().includes(q) ||
          teamZhName(m.teamA).includes(q) ||
          teamZhName(m.teamB).includes(q) ||
          m.group.toLowerCase().includes(q)
        )
      : matches;
    return [...base].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [matches, search]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 text-apple-secondary-fg" size={16} />
        <input
          type="text"
          placeholder="搜索球队名、小组..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-apple-card-bg border border-apple-card-border rounded-apple-xl pl-10 pr-4 py-3 text-sm text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50 backdrop-blur-md shadow-sm"
        />
      </div>

      {/* Match list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-apple-secondary-fg">未找到匹配赛事。</div>
        ) : (
          filtered.map(match => {
            const isFinished = match.status === 'finished';
            const matchDate = new Date(match.date);
            const dateStr = matchDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            const timeStr = matchDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={match.id}
                className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-4 backdrop-blur-md shadow-sm"
              >
                <div className="flex items-center justify-between">
                  {/* Teams + score */}
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

                    {isFinished ? (
                      <span className="text-xl font-bold text-apple-fg tabular-nums">
                        {match.scoreA} - {match.scoreB}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-apple-secondary-fg">VS</span>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="text-right space-y-1">
                    <div className="text-[11px] text-apple-secondary-fg font-medium">{match.group}</div>
                    <div className="text-[11px] text-apple-secondary-fg">{dateStr}</div>
                    {!isFinished && (
                      <div className="text-[11px] text-apple-secondary-fg">{timeStr}</div>
                    )}
                    <div className={`text-[10px] font-bold ${isFinished ? 'text-apple-success' : 'text-apple-accent'}`}>
                      {isFinished ? '已结束' : '未开赛'}
                    </div>
                  </div>
                </div>

                {/* Stadium */}
                <div className="mt-2 text-[10px] text-apple-secondary-fg/70 truncate">{match.stadium}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
