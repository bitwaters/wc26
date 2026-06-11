'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Bet, Match, Player } from '../types';
import PlayerChips from './PlayerChips';
import { useBettorFilter } from './ClientProviders';
import { Search } from 'lucide-react';
import { 
  TrendingUp,
  TrendingDown,
  Percent,
  Activity,
  Flame
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface DashboardClientProps {
  initialBets: Bet[];
  initialMatches: Match[];
  initialPlayers?: Player[];
}

export default function DashboardClient({ initialBets, initialMatches, initialPlayers = [] }: DashboardClientProps) {
  const { bettorId: filterBettorId, setBettorId: setFilterBettorId } = useBettorFilter();
  const [bettorSearch, setBettorSearch] = useState('');
  const [bets, setBets] = useState<Bet[]>(initialBets);

  // 每次组件挂载时拉取最新注单（应对从其他页面切换过来的情况）
  useEffect(() => {
    fetch('/api/bets')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBets(data); })
      .catch(() => {});
  }, []);

  const filteredPlayers = useMemo(() =>
    initialPlayers.filter(p => p.name.toLowerCase().includes(bettorSearch.toLowerCase())),
    [initialPlayers, bettorSearch]
  );

  // Filter bets by bettor
  const filteredBets = useMemo(() => {
    return bets.filter(b =>
      filterBettorId === 'all' || (b.bettorId ?? 'self') === filterBettorId
    );
  }, [bets, filterBettorId]);

  // Map matches for easy lookup
  const matchMap = useMemo(() => {
    const map = new Map<string, Match>();
    initialMatches.forEach(m => map.set(m.id, m));
    return map;
  }, [initialMatches]);

  // 1. Calculate Core Metrics (CNY only for P&L; USDT tracked separately)
  const metrics = useMemo(() => {
    // CNY metrics
    let totalStakes = 0;
    let totalAllStakes = 0;
    let totalReturns = 0;
    let wonCount = 0;
    let lostCount = 0;
    let pendingCount = 0;

    // USDT metrics (returns not tracked — different currency, can't combine with ¥ P&L)
    let usdtTotalAllStakes = 0;
    let usdtPendingCount = 0;

    filteredBets.forEach(bet => {
      const isUsdt = (bet.stakeCurrency ?? 'CNY') === 'USDT';

      if (isUsdt) {
        usdtTotalAllStakes += bet.stake;
        if (bet.status === 'pending') usdtPendingCount++;
      } else {
        totalAllStakes += bet.stake;
        if (bet.status === 'pending') {
          pendingCount++;
          return;
        }
        totalStakes += bet.stake;
        if (bet.status === 'won') {
          wonCount++;
          totalReturns += bet.stake * bet.odds;
        } else if (bet.status === 'lost') {
          lostCount++;
        } else if (bet.status === 'void') {
          totalReturns += bet.stake;
        }
      }
    });

    const netProfit = totalReturns - totalStakes;
    const roi = totalStakes > 0 ? (netProfit / totalStakes) * 100 : 0;
    const totalSettled = wonCount + lostCount;
    const winRate = totalSettled > 0 ? (wonCount / totalSettled) * 100 : 0;
    return {
      totalStakes, totalAllStakes, netProfit, roi,
      winRate, pendingCount, totalSettled,
      usdtTotalAllStakes, usdtPendingCount,
      hasUsdt: usdtTotalAllStakes > 0
    };
  }, [filteredBets]);

  // 2. Prepare Cumulative Profit Trend Data (CNY only — mixing currencies distorts the chart)
  const trendData = useMemo(() => {
    // Sort settled CNY bets chronologically
    const settledBets = filteredBets
      .filter(b => b.status !== 'pending' && (b.stakeCurrency ?? 'CNY') === 'CNY')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let runningProfit = 0;
    const data = [
      { name: '起点', profit: 0, date: '' }
    ];

    settledBets.forEach((bet, index) => {
      let betProfit = 0;
      if (bet.status === 'won') {
        betProfit = bet.stake * bet.odds - bet.stake;
      } else if (bet.status === 'lost') {
        betProfit = -bet.stake;
      }
      // void (push) has 0 profit contribution

      runningProfit += betProfit;
      const match = matchMap.get(bet.matchId);
      const label = match ? `${match.teamA} vs ${match.teamB}` : `注单 ${index + 1}`;
      
      data.push({
        name: label,
        profit: Number(runningProfit.toFixed(2)),
        date: new Date(bet.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      });
    });

    return data;
  }, [filteredBets, matchMap]);

  // 3. Prepare Bet Type Performance Data
  const typePerformanceData = useMemo(() => {
    const types: Record<string, { name: string; profit: number; count: number }> = {
      '1X2': { name: '胜平负 (1X2)', profit: 0, count: 0 },
      'handicap': { name: '让球 (Handicap)', profit: 0, count: 0 },
      'over_under': { name: '大小球 (O/U)', profit: 0, count: 0 },
      'correct_score': { name: '波胆 (Score)', profit: 0, count: 0 },
      'custom': { name: '自定义 (Custom)', profit: 0, count: 0 }
    };

    filteredBets.forEach(bet => {
      if (bet.status === 'pending') return;

      const group = types[bet.betType] || types['custom'];
      group.count++;

      let betProfit = 0;
      if (bet.status === 'won') {
        betProfit = bet.stake * bet.odds - bet.stake;
      } else if (bet.status === 'lost') {
        betProfit = -bet.stake;
      }

      group.profit += betProfit;
    });

    return Object.values(types).filter(t => t.count > 0);
  }, [filteredBets]);

  return (
    <div className="space-y-8 lg:space-y-10">
      {/* Upper header segment */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-apple-secondary-fg text-sm">
            追踪您在 2026 年世界杯的预测表现和下注账目。
          </p>
        </div>
        
      </div>

      {/* Bettor filter: search + chips */}
      {initialPlayers.length > 0 && (
        <div className="flex items-center gap-3">
          {initialPlayers.length >= 4 && (
            <div className="relative flex-shrink-0">
              <Search size={13} className="absolute left-2.5 top-2 text-apple-secondary-fg" />
              <input
                type="text"
                placeholder="搜索..."
                value={bettorSearch}
                onChange={e => setBettorSearch(e.target.value)}
                className="w-24 bg-apple-secondary-bg border border-apple-border/20 rounded-full pl-7 pr-2 py-1.5 text-xs text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <PlayerChips
              players={filteredPlayers}
              bets={bets}
              selectedId={filterBettorId}
              onChange={setFilterBettorId}
            />
          </div>
        </div>
      )}

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Profit Card */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-5 sm:p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-apple-secondary-fg mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">净利润</span>
            {metrics.netProfit >= 0 ? (
              <TrendingUp size={18} className="text-apple-success" />
            ) : (
              <TrendingDown size={18} className="text-apple-danger" />
            )}
          </div>
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${
            metrics.netProfit >= 0 ? 'text-apple-success' : 'text-apple-danger'
          }`}>
            {metrics.netProfit >= 0 ? '+' : ''}
            {`¥${metrics.netProfit.toFixed(2)}`}
          </div>
          <p className="text-[11px] text-apple-secondary-fg mt-2">
            来自 {metrics.totalSettled} 笔已结算注单。
          </p>
        </div>

        {/* ROI/Yield Card */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-5 sm:p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-apple-secondary-fg mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">盈利率 / ROI</span>
            <Percent size={18} className="text-apple-accent" />
          </div>
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${
            metrics.roi >= 0 ? 'text-apple-success' : 'text-apple-danger'
          }`}>
            {metrics.roi >= 0 ? '+' : ''}
            {metrics.roi.toFixed(1)}%
          </div>
          <p className="text-[11px] text-apple-secondary-fg mt-2">
            投注总额与投资收益之比。
          </p>
        </div>

        {/* Win Rate Card */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-5 sm:p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-apple-secondary-fg mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">胜率</span>
            <Flame size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-fg">
            {metrics.winRate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-apple-secondary-fg mt-2">
            不包含走水/退款的注单。
          </p>
        </div>

        {/* Stakes / Active Card */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-5 sm:p-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-apple-secondary-fg mb-3">
            <span className="text-xs font-semibold tracking-wide uppercase">投注总额</span>
            <Activity size={18} className="text-apple-secondary-fg" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-apple-fg">
            {`¥${metrics.totalAllStakes.toFixed(0)}`}
          </div>
          {metrics.hasUsdt && (
            <div className="text-base font-bold text-amber-600 mt-0.5">
              {`${metrics.usdtTotalAllStakes.toFixed(0)} U`}
            </div>
          )}
          <p className="text-[11px] text-apple-secondary-fg mt-2">
            {metrics.pendingCount + metrics.usdtPendingCount > 0
              ? `${metrics.pendingCount + metrics.usdtPendingCount} 笔待结算，`
              : ''}{metrics.totalSettled} 笔已结算。
          </p>
        </div>
      </div>

      {/* Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PnL Area Chart (Large) */}
        <div className="lg:col-span-2 bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-6 backdrop-blur-md shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-apple-fg mb-6">净利润走势图</h2>
          <div className="h-[280px] w-full text-xs">
            {trendData.length <= 1 ? (
              <div className="h-full flex items-center justify-center text-apple-secondary-fg">
                结算至少一场比赛的注单以生成净利润走势曲线。
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metrics.netProfit >= 0 ? '#30d158' : '#ff453a'} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={metrics.netProfit >= 0 ? '#30d158' : '#ff453a'} stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.15} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--secondary-fg)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="var(--secondary-fg)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--secondary-bg)', 
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      color: 'var(--foreground)',
                      fontSize: '11px',
                      fontFamily: 'inherit'
                    }}
                    labelFormatter={(label, items) => {
                      if (items && items[0]) {
                        return `${items[0].payload.name} (${items[0].payload.date || '初始'})`;
                      }
                      return label;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke={metrics.netProfit >= 0 ? 'var(--color-apple-success)' : 'var(--color-apple-danger)'} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#profitGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bet Type Performance Bar Chart (Small) */}
        <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-6 backdrop-blur-md shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-apple-fg mb-6">各玩法净收益</h2>
          <div className="h-[280px] w-full text-xs">
            {typePerformanceData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-apple-secondary-fg text-center">
                结算注单以分析各玩法的收益分布。
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typePerformanceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.15} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--secondary-fg)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="var(--secondary-fg)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'var(--secondary-bg)', 
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      color: 'var(--foreground)',
                      fontSize: '11px',
                      fontFamily: 'inherit'
                    }}
                    formatter={(value) => [
                      `¥${Number(value || 0).toFixed(2)}`,
                      '利润'
                    ]}
                  />
                  <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                    {typePerformanceData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.profit >= 0 ? 'var(--color-apple-success)' : 'var(--color-apple-danger)'}
                        opacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
