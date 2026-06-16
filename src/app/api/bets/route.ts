import { NextResponse } from 'next/server';
import { appendBet, writeBets, readBets, readMatches } from '@/lib/storage';
import { settleBet } from '@/lib/settler';
import { requireApiAuth } from '@/lib/apiAuth';
import { Bet, BetStatus } from '@/types';


export async function POST(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { matchId, betType, betSelection, odds, stake, stakeCurrency, metadata, notes, bettorId, legs } = body;

    if (!matchId || !betType || !betSelection || odds === undefined || odds === null || stake === undefined || stake === null) {
      return NextResponse.json({ error: 'Missing required betting parameters.' }, { status: 400 });
    }

    const parsedOdds = Number(odds);
    const parsedStake = Number(stake);
    if (!isFinite(parsedOdds) || parsedOdds <= 0) {
      return NextResponse.json({ error: 'odds 必须为正数。' }, { status: 400 });
    }
    if (!isFinite(parsedStake) || parsedStake <= 0) {
      return NextResponse.json({ error: 'stake 必须为正数。' }, { status: 400 });
    }

    const matches = readMatches();

    let initialStatus: BetStatus = 'pending';

    // Only attempt auto-settle for single (non-parlay) bets on finished matches
    if (matchId !== 'PARLAY') {
      const match = matches.find(m => m.id === matchId);
      if (match && match.status === 'finished') {
        const settled = settleBet({
          betType,
          betSelection,
          status: 'pending',
          metadata
        }, match);

        if (settled !== 'pending') {
          initialStatus = settled;
        }
      }
    }

    const newBet: Bet = {
      id: `bet_${Math.random().toString(36).substring(2, 11)}`,
      matchId,
      betType,
      betSelection,
      odds: parsedOdds,
      stake: parsedStake,
      stakeCurrency: stakeCurrency === 'USDT' ? 'USDT' : 'CNY',
      status: initialStatus,
      createdAt: new Date().toISOString(),
      bettorId: bettorId || 'self',
      ...(legs ? { legs } : {}),
      metadata: {
        ...metadata,
        notes: notes || undefined
      }
    };

    appendBet(newBet);

    return NextResponse.json({ success: true, bet: newBet });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const betId = searchParams.get('betId');

    if (!betId) {
      return NextResponse.json({ error: 'Missing betId parameter.' }, { status: 400 });
    }

    const bets = readBets();
    const updated = bets.filter(b => b.id !== betId);
    writeBets(updated);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
