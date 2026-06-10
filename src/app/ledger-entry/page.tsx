import { readMatches, readBets, readPlayers } from '@/lib/storage';
import QuickBetEntry from '@/components/QuickBetEntry';

export const dynamic = 'force-dynamic';

export default function LedgerEntryPage() {
  const matches = readMatches();
  const bets = readBets();
  const players = readPlayers();

  return (
    <QuickBetEntry initialMatches={matches} initialBets={bets} initialPlayers={players} />
  );
}
