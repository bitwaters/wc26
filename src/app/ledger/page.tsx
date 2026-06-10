import { readBets, readMatches, readPlayers } from '@/lib/storage';
import LedgerClient from '@/components/LedgerClient';
import ReconciliationTable from '@/components/ReconciliationTable';

export const dynamic = 'force-dynamic';

export default function LedgerPage() {
  const bets = readBets();
  const matches = readMatches();
  const players = readPlayers();

  return (
    <div className="space-y-8">
      <LedgerClient initialBets={bets} initialMatches={matches} initialPlayers={players} />
      <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-6 backdrop-blur-md shadow-sm">
        <ReconciliationTable players={players} bets={bets} />
      </div>
    </div>
  );
}
