import fs from 'fs';
import path from 'path';
import { Match, Bet, Predictions, UserSettings, Player } from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const BETS_PATH = path.join(DATA_DIR, 'bets.json');
const PREDICTIONS_PATH = path.join(DATA_DIR, 'predictions.json');
const MATCHES_PATH = path.join(DATA_DIR, 'matches.json');
const SETTINGS_PATH = path.join(DATA_DIR, 'settings.json');
const PLAYERS_PATH = path.join(DATA_DIR, 'players.json');
const LOCK_DIR = path.join(DATA_DIR, '.locks');

const STATIC_SCHEDULE_PATH = path.join(process.cwd(), 'src/data/worldcup2026.json');

// 内存缓存：matches 数据庞大（26KB），每次导航都从磁盘重新解析代价较高。
// 写入时主动失效，读取时命中缓存直接返回，避免重复 I/O。
let matchesCache: { data: Match[]; mtime: number } | null = null;

function invalidateMatchesCache() {
  matchesCache = null;
}

function acquireLock(name: string): void {
  if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
  }

  const lockPath = path.join(LOCK_DIR, `${name}.lock`);
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      fs.mkdirSync(lockPath);
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait
      }
    }
  }

  throw new Error(`Could not acquire lock for ${name}`);
}

function releaseLock(name: string): void {
  const lockPath = path.join(LOCK_DIR, `${name}.lock`);
  fs.rmSync(lockPath, { recursive: true, force: true });
}

function withDataLock<T>(name: string, fn: () => T): T {
  acquireLock(name);
  try {
    return fn();
  } finally {
    releaseLock(name);
  }
}

function atomicWriteJson(filePath: string, data: unknown): void {
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, filePath);
}

/**
 * Merges the static worldcup2026.json schedule into the runtime matches.json.
 *
 * Rules:
 *  - Match still scheduled (no scores): overwrite team names, date, stadium, group from static.
 *  - Match already has scores (finished/in-progress): keep runtime data untouched.
 *  - Match in static but missing from runtime: append it.
 *
 * This runs on every startup so that deploying updated schedule data (e.g. fixing
 * team names, correcting dates) takes effect automatically on the demo server without
 * needing to delete the persisted matches.json.
 */
function syncStaticSchedule(): void {
  if (!fs.existsSync(STATIC_SCHEDULE_PATH)) return;
  try {
    const rawStatic = fs.readFileSync(STATIC_SCHEDULE_PATH, 'utf-8');
    const staticMatches: Match[] = JSON.parse(rawStatic).matches;

    const rawRuntime = fs.readFileSync(MATCHES_PATH, 'utf-8');
    const runtimeMatches: Match[] = JSON.parse(rawRuntime);

    const runtimeMap = new Map<string, Match>(runtimeMatches.map(m => [m.id, m]));
    let changed = false;

    for (const staticMatch of staticMatches) {
      const runtime = runtimeMap.get(staticMatch.id);
      if (!runtime) {
        // New match not yet in runtime — add it
        runtimeMatches.push(staticMatch);
        runtimeMap.set(staticMatch.id, staticMatch);
        changed = true;
      } else if (runtime.scoreA === null && runtime.scoreB === null) {
        // Not yet played — safe to update schedule metadata
        const needsUpdate =
          runtime.teamA !== staticMatch.teamA ||
          runtime.teamB !== staticMatch.teamB ||
          runtime.group !== staticMatch.group ||
          runtime.date !== staticMatch.date ||
          runtime.stadium !== staticMatch.stadium;
        if (needsUpdate) {
          Object.assign(runtime, {
            teamA: staticMatch.teamA,
            teamB: staticMatch.teamB,
            group: staticMatch.group,
            date: staticMatch.date,
            stadium: staticMatch.stadium,
          });
          changed = true;
        }
      }
      // else: match has scores — leave runtime data as-is
    }

    if (changed) {
      atomicWriteJson(MATCHES_PATH, runtimeMatches);
      invalidateMatchesCache();
      console.log('[storage] Synced static schedule into matches.json');
    }
  } catch (e) {
    console.error('[storage] Failed to sync static schedule:', e);
  }
}

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(BETS_PATH)) {
    atomicWriteJson(BETS_PATH, []);
  }

  if (!fs.existsSync(PREDICTIONS_PATH)) {
    atomicWriteJson(PREDICTIONS_PATH, {
      groupStandings: {},
      bestThirdTeams: [],
      bracket: {}
    });
  }

  if (!fs.existsSync(SETTINGS_PATH)) {
    atomicWriteJson(SETTINGS_PATH, {
      llmProvider: 'gemini',
      apiKey: '',
      llmModel: ''
    });
  }

  if (!fs.existsSync(PLAYERS_PATH)) {
    atomicWriteJson(PLAYERS_PATH, [
      { id: 'self', name: '我', color: '#3b82f6', initialDeposit: 0, createdAt: new Date().toISOString() }
    ]);
  }

  if (!fs.existsSync(MATCHES_PATH)) {
    // First run — seed from static schedule
    try {
      if (fs.existsSync(STATIC_SCHEDULE_PATH)) {
        const rawStatic = fs.readFileSync(STATIC_SCHEDULE_PATH, 'utf-8');
        const staticData = JSON.parse(rawStatic);
        atomicWriteJson(MATCHES_PATH, staticData.matches);
      } else {
        atomicWriteJson(MATCHES_PATH, []);
      }
    } catch (e) {
      console.error('Failed to copy static schedule to matches.json:', e);
      atomicWriteJson(MATCHES_PATH, []);
    }
  } else {
    // Subsequent runs — merge any schedule updates from static file
    syncStaticSchedule();
  }
}

