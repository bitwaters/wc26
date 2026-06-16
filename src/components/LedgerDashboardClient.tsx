'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Bet, Match, BetType, BetStatus, Player } from '../types';
import { useBettorFilter } from './ClientProviders';
import Flag from './Flag';
import { apiFetch } from '../lib/apiClient';
import { teamZhName } from '../lib/teamNames';
import PlayerChips from './PlayerChips';
import ReconciliationTable from './ReconciliationTable';
import {
  TrendingUp, TrendingDown, Percent, Activity, Flame,
  Search, Download, Upload, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, BarChart, Bar, Cell,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LedgerDashboardClientProps {
  initialBets: Bet[];
  initialMatches: Match[];
  initialPlayers?: Player[];
}

const statusLabels: Record<BetStatus, string> = {
  pending: '待结算',
  won: '赢',
  half_won: '半赢',
  lost: '输',
  half_lost: '半输',
  void: '走水',
};

const statusColors: Record<BetStatus, string> = {
  pending: 'bg-apple-secondary-bg text-apple-secondary-fg border-apple-border/10',
  won: 'bg-apple-success/10 text-apple-success border-apple-success/20',
  half_won: 'bg-apple-success/5 text-apple-success/70 border-apple-success/10',
  lost: 'bg-apple-danger/10 text-apple-danger border-apple-danger/20',
  half_lost: 'bg-apple-danger/5 text-apple-danger/70 border-apple-danger/10',
  void: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LedgerDashboardClient({
  initialBets,
  initialMatches,
  initialPlayers = [],
}: LedgerDashboardClientProps) {
  // ── Shared state ──────────────────────────────────────────────────────────
  const [bets, setBets] = useState<Bet[]>(initialBets);
  const { bettorId: filterBettorId, setBettorId: setFilterBettorId } = useBettorFilter();

  // ── Dashboard state ───────────────────────────────────────────────────────
  const [chartsExpanded, setChartsExpanded] = useState(false);
  useEffect(() => {
    setChartsExpanded(window.innerWidth >= 1024);
  }, []);

  // ── Ledger state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<BetStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<BetType | 'all'>('all');
  const [expandedParlays, setExpandedParlays] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch latest bets on mount (handles navigation from other pages)
  useEffect(() => {
    fetch('/api/bets')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data) setBets(data); })
      .catch(() => {});
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────

  const matchMap = useMemo(() => {
    const map = new Map<string, Match>();
    initialMatches.forEach(m => map.set(m.id, m));
    return map;
  }, [initialMatches]);

  // Bets filtered by bettor only — drives metrics + charts
  const bettorFilteredBets = useMemo(() =>
    bets.filter(b => filterBettorId === 'all' || (b.bettorId ?? 'self') === filterBettorId),
    [bets, filterBettorId]
  );

  // Bets filtered by all criteria — derives from bettorFilteredBets (bettor already applied)
  const ledgerFilteredBets = useMemo(() =>
    bettorFilteredBets.filter(bet => {
      const match = bet.matchId === 'PARLAY' ? undefined : matchMap.get(bet.matchId);
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (match?.teamA ?? '').toLowerCase().includes(q) ||
        (match?.teamB ?? '').toLowerCase().includes(q) ||
        (bet.metadata?.notes ?? '').toLowerCase().includes(q) ||
        bet.betSelection.toLowerCase().includes(q);
      const matchesStatus = filterStatus === 'all' || bet.status === filterStatus;
      const matchesType = filterType === 'all' || bet.betType === filterType;
      return matchesSearch && matchesStatus && matchesType;
    }),
    [bettorFilteredBets, search, filterStatus, filterType, matchMap]
  );

  // ── Metrics (dashboard) ───────────────────────────────────────────────────

  const metrics = useMemo(() => {
    let totalStakes = 0, totalAllStakes = 0, totalReturns = 0;
    let usdtTotalStakes = 0, usdtTotalAllStakes = 0, usdtTotalReturns = 0;
    let wonCount = 0, lostCount = 0, pendingCount = 0;

    bettorFilteredBets.forEach(bet => {
      const isUsdt = (bet.stakeCurrency ?? 'CNY') === 'USDT';
      const settled = bet.status !== 'pending';

      if (isUsdt) {
        usdtTotalAllStakes += bet.stake;
        if (!settled) { pendingCount++; return; }
        usdtTotalStakes += bet.stake;
        if (bet.status === 'won') { wonCount++; usdtTotalReturns += bet.stake * bet.odds; }
        else if (bet.status === 'half_won') { wonCount++; usdtTotalReturns += bet.stake * (bet.odds + 1) / 2; }
        else if (bet.status === 'lost') { lostCount++; }
        else if (bet.status === 'half_lost') { lostCount++; usdtTotalReturns += bet.stake / 2; }
        else if (bet.status === 'void') { usdtTotalReturns += bet.stake; }
      } else {
        totalAllStakes += bet.stake;
        if (!settled) { pendingCount++; return; }
        totalStakes += bet.stake;
        if (bet.status === 'won') { wonCount++; totalReturns += bet.stake * bet.odds; }
        else if (bet.status === 'half_won') { wonCount++; totalReturns += bet.stake * (bet.odds + 1) / 2; }
        else if (bet.status === 'lost') { lostCount++; }
        else if (bet.status === 'half_lost') { lostCount++; totalReturns += bet.stake / 2; }
        else if (bet.status === 'void') { totalReturns += bet.stake; }
      }
    });

    const netProfit = totalReturns - totalStakes;
    const usdtNetProfit = usdtTotalReturns - usdtTotalStakes;
    const roi = totalStakes > 0
      ? (netProfit / totalStakes) * 100
      : usdtTotalStakes > 0 ? (usdtNetProfit / usdtTotalStakes) * 100 : 0;
    const totalSettled = wonCount + lostCount;
    const winRate = totalSettled > 0 ? (wonCount / totalSettled) * 100 : 0;

    return {
      totalStakes, totalAllStakes, netProfit,
      usdtTotalStakes, usdtTotalAllStakes, usdtNetProfit,
      roi, winRate, pendingCount, totalSettled,
      hasUsdt: usdtTotalAllStakes > 0,
      hasCny: totalAllStakes > 0,
    };
  }, [bettorFilteredBets]);

  // ── Trend data (dashboard) ────────────────────────────────────────────────

  const trendData = useMemo(() => {
    const cnySettled = bettorFilteredBets.filter(b => b.status !== 'pending' && (b.stakeCurrency ?? 'CNY') === 'CNY');
    const settledBets = (cnySettled.length > 0
      ? cnySettled
      : bettorFilteredBets.filter(b => b.status !== 'pending')
    ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let running = 0;
    const data = [{ name: '起点', profit: 0, date: '' }];
    settledBets.forEach((bet, i) => {
      let p = 0;
      if (bet.status === 'won') p = bet.stake * bet.odds - bet.stake;
      else if (bet.status === 'half_won') p = bet.stake * (bet.odds - 1) / 2;
      else if (bet.status === 'lost') p = -bet.stake;
      else if (bet.status === 'half_lost') p = -bet.stake / 2;
      running += p;
      const match = bet.matchId === 'PARLAY' ? undefined : matchMap.get(bet.matchId);
      const label = bet.matchId === 'PARLAY'
        ? `串关 ${i + 1}`
        : match ? `${match.teamA} vs ${match.teamB}` : `注单 ${i + 1}`;
      data.push({
        name: label,
        profit: Number(running.toFixed(2)),
        date: new Date(bet.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    });
    return data;
  }, [bettorFilteredBets, matchMap]);

  // ── Type performance data (dashboard) ─────────────────────────────────────

  const typePerformanceData = useMemo(() => {
    const types: Record<string, { name: string; profit: number; count: number }> = {
      '1X2': { name: '胜平负', profit: 0, count: 0 },
      'asian_handicap': { name: '亚盘', profit: 0, count: 0 },
      'over_under': { name: '大小球', profit: 0, count: 0 },
      'correct_score': { name: '波胆', profit: 0, count: 0 },
      'parlay': { name: '串关', profit: 0, count: 0 },
      'custom': { name: '其他', profit: 0, count: 0 },
    };
    bettorFilteredBets.forEach(bet => {
      if (bet.status === 'pending') return;
      const group = types[bet.betType] ?? types['custom'];
      group.count++;
      if (bet.status === 'won') group.profit += bet.stake * bet.odds - bet.stake;
      else if (bet.status === 'half_won') group.profit += bet.stake * (bet.odds - 1) / 2;
      else if (bet.status === 'lost') group.profit -= bet.stake;
      else if (bet.status === 'half_lost') group.profit -= bet.stake / 2;
    });
    return Object.values(types).filter(t => t.count > 0);
  }, [bettorFilteredBets]);

  // ── Ledger helpers ────────────────────────────────────────────────────────

  const getSettleDetail = (bet: Bet) => {
    if (bet.betType === 'parlay') return `${bet.legs?.length ?? 0}串1 串关`;
    let detail = bet.betSelection;
    if (bet.betType === 'handicap' || bet.betType === 'asian_handicap') {
      const val = bet.metadata?.handicapValue;
      if (val !== undefined) {
        detail = `${bet.betSelection} (${val >= 0 ? '+' : ''}${val})`;
      }
    } else if (bet.betType === 'over_under') {
      detail = `${bet.betSelection === 'over' ? '大' : '小'} ${bet.metadata?.threshold}`;
    } else if (bet.betType === 'btts') {
      detail = `两队都进球: ${bet.betSelection === 'yes' ? '是' : '否'}`;
    } else if (bet.betType === 'total_goals') {
      detail = `总进球 ${bet.betSelection} 球`;
    }
    return detail;
  };

  const toggleParlay = useCallback((id: string) => {
    setExpandedParlays(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteBet = async (betId: string) => {
    if (!confirm('您确定要删除这笔下注记录吗？')) return;
    try {
      const res = await apiFetch(`/api/bets?betId=${betId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除下注失败。');
      setBets(prev => prev.filter(b => b.id !== betId));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bets, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', '投注账本_bets_backup.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const merge = confirm(
          '导入模式选择：\n\n确定 = 合并导入（保留现有记录，同 ID 覆盖）\n取消 = 完全替换（清空现有账本后导入）'
        );
        const res = await apiFetch('/api/bets/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bets: parsed, mode: merge ? 'merge' : 'replace' }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '导入失败');
        alert(`成功导入 ${data.count} 笔下注记录！`);
        window.location.reload();
      } catch (err) {
        alert('解析文件失败: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 lg:space-y-10">

      {/* ── 页面 header ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-apple-secondary-fg text-sm">追踪您在 2026 年世界杯的预测表现和下注账目。</p>
      </div>

      {/* ── 投注人筛选（共用） ──────────────────────────────────────────── */}
      {initialPlayers.length > 0 && (
        <PlayerChips
          players={initialPlayers}
          bets={bets}
          selectedId={filterBettorId}
          onChange={setFilterBettorId}
        />
      )}

      {/* ── 4 指标卡 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* 净利润 */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-5 sm:p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-apple-secondary-fg mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">净利润</span>
            {(metrics.hasCny ? metrics.netProfit : metrics.usdtNetProfit) >= 0
              ? <TrendingUp size={18} className="text-apple-success" />
              : <TrendingDown size={18} className="text-apple-danger" />}
          </div>
          {metrics.hasCny && (
            <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${metrics.netProfit >= 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
              {metrics.netProfit >= 0 ? '+' : ''}¥{metrics.netProfit.toFixed(2)}
            </div>
          )}
          {metrics.hasUsdt && (
            <div className={`font-bold tracking-tight ${metrics.hasCny ? 'text-base mt-0.5' : 'text-2xl sm:text-3xl'} ${metrics.usdtNetProfit >= 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
              {metrics.usdtNetProfit >= 0 ? '+' : ''}{metrics.usdtNetProfit.toFixed(2)} U
            </div>
          )}
          {!metrics.hasCny && !metrics.hasUsdt && (
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-success">+¥0.00</div>
          )}
          <p className="text-[11px] text-apple-secondary-fg mt-2">来自 {metrics.totalSettled} 笔已结算注单。</p>
        </div>

        {/* ROI */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-5 sm:p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-apple-secondary-fg mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">盈利率 / ROI</span>
            <Percent size={18} className="text-apple-accent" />
          </div>
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${metrics.roi >= 0 ? 'text-apple-success' : 'text-apple-danger'}`}>
            {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(1)}%
          </div>
          <p className="text-[11px] text-apple-secondary-fg mt-2">投注总额与投资收益之比。</p>
        </div>

        {/* 胜率 */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-5 sm:p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-apple-secondary-fg mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">胜率</span>
            <Flame size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-fg">
            {metrics.winRate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-apple-secondary-fg mt-2">不包含走水/退款的注单。</p>
        </div>

        {/* 投注总额 */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-5 sm:p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-apple-secondary-fg mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">投注总额</span>
            <Activity size={18} className="text-apple-secondary-fg" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-fg">
            ¥{metrics.totalAllStakes.toFixed(0)}
          </div>
          {metrics.hasUsdt && (
            <div className="text-base font-bold text-amber-600 mt-0.5">{metrics.usdtTotalAllStakes.toFixed(0)} U</div>
          )}
          <p className="text-[11px] text-apple-secondary-fg mt-2">
            {metrics.pendingCount > 0 ? `${metrics.pendingCount} 笔待结算，` : ''}{metrics.totalSettled} 笔已结算。
          </p>
        </div>
      </div>

      {/* ── 图表区（可折叠） ────────────────────────────────────────────── */}
      <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl overflow-hidden backdrop-blur-md shadow-sm">
        <button
          onClick={() => setChartsExpanded(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-apple-secondary-bg/30 transition-colors"
        >
          <h2 className="text-sm font-bold text-apple-fg">趋势图表</h2>
          {chartsExpanded ? <ChevronUp size={16} className="text-apple-secondary-fg" /> : <ChevronDown size={16} className="text-apple-secondary-fg" />}
        </button>

        {chartsExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 pb-6">
            {/* 净利润走势 */}
            <div className="lg:col-span-2">
              <h3 className="text-xs font-semibold text-apple-secondary-fg uppercase tracking-wide mb-4">净利润走势</h3>
              <div className="h-[240px] w-full text-xs">
                {trendData.length <= 1 ? (
                  <div className="h-full flex items-center justify-center text-apple-secondary-fg text-center text-xs">
                    结算至少一场比赛的注单以生成走势图
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={metrics.netProfit >= 0 ? '#30d158' : '#ff453a'} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={metrics.netProfit >= 0 ? '#30d158' : '#ff453a'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.15} vertical={false} />
                      <XAxis dataKey="date" stroke="var(--secondary-fg)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--secondary-fg)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--secondary-bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)', fontSize: '11px', fontFamily: 'inherit' }}
                        labelFormatter={(_, items) => items?.[0] ? `${items[0].payload.name} (${items[0].payload.date || '初始'})` : ''}
                      />
                      <Area type="monotone" dataKey="profit" stroke={metrics.netProfit >= 0 ? 'var(--color-apple-success)' : 'var(--color-apple-danger)'} strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* 各玩法净收益 */}
            <div>
              <h3 className="text-xs font-semibold text-apple-secondary-fg uppercase tracking-wide mb-4">各玩法净收益</h3>
              <div className="h-[240px] w-full text-xs">
                {typePerformanceData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-apple-secondary-fg text-center text-xs">
                    结算注单以分析各玩法收益
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typePerformanceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.15} vertical={false} />
                      <XAxis dataKey="name" stroke="var(--secondary-fg)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--secondary-fg)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--secondary-bg)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)', fontSize: '11px', fontFamily: 'inherit' }}
                        formatter={(value) => [`${metrics.hasCny ? '¥' : ''}${Number(value || 0).toFixed(2)}${!metrics.hasCny && metrics.hasUsdt ? ' U' : ''}`, '利润']}
                      />
                      <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                        {typePerformanceData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.profit >= 0 ? 'var(--color-apple-success)' : 'var(--color-apple-danger)'} opacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 对账汇总 ────────────────────────────────────────────────────── */}
      {initialPlayers.length > 0 && (
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-6 backdrop-blur-md shadow-sm">
          <ReconciliationTable players={initialPlayers} bets={bets} />
        </div>
      )}

      {/* ── 注单明细 ────────────────────────────────────────────────────── */}
      <div className="space-y-4">

        {/* 区块 header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-apple-fg">注单明细</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 bg-apple-secondary-bg hover:bg-apple-border/40 text-apple-fg border border-apple-border/20 rounded-apple-md transition-all"
            >
              <Download size={12} />
              导出
            </button>
            <button
              onClick={handleImportClick}
              className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 bg-apple-secondary-bg hover:bg-apple-border/40 text-apple-fg border border-apple-border/20 rounded-apple-md transition-all"
            >
              <Upload size={12} />
              导入
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
          </div>
        </div>

        {/* 搜索 + 过滤 */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-4 sm:p-5 backdrop-blur-md shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 text-apple-secondary-fg" size={16} />
              <input
                type="text"
                placeholder="搜索队伍、赔率、备注等..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md pl-10 pr-4 py-2.5 text-sm text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as BetStatus | 'all')}
                className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md px-3 py-2.5 text-xs font-bold text-apple-fg focus:outline-none"
              >
                <option value="all">全部结算状态</option>
                <option value="pending">待结算</option>
                <option value="won">红单 (赢)</option>
                <option value="lost">黑单 (输)</option>
                <option value="void">走水 (退款)</option>
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as BetType | 'all')}
                className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md px-3 py-2.5 text-xs font-bold text-apple-fg focus:outline-none"
              >
                <option value="all">全部投注玩法</option>
                <option value="parlay">串关</option>
                <option value="1X2">胜平负 (1X2)</option>
                <option value="asian_handicap">亚盘让球</option>
                <option value="handicap">让球 (旧)</option>
                <option value="over_under">大小球 (O/U)</option>
                <option value="correct_score">波胆</option>
                <option value="btts">两队都进球</option>
                <option value="ht_ft">半场/全场</option>
                <option value="total_goals">总进球数</option>
                <option value="first_half_1x2">上半场胜平负</option>
                <option value="first_half_ou">上半场大小球</option>
                <option value="custom">自定义</option>
              </select>
            </div>
          </div>
        </div>

        {/* 账单表格 */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl overflow-hidden backdrop-blur-md shadow-sm">

          {/* 桌面表格 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-apple-border/20 bg-apple-secondary-bg/30 text-[10px] font-bold text-apple-secondary-fg tracking-wider uppercase">
                  <th className="py-4 px-6">赛事对阵</th>
                  <th className="py-4 px-6">投注人</th>
                  <th className="py-4 px-6">日期</th>
                  <th className="py-4 px-6">下注详情</th>
                  <th className="py-4 px-6">赔率 / 本金</th>
                  <th className="py-4 px-6 text-center">结算状态</th>
                  <th className="py-4 px-6 text-right">净收益</th>
                  <th className="py-4 px-6 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-border/10 text-xs">
                {ledgerFilteredBets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-apple-secondary-fg">未找到符合条件的下注单。</td>
                  </tr>
                ) : (
                  ledgerFilteredBets.map(bet => {
                    const match = bet.matchId === 'PARLAY' ? undefined : matchMap.get(bet.matchId);
                    const settleDetail = getSettleDetail(bet);
                    let pnl = 0;
                    if (bet.status === 'won') pnl = bet.stake * bet.odds - bet.stake;
                    else if (bet.status === 'lost') pnl = -bet.stake;

                    return (
                      <tr key={bet.id} className="hover:bg-apple-secondary-bg/20 transition-colors">
                        {/* 赛事 */}
                        <td className="py-4 px-6">
                          {bet.betType === 'parlay' ? (
                            <div className="space-y-1">
                              <div className="font-bold text-apple-fg text-xs">{bet.legs?.length ?? 0}串1 串关</div>
                              <button onClick={() => toggleParlay(bet.id)} className="text-[10px] text-apple-accent hover:underline">
                                {expandedParlays.has(bet.id) ? '收起' : `展开 ${bet.legs?.length ?? 0} 关`}
                              </button>
                              {expandedParlays.has(bet.id) && bet.legs && (
                                <div className="mt-1 space-y-0.5">
                                  {bet.legs.map((leg, i) => {
                                    const lm = matchMap.get(leg.matchId);
                                    return (
                                      <div key={i} className="text-[10px] text-apple-secondary-fg flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${leg.status === 'won' ? 'bg-apple-success' : leg.status === 'lost' ? 'bg-apple-danger' : leg.status === 'void' ? 'bg-neutral-400' : 'bg-apple-accent'}`} />
                                        <span>{lm ? `${teamZhName(lm.teamA)} vs ${teamZhName(lm.teamB)}` : leg.matchId}</span>
                                        <span>·</span>
                                        <span>{leg.betSelection}</span>
                                        <span>@{leg.odds.toFixed(2)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ) : match ? (
                            <div className="flex items-center space-x-3 font-semibold text-apple-fg">
                              <div className="flex flex-col space-y-1">
                                <span className="flex items-center space-x-2"><Flag teamName={match.teamA} size={11} /><span>{teamZhName(match.teamA)}</span></span>
                                <span className="flex items-center space-x-2"><Flag teamName={match.teamB} size={11} /><span>{teamZhName(match.teamB)}</span></span>
                              </div>
                              {match.status === 'finished' && (
                                <span className="text-[10px] text-apple-secondary-fg bg-apple-secondary-bg px-1.5 py-0.5 rounded-[4px] border border-apple-border/20">
                                  {match.scoreA} - {match.scoreB}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-apple-secondary-fg">未知赛事</span>
                          )}
                        </td>

                        {/* 投注人 */}
                        <td className="py-4 px-6">
                          {(() => {
                            const player = initialPlayers.find(p => p.id === (bet.bettorId ?? 'self'));
                            return player ? (
                              <span className="flex items-center space-x-1.5 text-xs font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: player.color }} />
                                <span className="text-apple-fg">{player.name}</span>
                              </span>
                            ) : <span className="text-xs text-apple-secondary-fg">已删除</span>;
                          })()}
                        </td>

                        {/* 日期 */}
                        <td className="py-4 px-6 text-apple-secondary-fg">
                          {bet.betType === 'parlay'
                            ? new Date(bet.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                            : match
                              ? new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                              : '暂无'}
                        </td>

                        {/* 下注详情 */}
                        <td className="py-4 px-6">
                          <div className="font-semibold text-apple-fg">{settleDetail}</div>
                          <div className="text-[10px] text-apple-secondary-fg font-medium tracking-wide uppercase mt-0.5">{bet.betType}</div>
                        </td>

                        {/* 赔率 / 本金 */}
                        <td className="py-4 px-6">
                          <div className="font-semibold text-apple-fg">@{bet.odds.toFixed(2)}</div>
                          <div className="text-[10px] text-apple-secondary-fg font-medium mt-0.5">¥{bet.stake}</div>
                        </td>

                        {/* 结算状态 */}
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase ${statusColors[bet.status]}`}>
                            {statusLabels[bet.status]}
                          </span>
                        </td>

                        {/* 净收益 */}
                        <td className={`py-4 px-6 text-right font-bold ${bet.status === 'won' ? 'text-apple-success' : bet.status === 'lost' ? 'text-apple-danger' : 'text-apple-secondary-fg'}`}>
                          {bet.status === 'won' ? '+' : ''}
                          {bet.status === 'pending' || bet.status === 'void' ? '—' : `¥${pnl.toFixed(2)}`}
                        </td>

                        {/* 删除 */}
                        <td className="py-4 px-6 text-right">
                          <button onClick={() => handleDeleteBet(bet.id)} className="p-1.5 hover:bg-apple-secondary-bg text-apple-secondary-fg hover:text-apple-danger rounded-full transition-colors inline-block">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 手机卡片视图 */}
          <div className="block md:hidden divide-y divide-apple-border/10">
            {ledgerFilteredBets.length === 0 ? (
              <div className="text-center py-10 text-xs text-apple-secondary-fg">未找到符合条件的下注单。</div>
            ) : (
              ledgerFilteredBets.map(bet => {
                const match = bet.matchId === 'PARLAY' ? undefined : matchMap.get(bet.matchId);
                const settleDetail = getSettleDetail(bet);
                let pnl = 0;
                if (bet.status === 'won') pnl = bet.stake * bet.odds - bet.stake;
                else if (bet.status === 'lost') pnl = -bet.stake;

                return (
                  <div key={bet.id} className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      {bet.betType === 'parlay' ? (
                        <div className="text-xs font-bold text-apple-fg">{bet.legs?.length ?? 0}串1 串关</div>
                      ) : match ? (
                        <div className="flex items-center space-x-2 font-bold text-apple-fg text-xs">
                          <span className="flex items-center space-x-1.5"><Flag teamName={match.teamA} size={10} /><span className="truncate max-w-[80px]">{teamZhName(match.teamA)}</span></span>
                          <span className="text-apple-secondary-fg">vs</span>
                          <span className="flex items-center space-x-1.5"><Flag teamName={match.teamB} size={10} /><span className="truncate max-w-[80px]">{teamZhName(match.teamB)}</span></span>
                        </div>
                      ) : (
                        <span className="text-xs text-apple-secondary-fg">未知比赛</span>
                      )}
                      <div className="text-[10px] text-apple-secondary-fg font-semibold">
                        {bet.betType === 'parlay'
                          ? new Date(bet.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                          : match ? new Date(match.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '暂无'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-apple-fg">{settleDetail}</div>
                        <div className="text-[9px] text-apple-secondary-fg font-medium tracking-wide uppercase mt-0.5">{bet.betType} • @{bet.odds.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-apple-secondary-fg font-medium">本金</div>
                        <div className="text-xs font-bold text-apple-fg">¥{bet.stake}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-apple-border/5">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded-[4px] border text-[8px] font-bold uppercase ${statusColors[bet.status]}`}>{statusLabels[bet.status]}</span>
                        <button onClick={() => handleDeleteBet(bet.id)} className="p-1 hover:bg-apple-secondary-bg text-apple-secondary-fg hover:text-apple-danger rounded-full transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <div className={`text-xs font-bold ${bet.status === 'won' ? 'text-apple-success' : bet.status === 'lost' ? 'text-apple-danger' : 'text-apple-secondary-fg'}`}>
                        {bet.status === 'won' ? '+' : ''}
                        {bet.status === 'pending' || bet.status === 'void' ? '—' : `¥${pnl.toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
