import { NextResponse } from 'next/server';
import { readMatches, writeMatches, readBets, writeBets, readSettings } from '@/lib/storage';
import { buildMatchQuery, scrapeSearchSnippets } from '@/lib/scraper';
import { callLLMToSyncScore } from '@/lib/llm';
import { settleAllBets } from '@/lib/settler';
import { requireApiAuth } from '@/lib/apiAuth';
import { validateScoreSyncResult, toValidatedScoreUpdate } from '@/lib/scoreValidation';

/** Matches that kicked off at least 90 minutes ago are eligible for score sync. */
const SYNC_CUTOFF_MS = 90 * 60 * 1000;

export async function POST(request: Request) {
  // Task 2.8 — reject early if no API key (before opening SSE stream)
  const authError = requireApiAuth(request);
  if (authError) return authError;

  const settings = readSettings();
  if (!settings.apiKey || settings.apiKey.trim() === '') {
    return NextResponse.json(
      { error: 'LLM API key is not configured. Please go to Settings to add your key.' },
      { status: 400 }
    );
  }

  // Task 2.2 — filter target matches
  const matches = readMatches();
  const now = Date.now();
  const targets = matches.filter(
    m => m.status === 'scheduled' && new Date(m.date).getTime() <= now - SYNC_CUTOFF_MS
  );

  const encoder = new TextEncoder();

  // Task 2.3 — SSE ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const total = targets.length;
      let syncedCount = 0;
      let errorCount = 0;

      // Work on a mutable copy so we can batch-write at the end
      const updatedMatches = [...matches];

      // Task 2.4 — per-match: scrape → LLM → update
      for (let i = 0; i < targets.length; i++) {
        const match = targets[i];

        try {
          const query = buildMatchQuery(match);
          console.log(`[sync-all] (${i + 1}/${total}) Querying: "${query}"`);

          const searchSnippets = await scrapeSearchSnippets(query);

          const syncResult = await callLLMToSyncScore(
            match,
            searchSnippets,
            settings.llmProvider,
            settings.apiKey,
            settings.llmModel
          );

          if (syncResult.status === 'finished') {
            const validationError = validateScoreSyncResult(syncResult, match);
            if (!validationError) {
              const validated = toValidatedScoreUpdate(syncResult, match);
              const idx = updatedMatches.findIndex(m => m.id === match.id);
              if (idx !== -1) {
                updatedMatches[idx] = {
                  ...updatedMatches[idx],
                  scoreA: validated.scoreA,
                  scoreB: validated.scoreB,
                  winner: validated.winner ?? null,
                  status: 'finished' as const,
                };
              }
              syncedCount++;
              // Task 2.5 — progress event
              send({
                type: 'progress',
                current: i + 1,
                total,
                matchId: match.id,
                result: `${syncResult.scoreA} - ${syncResult.scoreB}`,
              });
            } else {
              errorCount++;
              send({
                type: 'progress',
                current: i + 1,
                total,
                matchId: match.id,
                result: `验证失败: ${validationError}`,
              });
            }
          } else {
            // Not finished yet — skip but report
            send({
              type: 'progress',
              current: i + 1,
              total,
              matchId: match.id,
              result: '未完赛',
            });
          }
        } catch (e) {
          // Task 2.9 — catch per-match errors, continue
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

      // Task 2.6 — batch write + settle
      writeMatches(updatedMatches);
      const bets = readBets();
      const { updatedBets, settledCount } = settleAllBets(bets, updatedMatches);
      if (settledCount > 0) writeBets(updatedBets);

      // Task 2.7 — done event
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