export function readBets(): Bet[] {
  ensureDataDir();
  try {
    const data = fs.readFileSync(BETS_PATH, 'utf-8');
    const bets: Bet[] = JSON.parse(data);
    return bets.map(b => ({ ...b, bettorId: b.bettorId ?? 'self' }));
  } catch (e) {
    console.error('Failed to read bets.json:', e);
    return [];
  }
}

export function writeBets(bets: Bet[]): void {
  withDataLock('bets', () => {
    ensureDataDir();
    atomicWriteJson(BETS_PATH, bets);
  });
}

/** Atomically append a single bet (read-push-write under one lock). */
export function appendBet(newBet: Bet): void {
  withDataLock('bets', () => {
    ensureDataDir();
    let bets: Bet[] = [];
    try {
      const data = fs.readFileSync(BETS_PATH, 'utf-8');
      bets = JSON.parse(data);
    } catch {
      bets = [];
    }
    bets.push(newBet);
    atomicWriteJson(BETS_PATH, bets);
  });
}

export function readPredictions(): Predictions {
  ensureDataDir();
  try {
    const data = fs.readFileSync(PREDICTIONS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read predictions.json:', e);
    return {
      groupStandings: {},
      bestThirdTeams: [],
      bracket: {}
    };
  }
}

export function writePredictions(predictions: Predictions): void {
  withDataLock('predictions', () => {
    ensureDataDir();
    atomicWriteJson(PREDICTIONS_PATH, predictions);
  });
}

export function readMatches(): Match[] {
  ensureDataDir();
  try {
    const mtime = fs.statSync(MATCHES_PATH).mtimeMs;
    if (matchesCache && matchesCache.mtime === mtime) {
      return matchesCache.data;
    }
    const data = fs.readFileSync(MATCHES_PATH, 'utf-8');
    const parsed: Match[] = JSON.parse(data);
    matchesCache = { data: parsed, mtime };
    return parsed;
  } catch (e) {
    console.error('Failed to read matches.json:', e);
    return [];
  }
}

export function writeMatches(matches: Match[]): void {
  withDataLock('matches', () => {
    ensureDataDir();
    atomicWriteJson(MATCHES_PATH, matches);
    invalidateMatchesCache();
  });
}

export function readSettings(): UserSettings {
  ensureDataDir();
  try {
    const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read settings.json:', e);
    return {
      llmProvider: 'gemini',
      apiKey: '',
      llmModel: ''
    };
  }
}

export function writeSettings(settings: UserSettings): void {
  withDataLock('settings', () => {
    ensureDataDir();
    atomicWriteJson(SETTINGS_PATH, settings);
  });
}

export function readPlayers(): Player[] {
  ensureDataDir();
  try {
    const data = fs.readFileSync(PLAYERS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read players.json:', e);
    return [{ id: 'self', name: '我', color: '#3b82f6', initialDeposit: 0, createdAt: new Date().toISOString() }];
  }
}

export function writePlayers(players: Player[]): void {
  withDataLock('players', () => {
    ensureDataDir();
    atomicWriteJson(PLAYERS_PATH, players);
  });
}

export function maskApiKey(apiKey: string): string {
  if (!apiKey) return '';
  if (apiKey.length <= 4) return '••••';
  return `••••${apiKey.slice(-4)}`;
}
