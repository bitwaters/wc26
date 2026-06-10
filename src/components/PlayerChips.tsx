'use client';

import { Player, Bet } from '../types';

interface PlayerChipsProps {
  players: Player[];
  bets: Bet[];
  selectedId: string;
  onChange: (id: string) => void;
}

export default function PlayerChips({ players, bets, selectedId, onChange }: PlayerChipsProps) {
  const pendingCountById = (id: string) =>
    bets.filter(b => (b.bettorId ?? 'self') === id && b.status === 'pending').length;

  const allPending = bets.filter(b => b.status === 'pending').length;

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
      {/* "全部" chip */}
      <button
        onClick={() => onChange('all')}
        className={`relative flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
          selectedId === 'all'
            ? 'bg-apple-fg text-apple-bg border-apple-fg'
            : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
        }`}
      >
        <span>全部</span>
        {allPending > 0 && (
          <span className="ml-1 bg-apple-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {allPending}
          </span>
        )}
      </button>

      {/* Per-player chips */}
      {players.map(player => {
        const pending = pendingCountById(player.id);
        const isActive = selectedId === player.id;
        return (
          <button
            key={player.id}
            onClick={() => onChange(player.id)}
            className={`relative flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              isActive
                ? 'text-white border-transparent'
                : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
            }`}
            style={isActive ? { backgroundColor: player.color, borderColor: player.color } : {}}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.5)' : player.color }}
            />
            <span>{player.name}</span>
            {pending > 0 && (
              <span
                className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : player.color,
                  color: isActive ? 'white' : 'white'
                }}
              >
                {pending}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
