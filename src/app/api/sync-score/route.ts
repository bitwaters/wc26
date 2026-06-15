import { NextResponse } from 'next/server';
import { readMatches, writeMatches, readBets, writeBets, readSettings } from '@/lib/storage';
import { buildMatchQuery, scrapeSearchSnippets } from '@/lib/scraper';
import { callLLMToSyncScore } from '@/lib/llm';
import { settleAllBets } from '@/lib/settler';
import { requireApiAuth } from '@/lib/apiAuth';
import { validateScoreSyncResult, toValidatedScoreUpdate } from '@/lib/scoreValidation';
import { fetchScoreFromESPN } from '@/lib/espn';


export async function POST(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json({ error: 'Missing matchId parameter.' }, { status: 400 });
    }

    const matches = readMatches();
    const matchIdx = matches.findIndex(m => m.id === matchId);
    if (matchIdx === -1) {
      return NextResponse.json({ error: `Match with ID ${matchId} not found.` }, { status: 404 });
    }
    const match = matches[matchIdx];

    // -----------------------------------------------------------------------
    // Step 1: Try ESPN public API (fast, free, no API key required)
    // -----------------------------------------------------------------------
    console.log(`[Sync API] Trying ESPN for: ${match.teamA} vs ${match.teamB}`);
    const espnScore = await fetchScoreFromESPN(match);

    if (espnScore !== null) {
      const updatedMatch = {
        ...match,
        scoreA: espnScore.scoreA,
        scoreB: espnScore.scoreB,
        winner:
          espnScore.scoreA > espnScore.scoreB
            ? match.teamA
            : espnScore.scoreB > espnScore.scoreA
            ? match.teamB
            : null,
        status: 'finished' as const,
      };
      matches[matchIdx] = updatedMatch;
      writeMatches(matches);

      const bets = readBets();
      const { updatedBets, settledCount, changedCount } = settleAllBets(bets, matches);
      writeBets(updatedBets);

      return NextResponse.json({
        success: true,
        match: updatedMatch,
        settledCount,
        changedCount,
        summary: `${match.teamA} ${espnScore.scoreA} - ${espnScore.scoreB} ${match.teamB}`,
        parsedScore: `${espnScore.scoreA} - ${espnScore.scoreB}`,
        source: 'espn',
      });
    }

    // -----------------------------------------------------------------------
    // Step 2: ESPN didn't have this match — fall back to LLM + search
    // -----------------------------------------------------------------------
    console.log(`[Sync API] ESPN miss, falling back to LLM for: ${match.teamA} vs ${match.teamB}`);

    const settings = readSettings();
    if (!settings.apiKey || settings.apiKey.trim() === '') {
      return NextResponse.json({
        error: 'LLM API key is not configured. Please go to Settings to add your key.'
      }, { status: 400 });
    }

    const query = buildMatchQuery(match);
    console.log(`[Sync API] Querying DuckDuckGo: "${query}"`);
    let searchSnippets = '';
    try {
      searchSnippets = await scrapeSearchSnippets(query);
    } catch (e) {
      return NextResponse.json({
        error: `Failed to scrape search results for match: ${(e as Error).message}`
      }, { status: 500 });
    }

    console.log(`[Sync API] Sending snippets to ${settings.llmProvider}...`);
    let syncResult;
    try {
      syncResult = await callLLMToSyncScore(match, searchSnippets, settings.llmProvider, settings.apiKey, settings.llmModel);
      console.log(`[Sync API] LLM Result:`, syncResult);
    } catch (e) {
      return NextResponse.json({
        error: `LLM parsing failed: ${(e as Error).message}`
      }, { status: 500 });
    }

    if (syncResult.status === 'finished') {
      const validationError = validateScoreSyncResult(syncResult, match);
      if (validationError) {
        return NextResponse.json({
          error: validationError,
          syncResult
        }, { status: 422 });
      }

      const validated = toValidatedScoreUpdate(syncResult, match);

      const updatedMatch = {
        ...match,
        scoreA: validated.scoreA,
        scoreB: validated.scoreB,
        winner: validated.winner,
        status: 'finished' as const
      };
      matches[matchIdx] = updatedMatch;
      writeMatches(matches);

      const bets = readBets();
      const { updatedBets, settledCount, changedCount } = settleAllBets(bets, matches);
      writeBets(updatedBets);

      return NextResponse.json({
        success: true,
        match: updatedMatch,
        settledCount,
        changedCount,
        summary: syncResult.summary,
        parsedScore: `${syncResult.scoreA} - ${syncResult.scoreB}`,
        source: 'llm',
      });
    }

    return NextResponse.json({
      success: false,
      match,
      summary: syncResult.summary,
      reason: `According to AI analysis, the match is not finished yet (Status: ${syncResult.status}).`
    });
  } catch (error) {
    console.error('[Sync API] Server error:', error);
    return NextResponse.json({
      error: `Internal server error: ${(error as Error).message}`
    }, { status: 500 });
  }
}
