import { readMatches, readBets, readPlayers } from '@/lib/storage';
import BettingStation from '@/components/BettingStation';

export const dynamic = 'force-dynamic';

export default function BettingPage() {
  const matches = readMatches();
  const bets = readBets();
  const players = readPlayers();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-apple-fg">投注台</h1>
          <p className="text-xs text-apple-secondary-fg mt-0.5">选择赛事 · 选择玩法 · 填写赔率 · 记账</p>
        </div>
      </div>
      <BettingStation
        matches={matches}
        players={players}
        recentBets={bets}
      />
    </div>
  );
}
