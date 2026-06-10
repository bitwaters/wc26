'use client';

import { Match } from '../types';
import { calcGroupStandings } from '../lib/groupStandings';
import Flag from './Flag';
import { teamZhName } from '../lib/teamNames';

interface LiveGroupStandingsProps {
  groupName: string;
  teams: string[];
  matches: Match[];
}

export default function LiveGroupStandings({ groupName, teams, matches }: LiveGroupStandingsProps) {
  const groupMatches = matches.filter(m => m.group === groupName);
  const rows = calcGroupStandings(teams, groupMatches);
  const hasStarted = groupMatches.some(m => m.status === 'finished');

  return (
    <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl overflow-hidden backdrop-blur-md shadow-sm">
      <div className="px-5 py-3.5 border-b border-apple-border/10 flex items-center justify-between">
        <h3 className="text-sm font-bold text-apple-fg">{groupName}</h3>
        {!hasStarted && (
          <span className="text-[10px] text-apple-secondary-fg font-medium">比赛尚未开始</span>
        )}
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[9px] font-bold text-apple-secondary-fg tracking-wider uppercase bg-apple-secondary-bg/30">
            <th className="py-2 px-4 w-8">#</th>
            <th className="py-2 px-2">球队</th>
            <th className="py-2 px-2 text-center w-8">场</th>
            <th className="py-2 px-2 text-center w-8">胜</th>
            <th className="py-2 px-2 text-center w-8">平</th>
            <th className="py-2 px-2 text-center w-8">负</th>
            <th className="py-2 px-2 text-center w-8">净</th>
            <th className="py-2 px-3 text-center w-8 font-bold text-apple-fg/60">积分</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-apple-border/10 text-xs">
          {rows.map((row, idx) => {
            const isThrough = idx < 2;  // top 2 advance
            return (
              <tr
                key={row.team}
                className={`transition-colors ${
                  isThrough
                    ? 'bg-apple-success/5 hover:bg-apple-success/10'
                    : 'hover:bg-apple-secondary-bg/20'
                }`}
              >
                <td className="py-2.5 px-4 text-apple-secondary-fg font-semibold">{idx + 1}</td>
                <td className="py-2.5 px-2">
                  <span className="flex items-center space-x-2">
                    <Flag teamName={row.team} size={13} />
                    <span className={`font-semibold ${isThrough ? 'text-apple-fg' : 'text-apple-secondary-fg'}`}>
                      {teamZhName(row.team)}
                    </span>
                    {isThrough && hasStarted && (
                      <span className="text-[9px] text-apple-success font-bold">↑</span>
                    )}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center text-apple-secondary-fg">{row.played}</td>
                <td className="py-2.5 px-2 text-center text-apple-secondary-fg">{row.won}</td>
                <td className="py-2.5 px-2 text-center text-apple-secondary-fg">{row.drawn}</td>
                <td className="py-2.5 px-2 text-center text-apple-secondary-fg">{row.lost}</td>
                <td className={`py-2.5 px-2 text-center font-medium ${
                  row.gd > 0 ? 'text-apple-success' : row.gd < 0 ? 'text-apple-danger' : 'text-apple-secondary-fg'
                }`}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className={`py-2.5 px-3 text-center font-bold ${isThrough ? 'text-apple-fg' : 'text-apple-secondary-fg'}`}>
                  {row.pts}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
