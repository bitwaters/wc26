'use client';

import React from 'react';
import { Match, BetType } from '../types';
import { teamZhName } from '../lib/teamNames';

export interface OddsSelection {
  matchId: string;
  matchLabel: string;
  betType: Exclude<BetType, 'parlay'>;
  betSelection: string;
  label: string;
  metadata?: { handicapValue?: number; threshold?: number };
}

interface MatchOddsPanelProps {
  match: Match;
  onSelect: (selection: OddsSelection | null, key: string) => void;
  selectedKeys: Set<string>;
}

/** Unique key for a selection */
export function selectionKey(
  matchId: string,
  betType: string,
  betSelection: string,
  metadata?: Record<string, unknown>
): string {
  const extra = metadata ? JSON.stringify(metadata) : '';
  return `${matchId}|${betType}|${betSelection}|${extra}`;
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between px-4 py-2 bg-apple-secondary-bg/60 border-y border-apple-border/15">
      <span className="text-[11px] font-bold text-apple-fg tracking-wide">{title}</span>
      {sub && <span className="text-[10px] text-apple-secondary-fg">{sub}</span>}
    </div>
  );
}

// ─── Individual odds cell ────────────────────────────────────────────────────

interface OddsCellProps {
  label: string;
  sublabel?: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}

function OddsCell({ label, sublabel, active, disabled, onClick }: OddsCellProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 border transition-all text-center w-full
        ${disabled
          ? 'opacity-40 cursor-not-allowed bg-apple-secondary-bg/40 border-apple-border/10 text-apple-secondary-fg'
          : active
            ? 'bg-apple-accent border-apple-accent text-white shadow-sm'
            : 'bg-apple-bg border-apple-border/20 text-apple-fg hover:border-apple-accent/60 hover:bg-apple-accent/5 cursor-pointer'
        }`}
    >
      {sublabel && (
        <span className={`text-[9px] font-semibold leading-none ${active ? 'text-white/70' : 'text-apple-secondary-fg'}`}>
          {sublabel}
        </span>
      )}
      <span className="text-[12px] font-bold leading-tight">{label}</span>
      {/* "+" indicator when active */}
      {active && (
        <span className="absolute top-1 right-1.5 text-[8px] font-black text-white/80">✓</span>
      )}
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function MatchOddsPanel({ match, onSelect, selectedKeys }: MatchOddsPanelProps) {
  const isFinished = match.status === 'finished';
  const teamA = teamZhName(match.teamA);
  const teamB = teamZhName(match.teamB);
  const matchLabel = `${teamA} vs ${teamB}`;

  function make(
    betType: Exclude<BetType, 'parlay'>,
    betSelection: string,
    label: string,
    metadata?: OddsSelection['metadata']
  ): OddsSelection {
    return { matchId: match.id, matchLabel, betType, betSelection, label, metadata };
  }

  function click(sel: OddsSelection) {
    if (isFinished) return;
    const k = selectionKey(sel.matchId, sel.betType, sel.betSelection, sel.metadata as Record<string, unknown>);
    selectedKeys.has(k) ? onSelect(null, k) : onSelect(sel, k);
  }

  function cell(sel: OddsSelection, labelOverride?: string, sublabel?: string) {
    const k = selectionKey(sel.matchId, sel.betType, sel.betSelection, sel.metadata as Record<string, unknown>);
    return (
      <OddsCell
        key={k}
        label={labelOverride ?? sel.label}
        sublabel={sublabel}
        active={selectedKeys.has(k)}
        disabled={isFinished}
        onClick={() => click(sel)}
      />
    );
  }

  const AH_LINES = [-1.5, -1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1, 1.5];
  const OU_LINES = [1.5, 2, 2.5, 3, 3.5, 4, 4.5];

  return (
    <div className="space-y-0">

      {/* ── 1X2 胜平负 ───────────────────────────────────────────────────── */}
      <SectionHeader title="胜平负" sub="全场独赢 · 1X2" />
      <div className="grid grid-cols-3 gap-px bg-apple-border/15 px-0">
        {cell(make('1X2', match.teamA, teamA), teamA, '主胜')}
        {cell(make('1X2', 'Draw', '平局'), '平局', '平')}
        {cell(make('1X2', match.teamB, teamB), teamB, '客胜')}
      </div>

      {/* ── 亚盘让球 ─────────────────────────────────────────────────────── */}
      <SectionHeader title="亚盘 / 让球" sub="Asian Handicap" />
      <div className="divide-y divide-apple-border/10">
        {/* Column headers */}
        <div className="grid grid-cols-2 gap-px bg-apple-border/10">
          <div className="px-4 py-1.5 text-[10px] font-bold text-apple-secondary-fg bg-apple-secondary-bg/30">{teamA}</div>
          <div className="px-4 py-1.5 text-[10px] font-bold text-apple-secondary-fg bg-apple-secondary-bg/30">{teamB}</div>
        </div>
        {AH_LINES.map(hv => {
          const hvA = (hv >= 0 ? '+' : '') + hv;
          const hvB = ((-hv) >= 0 ? '+' : '') + (-hv);
          return (
            <div key={hv} className="grid grid-cols-2 gap-px bg-apple-border/10">
              {cell(make('asian_handicap', match.teamA, `${teamA} ${hvA}`, { handicapValue: hv }), hvA)}
              {cell(make('asian_handicap', match.teamB, `${teamB} ${hvB}`, { handicapValue: -hv }), hvB)}
            </div>
          );
        })}
      </div>

      {/* ── 大小球 ───────────────────────────────────────────────────────── */}
      <SectionHeader title="大小球" sub="全场总进球 · Over / Under" />
      <div className="divide-y divide-apple-border/10">
        <div className="grid grid-cols-2 gap-px bg-apple-border/10">
          <div className="px-4 py-1.5 text-[10px] font-bold text-apple-secondary-fg bg-apple-secondary-bg/30">大球 Over</div>
          <div className="px-4 py-1.5 text-[10px] font-bold text-apple-secondary-fg bg-apple-secondary-bg/30">小球 Under</div>
        </div>
        {OU_LINES.map(line => (
          <div key={line} className="grid grid-cols-2 gap-px bg-apple-border/10">
            {cell(make('over_under', 'over', `大 ${line}`, { threshold: line }), `大 ${line}`)}
            {cell(make('over_under', 'under', `小 ${line}`, { threshold: line }), `小 ${line}`)}
          </div>
        ))}
      </div>

      {/* ── 两队都进球 ───────────────────────────────────────────────────── */}
      <SectionHeader title="两队都进球" sub="BTTS · Both Teams to Score" />
      <div className="grid grid-cols-2 gap-px bg-apple-border/10">
        {cell(make('btts', 'yes', '是'), '是')}
        {cell(make('btts', 'no', '否'), '否')}
      </div>

      {/* ── 总进球数 ─────────────────────────────────────────────────────── */}
      <SectionHeader title="总进球数" sub="全场" />
      <div className="grid grid-cols-6 gap-px bg-apple-border/10">
        {['0', '1', '2', '3', '4', '5+'].map(g =>
          cell(make('total_goals', g, `${g}球`), g === '5+' ? '5+' : g)
        )}
      </div>

      {/* ── 波胆 / 正确比分 ──────────────────────────────────────────────── */}
      <SectionHeader title="波胆" sub="正确比分 · Correct Score" />
      <div className="grid grid-cols-4 gap-px bg-apple-border/10">
        {/* Common scores grouped: home wins, draws, away wins */}
        {['1-0','2-0','2-1','3-0','3-1','3-2','4-0','4-1'].map(s =>
          cell(make('correct_score', s, s), s, teamA)
        )}
        {['0-0','1-1','2-2','3-3'].map(s =>
          cell(make('correct_score', s, s), s, '平局')
        )}
        {['0-1','0-2','1-2','0-3','1-3','2-3','0-4','1-4'].map(s =>
          cell(make('correct_score', s, s), s, teamB)
        )}
        {/* Custom entry */}
        {cell(make('correct_score', '', '自定义'), '其他')}
      </div>

      {/* ── 半场/全场 ────────────────────────────────────────────────────── */}
      <SectionHeader title="半场 / 全场" sub="HT · FT（手动结算）" />
      <div className="grid grid-cols-3 gap-px bg-apple-border/10">
        {[
          ['主/主', `${teamA}/主`], ['主/平', `${teamA}/平`], ['主/客', `${teamA}/客`],
          ['平/主', `平/${teamA}`], ['平/平', '平/平'], ['平/客', `平/${teamB}`],
          ['客/主', `${teamB}/主`], ['客/平', `${teamB}/平`], ['客/客', `${teamB}/客`],
        ].map(([displayKey, sel]) =>
          cell(make('ht_ft', displayKey, sel as string), displayKey as string)
        )}
      </div>

      {/* ── 上半场胜平负 ─────────────────────────────────────────────────── */}
      <SectionHeader title="上半场胜平负" sub="Half Time 1X2（手动结算）" />
      <div className="grid grid-cols-3 gap-px bg-apple-border/10">
        {cell(make('first_half_1x2', match.teamA, `上半 ${teamA} 胜`), teamA, '半场主胜')}
        {cell(make('first_half_1x2', 'Draw', '上半 平局'), '平局', '半场平')}
        {cell(make('first_half_1x2', match.teamB, `上半 ${teamB} 胜`), teamB, '半场客胜')}
      </div>

      {/* ── 上半场大小球 ─────────────────────────────────────────────────── */}
      <SectionHeader title="上半场大小球" sub="Half Time O/U（手动结算）" />
      <div className="divide-y divide-apple-border/10">
        <div className="grid grid-cols-2 gap-px bg-apple-border/10">
          <div className="px-4 py-1.5 text-[10px] font-bold text-apple-secondary-fg bg-apple-secondary-bg/30">大球 Over</div>
          <div className="px-4 py-1.5 text-[10px] font-bold text-apple-secondary-fg bg-apple-secondary-bg/30">小球 Under</div>
        </div>
        {[0.5, 1, 1.5, 2].map(line => (
          <div key={line} className="grid grid-cols-2 gap-px bg-apple-border/10">
            {cell(make('first_half_ou', 'over', `上半 大 ${line}`, { threshold: line }), `大 ${line}`)}
            {cell(make('first_half_ou', 'under', `上半 小 ${line}`, { threshold: line }), `小 ${line}`)}
          </div>
        ))}
      </div>

      {/* ── 自定义 ───────────────────────────────────────────────────────── */}
      <SectionHeader title="自定义" sub="Custom Bet" />
      <div className="grid grid-cols-1 gap-px bg-apple-border/10">
        {cell(make('custom', '', '自定义投注'), '自定义投注项')}
      </div>

    </div>
  );
}
