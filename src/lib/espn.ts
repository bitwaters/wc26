/**
 * ESPN public scoreboard API helper.
 * Used by both /api/sync-score (single match) and /api/matches/sync-all (batch).
 */
import { Match } from '../types';

/** Format a Date to YYYYMMDD for the ESPN API. */
function toESPNDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/** Normalize a team name to lowercase alphanumeric for fuzzy comparison. */
function normalizeTeam(name: string): string {
  return name
    .replace(/^usa$/i, 'unitedstates')
    .replace(/^dr congo$/i, 'drcongo')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Fuzzy-match two team names (handles "Bosnia and Herzegovina" ↔ "Bosnia-Herzegovina", etc.) */
function teamsMatch(ourName: string, espnName: string): boolean {
  const a = normalizeTeam(ourName);
  const b = normalizeTeam(espnName);
  if (a === b) return true;
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  // First-5-chars handles accent variations (Türkiye ↔ Turkiye)
  if (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5)) return true;
  return false;
}

/** Fetch the raw events array from ESPN for a YYYYMMDD date string. */
async function fetchESPNEvents(dateStr: string): Promise<unknown[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateStr}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events as unknown[]) ?? [];
  } catch {
    return [];
  }
}

export interface ESPNScore {
  scoreA: number;
  scoreB: number;
}

/**
 * Fetch the final score for a match from ESPN's public scoreboard API.
 *
 * Tries the match's UTC date and then the previous calendar day, because ESPN
 * uses US local dates and early-UTC matches (e.g. 02:00 UTC) can appear under
 * the prior day's scoreboard.
 *
 * Returns null when the match is not yet finished or not found.
 */
export async function fetchScoreFromESPN(match: Match): Promise<ESPNScore | null> {
  const matchDate = new Date(match.date);
  const datesToTry = [
    toESPNDate(matchDate),
    toESPNDate(new Date(matchDate.getTime() - 24 * 60 * 60 * 1000)),
  ];

  for (const dateStr of datesToTry) {
    const events = await fetchESPNEvents(dateStr);

    for (const rawEvent of events) {
      const event = rawEvent as Record<string, unknown>;
      const statusName: string =
        ((event.status as Record<string, unknown>)?.type as Record<string, string>)?.name ?? '';

      if (!statusName.includes('FULL_TIME') && !statusName.includes('FINAL')) continue;

      type Competitor = { team: { displayName: string }; score: string };
      const competitors: Competitor[] =
        ((event.competitions as Array<Record<string, unknown>>)?.[0]
          ?.competitors as Competitor[]) ?? [];
      if (competitors.length !== 2) continue;

      const [c0, c1] = competitors;
      const n0 = c0.team?.displayName ?? '';
      const n1 = c1.team?.displayName ?? '';

      if (teamsMatch(match.teamA, n0) && teamsMatch(match.teamB, n1)) {
        return { scoreA: parseInt(c0.score ?? '0', 10), scoreB: parseInt(c1.score ?? '0', 10) };
      }
      // ESPN sometimes swaps home/away order
      if (teamsMatch(match.teamA, n1) && teamsMatch(match.teamB, n0)) {
        return { scoreA: parseInt(c1.score ?? '0', 10), scoreB: parseInt(c0.score ?? '0', 10) };
      }
    }
  }

  return null;
}
