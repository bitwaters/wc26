import { readBets, readMatches, readPlayers } from '@/lib/storage';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default function Home() {
  const bets = readBets();
  const matches = readMatches();
  const players = readPlayers();

  return (
    <DashboardClient initialBets={bets} initialMatches={matches} initialPlayers={players} />
  );
}
