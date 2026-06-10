import { readPredictions, readMatches, readBets } from '@/lib/storage';
import ScheduleClient from '@/components/ScheduleClient';
import staticSchedule from '@/data/worldcup2026.json';

export const dynamic = 'force-dynamic';

export default function SchedulePage() {
  const predictions = readPredictions();
  const matches = readMatches();
  const bets = readBets();
  const groups = staticSchedule.groups;

  return (
    <ScheduleClient
      initialPredictions={predictions}
      initialMatches={matches}
      initialBets={bets}
      groups={groups}
    />
  );
}
