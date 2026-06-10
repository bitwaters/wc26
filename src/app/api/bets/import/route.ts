import { NextResponse } from 'next/server';
import { readBets, writeBets, readMatches } from '@/lib/storage';
import { settleAllBets } from '@/lib/settler';
import { requireApiAuth } from '@/lib/apiAuth';
import { Bet } from '@/types';


export async function POST(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { bets, mode = 'merge' } = body;

    if (!bets || !Array.isArray(bets)) {
      return NextResponse.json({ error: 'Invalid file format. Must be an array of wagers.' }, { status: 400 });
    }

    if (mode !== 'merge' && mode !== 'replace') {
      return NextResponse.json({ error: 'Invalid import mode. Use "merge" or "replace".' }, { status: 400 });
    }

    for (const bet of bets) {
      if (!bet.id || !bet.matchId || !bet.betType || bet.odds == null || bet.stake == null || !bet.status) {
        return NextResponse.json({ error: 'Invalid wager object structure in file.' }, { status: 400 });
      }
    }

    const matches = readMatches();
    const existingBets = mode === 'replace' ? [] : readBets();
    const mergedById = new Map<string, Bet>();

    existingBets.forEach(bet => mergedById.set(bet.id, bet));
    (bets as Bet[]).forEach(bet => {
      const existing = mergedById.get(bet.id);
      if (existing && existing.status !== 'pending') {
        return;
      }
      mergedById.set(bet.id, bet);
    });

    const mergedBets = Array.from(mergedById.values());
    const { updatedBets } = settleAllBets(mergedBets, matches);

    writeBets(updatedBets);

    return NextResponse.json({
      success: true,
      count: updatedBets.length,
      imported: bets.length,
      mode
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
