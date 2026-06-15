import { readMatches, writeMatches, readBets, writeBets } from '@/lib/storage';
import { settleAllBets } from '@/lib/settler';
import { requireApiAuth } from '@/lib/apiAuth';
import { fetchScoreFromESPN } from '@/lib/espn';

/** Matches that kicked off at least 90 minutes ago are eligible for score sync. */
const SYNC_CUTOFF_MS = 90 * 60 * 1000;

// ---------------------------------------------------------------------------
// POST /api/matches/sync-all  — SSE stream of per-match progress
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  const matches = readMatches();
  const now = Date.now();
  const targets = matches.filter(
    m => m.status === 'scheduled' && new Date(m.date).getTime() <= now - SYNC_CUTOFF_MS
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const total = targets.length;
      let syncedCount = 0;
      let errorCount = 0;

      const updatedMatches = [...matches];

      for (let i = 0; i < targets.length; i++) {
        const match = targets[i];

        try {
          console.log(
            `[sync-all] (${i + 1}/${total}) ESPN: ${match.teamA} vs ${match.teamB}`
          );
          const score = await fetchScoreFromESPN(match);

          if (score !== null) {
            const idx = updatedMatches.findIndex(m => m.id === match.id);
            if (idx !== -1) {
              updatedMatches[idx] = {
                ...updatedMatches[idx],
                scoreA: score.scoreA,
                scoreB: score.scoreB,
                winner:
                  score.scoreA > score.scoreB
                    ? match.teamA
                    : score.scoreB > score.scoreA
                    ? match.teamB
                    : null,
                status: 'finished' as const,
              };
            }
            syncedCount++;
            send({
              type: 'progress',
              current: i + 1,
              total,
              matchId: match.id,
              result: `${score.scoreA} - ${score.scoreB}`,
            });
          } else {
            send({
              type: 'progress',
              current: i + 1,
              total,
              matchId: match.id,
              result: '未完赛',
            });
          }
        } catch (e) {
          errorCount++;
          console.error(`[sync-all] Error syncing ${match.id}:`, e);
          send({
            type: 'progress',
            current: i + 1,
            total,
            matchId: match.id,
            result: `错误: ${(e as Error).message.slice(0, 80)}`,
          });
        }
      }

      // Batch-write all updates, then settle bets once
      writeMatches(updatedMatches);
      const bets = readBets();
      const { updatedBets, settledCount } = settleAllBets(bets, updatedMatches);
      if (settledCount > 0) writeBets(updatedBets);

      send({ type: 'done', syncedCount, settledCount, errorCount });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
