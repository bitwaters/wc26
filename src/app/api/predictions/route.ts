import { NextResponse } from 'next/server';
import { readPredictions, writePredictions } from '@/lib/storage';
import { requireApiAuth } from '@/lib/apiAuth';
import { solveThirdPlaceAssignments } from '@/lib/bracketResolver';

export async function GET() {
  try {
    const predictions = readPredictions();
    return NextResponse.json(predictions);
  } catch (error) {
    console.error('Failed to read predictions:', error);
    return NextResponse.json({ error: 'Failed to read predictions.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authError = requireApiAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { groupStandings, bestThirdTeams, bracket } = body;

    const current = readPredictions();

    const updated = {
      groupStandings: groupStandings !== undefined ? groupStandings : current.groupStandings,
      bestThirdTeams: bestThirdTeams !== undefined ? bestThirdTeams : current.bestThirdTeams,
      bracket: bracket !== undefined ? bracket : current.bracket
    };

    if (updated.bestThirdTeams.length === 8) {
      const assignment = solveThirdPlaceAssignments(updated.bestThirdTeams);
      if (!assignment) {
        return NextResponse.json({
          error: 'The selected 8 third-place groups cannot be assigned to knockout slots under FIFA rules. Please adjust your selection.'
        }, { status: 422 });
      }
    }

    writePredictions(updated);
    return NextResponse.json({ success: true, predictions: updated });
  } catch (error) {
    console.error('Error saving predictions:', error);
    return NextResponse.json({ error: 'Failed to save predictions.' }, { status: 500 });
  }
}
