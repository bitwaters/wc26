import { NextResponse } from 'next/server';
import { readPlayers, writePlayers } from '@/lib/storage';
import { requireApiAuth } from '@/lib/apiAuth';
import { Player } from '@/types';

export async function GET(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const players = readPlayers();
    return NextResponse.json(players);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, color, initialDeposit, depositCurrency } = body;

    if (!name || !color) {
      return NextResponse.json({ error: 'Missing required fields: name, color.' }, { status: 400 });
    }

    const players = readPlayers();
    const newPlayer: Player = {
      id: `p_${Math.random().toString(36).substring(2, 11)}`,
      name,
      color,
      initialDeposit: Number(initialDeposit ?? 0),
      depositCurrency: depositCurrency === 'USDT' ? 'USDT' : 'CNY',
      createdAt: new Date().toISOString()
    };

    players.push(newPlayer);
    writePlayers(players);

    return NextResponse.json({ success: true, player: newPlayer });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, initialDeposit, depositCurrency } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing player id.' }, { status: 400 });
    }

    const players = readPlayers();
    const idx = players.findIndex(p => p.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Player not found.' }, { status: 404 });
    }

    players[idx] = {
      ...players[idx],
      initialDeposit: Number(initialDeposit ?? players[idx].initialDeposit),
      ...(depositCurrency !== undefined && { depositCurrency: depositCurrency === 'USDT' ? 'USDT' : 'CNY' })
    };
    writePlayers(players);

    return NextResponse.json({ success: true, player: players[idx] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ error: 'Missing playerId parameter.' }, { status: 400 });
    }

    if (playerId === 'self') {
      return NextResponse.json({ error: 'Cannot delete the default player "self".' }, { status: 400 });
    }

    const players = readPlayers();
    const updated = players.filter(p => p.id !== playerId);
    writePlayers(updated);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
