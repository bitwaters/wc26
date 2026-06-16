export interface Match {
  id: string;
  group: string;
  teamA: string;
  teamB: string;
  scoreA: number | null;
  scoreB: number | null;
  /** Knockout winner when regular time is drawn (ET/PK). */
  winner?: string | null;
  date: string;
  stadium: string;
  status: 'scheduled' | 'finished';
}

export type BetType =
  | '1X2'
  | 'handicap'          // legacy — kept for historical data compatibility
  | 'asian_handicap'    // new: supports quarter-ball lines (-0.25, -0.75, etc.)
  | 'over_under'
  | 'correct_score'
  | 'btts'              // Both Teams To Score
  | 'ht_ft'             // Half Time / Full Time (manual settle only)
  | 'total_goals'       // Total goals bracket: '0'|'1'|'2'|'3'|'4'|'5+'
  | 'first_half_1x2'    // 1st Half Winner (manual settle only)
  | 'first_half_ou'     // 1st Half Over/Under (manual settle only)
  | 'custom'
  | 'parlay';           // Multi-leg accumulator

export type BetStatus = 'pending' | 'won' | 'half_won' | 'lost' | 'half_lost' | 'void';

/** A single leg within a parlay bet. */
export interface BetLeg {
  matchId: string;
  betType: Exclude<BetType, 'parlay'>;
  betSelection: string;
  odds: number;
  status: BetStatus;
  metadata?: {
    handicapValue?: number;
    threshold?: number;
    [key: string]: unknown;
  };
}

export interface Bet {
  id: string;
  /** For single bets: the match ID. For parlay bets: the sentinel 'PARLAY'. */
  matchId: string;
  betType: BetType;
  betSelection: string; // e.g., "Germany", "over", "2-1", "3串1"
  odds: number;
  stake: number;
  stakeCurrency?: DepositCurrency; // default: 'CNY'
  status: BetStatus;
  createdAt: string;
  bettorId?: string;  // undefined | null → "self"
  /** Present only on parlay bets (betType === 'parlay'). */
  legs?: BetLeg[];
  metadata?: {
    handicapValue?: number; // e.g., -1.5, +0.5
    threshold?: number;     // e.g., 2.5
    bookmaker?: string;
    notes?: string;
    [key: string]: unknown;
  };
}

export interface Predictions {
  groupStandings: Record<string, string[]>; // e.g., { "Group A": ["Mexico", "South Africa", "South Korea"] }
  bestThirdTeams: string[];                 // List of group names, e.g., ["Group A", "Group C", ...]
  bracket: Record<string, string>;          // e.g., { "match_73": "Mexico" }
}

export type DepositCurrency = 'CNY' | 'USDT';

export interface Player {
  id: string;        // "self" | "p_" + random
  name: string;
  color: string;     // hex color for UI
  initialDeposit: number;
  depositCurrency?: DepositCurrency;  // default: 'CNY'
  createdAt: string;
}

export interface UserSettings {
  llmProvider: 'gemini' | 'deepseek';
  apiKey: string;
  llmModel?: string;
}

/** Public settings shape returned to the client (API key never sent in full). */
export interface PublicUserSettings {
  llmProvider: 'gemini' | 'deepseek';
  apiKey: '';
  apiKeyPreview: string;
  hasApiKey: boolean;
  llmModel: string;
}
