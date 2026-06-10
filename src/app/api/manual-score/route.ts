import { NextResponse } from 'next/server';
import { readMatches, writeMatches, readBets, writeBets } from '@/lib/storage';
import { settleAllBets } from '@/lib/settler';
import { requireApiAuth } from '@/lib/apiAuth';
import { inferWinnerFromScores } from '@/lib/matchResult';


export async function POST(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { matchId, scoreA, scoreB, winner } = body;

    if (!matchId || scoreA == null || scoreB == null) {
      return NextResponse.json({ error: 'Missing matchId, scoreA, or scoreB.' }, { status: 400 });
    }

    const parsedScoreA = Number(scoreA);
    const parsedScoreB = Number(scoreB);

    if (!Number.isInteger(parsedScoreA) || !Number.isInteger(parsedScoreB)) {
      return NextResponse.json({ error: 'Scores must be whole numbers.' }, { status: 400 });
    }

    if (parsedScoreA < 0 || parsedScoreB < 0) {
      return NextResponse.json({ error: 'Scores cannot be negative.' }, { status: 400 });
    }

    const matches = readMatches();
    const matchIdx = matches.findIndex(m => m.id === matchId);
    if (matchIdx === -1) {
      return NextResponse.json({ error: `Match ${matchId} not found.` }, { status: 404 });
    }

    const match = matches[matchIdx];
    const resolvedWinner =
      typeof winner === 'string' && winner.trim()
        ? winner.trim()
        : inferWinnerFromScores(match, parsedScoreA, parsedScoreB, null);

    const updatedMatch = {
      ...match,
      scoreA: parsedScoreA,
      scoreB: parsedScoreB,
      winner: resolvedWinner,
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
      changedCount
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
