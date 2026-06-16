'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Player, BetLeg, DepositCurrency } from '../types';
import { apiFetch } from '../lib/apiClient';
import { OddsSelection, selectionKey } from './MatchOddsPanel';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface SlipItem {
  key: string;
  selection: OddsSelection;
  odds: string;          // user-entered odds string
  betSelection: string;  // finalised selection (may need user input for correct_score/custom)
}

interface BetSlipProps {
  items: SlipItem[];
  players: Player[];
  onRemove: (key: string) => void;
  onOddsChange: (key: string, odds: string) => void;
  onSelectionChange: (key: string, betSelection: string) => void;
  onClear: () => void;
}

type SlipMode = 'single' | 'parlay';

export default function BetSlip({
  items,
  players,
  onRemove,
  onOddsChange,
  onSelectionChange,
  onClear,
}: BetSlipProps) {
  const router = useRouter();
  const [mode, setMode] = useState<SlipMode>('single');
  const [bettorId, setBettorId] = useState<string>(players[0]?.id ?? 'self');
  const [stake, setStake] = useState('');
  const [stakeCurrency, setStakeCurrency] = useState<DepositCurrency>('CNY');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const combinedOdds = items.reduce((acc, item) => {
    const o = parseFloat(item.odds);
    return isNaN(o) ? acc : acc * o;
  }, 1);

  const stakeNum = parseFloat(stake);
  const estimatedReturn = (() => {
    if (isNaN(stakeNum) || stakeNum <= 0) return null;
    if (mode === 'parlay') {
      return combinedOdds > 1 ? (stakeNum * combinedOdds).toFixed(2) : null;
    }
    // Single mode: sum of individual returns (each bet pays independently)
    const total = items.reduce((sum, item) => {
      const o = parseFloat(item.odds);
      return sum + (isNaN(o) || o <= 0 ? 0 : stakeNum * o);
    }, 0);
    return total > 0 ? total.toFixed(2) : null;
  })();

  const canSubmit =
    items.length > 0 &&
    !submitting &&
    items.every(i => parseFloat(i.odds) > 0 && i.betSelection.trim() !== '') &&
    !isNaN(stakeNum) &&
    stakeNum > 0 &&
    (mode === 'single' || items.length >= 2);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'single') {
        // Submit each item as an independent bet
        for (const item of items) {
          const body: Record<string, unknown> = {
            matchId: item.selection.matchId,
            betType: item.selection.betType,
            betSelection: item.betSelection,
            odds: parseFloat(item.odds),
            stake: stakeNum,
            stakeCurrency,
            bettorId,
            metadata: item.selection.metadata ?? {},
          };
          const res = await apiFetch('/api/bets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error ?? '记账失败');
          }
        }
        setSuccess(`已记账 ${items.length} 笔单注`);
      } else {
        // Parlay: one bet with legs[]
        const legs: BetLeg[] = items.map(item => ({
          matchId: item.selection.matchId,
          betType: item.selection.betType,
          betSelection: item.betSelection,
          odds: parseFloat(item.odds),
          status: 'pending' as const,
          metadata: item.selection.metadata,
        }));

        const parlayOdds = legs.reduce((acc, l) => acc * l.odds, 1);
        const parlayLabel = `${items.length}串1`;

        const body = {
          matchId: 'PARLAY',
          betType: 'parlay',
          betSelection: parlayLabel,
          odds: parseFloat(parlayOdds.toFixed(4)),
          stake: stakeNum,
          stakeCurrency,
          bettorId,
          legs,
        };
        const res = await apiFetch('/api/bets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? '串关记账失败');
        }
        setSuccess(`已记账 ${parlayLabel}`);
      }

      onClear();
      setStake('');
      setTimeout(() => {
        setSuccess('');
        router.refresh();
      }, 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, mode, items, stakeNum, stakeCurrency, bettorId, onClear, router]);

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-apple-secondary-fg">
        点击盘口选项加入注单
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex rounded-apple-md overflow-hidden border border-apple-border/20 text-xs font-semibold">
        {(['single', 'parlay'] as SlipMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            disabled={m === 'parlay' && items.length < 2}
            className={`flex-1 py-2 transition-all ${
              mode === m
                ? 'bg-apple-accent text-white'
                : 'bg-apple-secondary-bg text-apple-secondary-fg hover:text-apple-fg disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {m === 'single' ? '单注' : `串关${items.length >= 2 ? ` ${items.length}串1` : ''}`}
          </button>
        ))}
      </div>

      {/* Selections */}
      <div className="space-y-2">
        {items.map(item => (
          <SlipItemRow
            key={item.key}
            item={item}
            mode={mode}
            onRemove={onRemove}
            onOddsChange={onOddsChange}
            onSelectionChange={onSelectionChange}
          />
        ))}
      </div>

      {/* Parlay combined odds */}
      {mode === 'parlay' && items.length >= 2 && (
        <div className="flex justify-between text-xs text-apple-secondary-fg border-t border-apple-border/10 pt-2">
          <span>合并赔率</span>
          <span className="font-bold text-apple-fg">{combinedOdds.toFixed(3)}</span>
        </div>
      )}

      {/* Bettor */}
      <div>
        <label className="block text-[10px] text-apple-secondary-fg font-semibold uppercase mb-1">投注人</label>
        <div className="flex flex-wrap gap-1.5">
          {players.map(p => (
            <button
              key={p.id}
              onClick={() => setBettorId(p.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                bettorId === p.id
                  ? 'text-white border-transparent'
                  : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg'
              }`}
              style={bettorId === p.id ? { backgroundColor: p.color } : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bettorId === p.id ? 'rgba(255,255,255,0.6)' : p.color }} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stake */}
      <div>
        <label className="block text-[10px] text-apple-secondary-fg font-semibold uppercase mb-1">
          {mode === 'single' ? '每注本金' : '串关本金'}
        </label>
        <div className="flex rounded-apple-md overflow-hidden border border-apple-border/20">
          {(['CNY', 'USDT'] as DepositCurrency[]).map(c => (
            <button
              key={c}
              onClick={() => setStakeCurrency(c)}
              className={`px-2.5 py-2 text-[11px] font-bold border-r border-apple-border/20 transition-all ${
                stakeCurrency === c ? 'bg-apple-accent text-white' : 'bg-apple-secondary-bg text-apple-secondary-fg'
              }`}
            >
              {c === 'CNY' ? '¥' : 'U'}
            </button>
          ))}
          <input
            type="number"
            placeholder="100"
            value={stake}
            onChange={e => setStake(e.target.value)}
            className="flex-1 bg-apple-secondary-bg px-3 py-2 text-xs text-apple-fg focus:outline-none font-semibold"
          />
        </div>
      </div>

      {/* Estimated return */}
      {estimatedReturn && (
        <div className="flex justify-between text-xs text-apple-secondary-fg">
          <span>预计回报</span>
          <span className="font-bold text-apple-success">
            {stakeCurrency === 'CNY' ? '¥' : 'U'}{estimatedReturn}
          </span>
        </div>
      )}

      {/* Error / success */}
      {error && <p className="text-xs text-apple-danger">{error}</p>}
      {success && <p className="text-xs text-apple-success font-semibold">{success}</p>}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || !!success}
        className="w-full py-3 rounded-apple-md text-sm font-bold bg-apple-accent text-white hover:bg-apple-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {submitting ? '记账中...' : success || '确认记账'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-item row in the slip
