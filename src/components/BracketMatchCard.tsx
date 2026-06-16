'use client';

import React from 'react';
import { Match, Predictions } from '../types';
import Flag from './Flag';
import { resolveTeamName } from '../lib/bracketResolver';
import { getMatchWinner } from '../lib/matchResult';
import { Check } from 'lucide-react';
import { teamZhName } from '../lib/teamNames';

interface BracketMatchCardProps {
  match: Match;
  originalMatch: Match;
  track: 'sandbox' | 'live';
  predictions: Predictions;
  matches: Match[];
  onSelectWinner?: (matchId: string, teamName: string) => void;
}

export default function BracketMatchCard({
  match,
  originalMatch,
  track,
  predictions,
  matches,
  onSelectWinner,
}: BracketMatchCardProps) {
  const predictedWinner = predictions.bracket[match.id];
  const isFinished = match.status === 'finished' && match.scoreA !== null && match.scoreB !== null;
  const actualWinner = isFinished ? getMatchWinner(match, match.teamA, match.teamB) : null;
  const teamAWon = isFinished && actualWinner === match.teamA;
  const teamBWon = isFinished && actualWinner === match.teamB;

  // Determine Ghost overlays for Live track
  // Check if what the user predicted in Sandbox matches what is actually on the board
  let ghostA = '';
  let ghostB = '';

  if (track === 'live') {
    const predA = resolveTeamName(originalMatch.teamA, 'sandbox', predictions, matches);
    const predB = resolveTeamName(originalMatch.teamB, 'sandbox', predictions, matches);
    
    if (predA && predA !== match.teamA && !predA.includes('Winner') && !predA.includes('Runner-up') && !predA.includes('3rd') && !predA.includes('Loser')) {
      ghostA = predA;
    }
    if (predB && predB !== match.teamB && !predB.includes('Winner') && !predB.includes('Runner-up') && !predB.includes('3rd') && !predB.includes('Loser')) {
      ghostB = predB;
    }
  }

  // Calculate prediction accuracy status for border coloring
  let borderClass = 'border-apple-border/20 hover:border-apple-border/40';
  if (track === 'live' && isFinished && actualWinner) {
    if (predictedWinner) {
      if (predictedWinner === actualWinner) {
        borderClass = 'border-apple-success/60 ring-1 ring-apple-success/30';
      } else {
        borderClass = 'border-apple-danger/60 ring-1 ring-apple-danger/30';
      }
    }
  } else if (track === 'sandbox' && predictedWinner) {
    borderClass = 'border-apple-accent/50';
  }

  const handleTeamClick = (teamName: string) => {
    // Only allow selecting predicted winners in Sandbox mode
    // Ignore placeholder names
    if (
      track === 'sandbox' && 
      onSelectWinner && 
      teamName && 
      !teamName.includes('Winner') && 
      !teamName.includes('Runner-up') && 
      !teamName.includes('3rd') && 
      !teamName.includes('Loser')
    ) {
      onSelectWinner(match.id, teamName);
    }
  };

  const isTeamAConcrete = match.teamA && !match.teamA.includes('Winner') && !match.teamA.includes('Runner-up') && !match.teamA.includes('3rd') && !match.teamA.includes('Loser');
  const isTeamBConcrete = match.teamB && !match.teamB.includes('Winner') && !match.teamB.includes('Runner-up') && !match.teamB.includes('3rd') && !match.teamB.includes('Loser');

  return (
    <div className={`relative bg-apple-card-bg border rounded-apple-lg p-3 w-full lg:w-[220px] shadow-sm flex flex-col group transition-all duration-300 ${borderClass}`}>
      
      {/* Match Meta */}
      <div className="text-[9px] text-apple-secondary-fg font-semibold tracking-wide uppercase mb-2">
        {match.id.replace('match_', '场次 ')}
      </div>

      {/* Team Rows */}
      <div className="space-y-2.5">
        
        {/* Team A Row */}
        <div className="flex flex-col">
          <div 
            onClick={() => handleTeamClick(match.teamA)}
            className={`flex items-center justify-between py-0.5 rounded-apple-sm transition-all ${
              track === 'sandbox' && isTeamAConcrete ? 'cursor-pointer hover:bg-apple-secondary-bg/50 px-1' : ''
            }`}
          >
            <div className="flex items-center space-x-2 w-9/12">
              <Flag teamName={match.teamA} size={13} />
              <span className={`text-[12px] truncate ${
                track === 'sandbox' && predictedWinner === match.teamA
                  ? 'font-bold text-apple-accent'
                  : track === 'live' && isFinished
                    ? teamAWon
                      ? 'font-bold text-apple-fg'
                      : actualWinner
                        ? 'text-apple-secondary-fg line-through opacity-70'
                        : 'text-apple-fg'
                    : 'text-apple-fg'
              }`}>
                {teamZhName(match.teamA)}
              </span>
            </div>
            
            <div className="text-right w-3/12 flex items-center justify-end font-semibold text-[12px]">
              {isFinished ? (
                <span className={teamAWon ? 'font-bold' : 'text-apple-secondary-fg'}>
                  {match.scoreA}
                </span>
              ) : track === 'sandbox' && predictedWinner === match.teamA ? (
                <Check size={12} className="text-apple-accent font-bold" />
              ) : null}
            </div>
          </div>

          {/* Ghost Prediction Overlay A */}
          {ghostA && (
            <div className="text-[9px] font-semibold text-apple-secondary-fg/60 pl-6 mt-0.5 select-none border border-dashed border-apple-border/10 rounded-[4px] px-1 py-0.2 w-fit bg-apple-secondary-bg/10">
              预测晋级: {teamZhName(ghostA)}
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="border-t border-apple-border/10" />

        {/* Team B Row */}
        <div className="flex flex-col">
          <div 
            onClick={() => handleTeamClick(match.teamB)}
            className={`flex items-center justify-between py-0.5 rounded-apple-sm transition-all ${
              track === 'sandbox' && isTeamBConcrete ? 'cursor-pointer hover:bg-apple-secondary-bg/50 px-1' : ''
            }`}
          >
            <div className="flex items-center space-x-2 w-9/12">
              <Flag teamName={match.teamB} size={13} />
              <span className={`text-[12px] truncate ${
                track === 'sandbox' && predictedWinner === match.teamB
                  ? 'font-bold text-apple-accent'
                  : track === 'live' && isFinished
                    ? teamBWon
                      ? 'font-bold text-apple-fg'
                      : actualWinner
                        ? 'text-apple-secondary-fg line-through opacity-70'
                        : 'text-apple-fg'
                    : 'text-apple-fg'
              }`}>
                {teamZhName(match.teamB)}
              </span>
            </div>
            
            <div className="text-right w-3/12 flex items-center justify-end font-semibold text-[12px]">
              {isFinished ? (
                <span className={teamBWon ? 'font-bold' : 'text-apple-secondary-fg'}>
                  {match.scoreB}
                </span>
              ) : track === 'sandbox' && predictedWinner === match.teamB ? (
                <Check size={12} className="text-apple-accent font-bold" />
              ) : null}
            </div>
          </div>

          {/* Ghost Prediction Overlay B */}
          {ghostB && (
            <div className="text-[9px] font-semibold text-apple-secondary-fg/60 pl-6 mt-0.5 select-none border border-dashed border-apple-border/10 rounded-[4px] px-1 py-0.2 w-fit bg-apple-secondary-bg/10">
              预测晋级: {teamZhName(ghostB)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
