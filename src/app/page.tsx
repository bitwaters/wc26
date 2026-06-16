import { readBets, readMatches, readPlayers } from '@/lib/storage';
import LedgerDashboardClient from '@/components/LedgerDashboardClient';

export const dynamic = 'force-dynamic';

export default function Home() {
  const bets = readBets();
  const matches = readMatches();
  const players = readPlayers();

  return (
    <LedgerDashboardClient initialBets={bets} initialMatches={matches} initialPlayers={players} />
  );
}