// ---------------------------------------------------------------------------

function SlipItemRow({
  item,
  mode,
  onRemove,
  onOddsChange,
  onSelectionChange,
}: {
  item: SlipItem;
  mode: SlipMode;
  onRemove: (key: string) => void;
  onOddsChange: (key: string, v: string) => void;
  onSelectionChange: (key: string, v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsInput = item.selection.betType === 'correct_score' || item.selection.betType === 'custom';

  return (
    <div className="bg-apple-secondary-bg/50 border border-apple-border/20 rounded-apple-md p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-apple-secondary-fg truncate">{item.selection.matchLabel}</div>
          <div className="text-xs font-semibold text-apple-fg truncate">{item.selection.label}</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {needsInput && (
            <button onClick={() => setExpanded(e => !e)} className="text-apple-secondary-fg hover:text-apple-fg p-0.5">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button onClick={() => onRemove(item.key)} className="text-apple-secondary-fg hover:text-apple-danger p-0.5">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Custom / correct_score input */}
      {needsInput && (expanded || item.betSelection === '') && (
        <input
          type="text"
          placeholder={item.selection.betType === 'correct_score' ? '例如 2-1' : '自定义描述'}
          value={item.betSelection}
          onChange={e => onSelectionChange(item.key, e.target.value)}
          className="w-full bg-apple-bg border border-apple-border/20 rounded-apple-sm px-2 py-1.5 text-xs text-apple-fg focus:outline-none"
          autoFocus
        />
      )}

      {/* Odds input (shown per-item in single mode; per-item in parlay too for individual odds) */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-apple-secondary-fg font-semibold uppercase">赔率</span>
        <input
          type="number"
          step="0.01"
          placeholder="1.85"
          value={item.odds}
          onChange={e => onOddsChange(item.key, e.target.value)}
          className="w-24 bg-apple-bg border border-apple-border/20 rounded-apple-sm px-2 py-1 text-xs text-apple-fg focus:outline-none font-semibold"
        />
        {mode === 'single' && (
          <>
            <span className="text-[10px] text-apple-secondary-fg">×</span>
            <span className="text-[10px] text-apple-secondary-fg">本金 = 潜在盈利</span>
          </>
        )}
      </div>
    </div>
  );
}

// Export selectionKey re-export so BettingStation can use it
export { selectionKey };
