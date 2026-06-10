import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireApiAuth } from '@/lib/apiAuth';

export async function POST(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const DATA_DIR = path.join(process.cwd(), 'data');
    const BETS_PATH = path.join(DATA_DIR, 'bets.json');
    const PREDICTIONS_PATH = path.join(DATA_DIR, 'predictions.json');
    const MATCHES_PATH = path.join(DATA_DIR, 'matches.json');
    const STATIC_SCHEDULE_PATH = path.join(process.cwd(), 'src/data/worldcup2026.json');

    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(BETS_PATH, JSON.stringify([], null, 2));

    fs.writeFileSync(PREDICTIONS_PATH, JSON.stringify({
      groupStandings: {},
      bestThirdTeams: [],
      bracket: {}
    }, null, 2));

    if (fs.existsSync(STATIC_SCHEDULE_PATH)) {
      const rawStatic = fs.readFileSync(STATIC_SCHEDULE_PATH, 'utf-8');
      const staticData = JSON.parse(rawStatic);
      fs.writeFileSync(MATCHES_PATH, JSON.stringify(staticData.matches, null, 2));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
