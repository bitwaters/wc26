'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Predictions, Match, Bet } from '../types';
import { apiFetch } from '../lib/apiClient';
import GroupStageClient from './GroupStageClient';
import BracketClient from './BracketClient';
import LiveGroupStandings from './LiveGroupStandings';
import MatchScoresList from './MatchScoresList';
import { BarChart2, ListTodo, Award, Activity, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface ScheduleClientProps {
  initialPredictions: Predictions;
  initialMatches: Match[];
  initialBets: Bet[];
  groups: Record<string, string[]>;
}

type Tab = 'standings' | 'group' | 'bracket' | 'scores';
type SyncState = 'idle' | 'syncing' | 'done' | 'error';

const SYNC_CUTOFF_MS = 90 * 60 * 1000;

export default function ScheduleClient({
  initialPredictions,
  initialMatches,
  initialBets,
  groups
}: ScheduleClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('standings');

  // Task 3.2 — sync state
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [resultMessage, setResultMessage] = useState('');
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Task 3.1 — count matches past cutoff that still need syncing
  const pendingMatchCount = useMemo(() => {
    const now = Date.now();
    return initialMatches.filter(
      m => m.status === 'scheduled' && new Date(m.date).getTime() <= now - SYNC_CUTOFF_MS
    ).length;
  }, [initialMatches]);

  // Task 3.3 — SSE consumer
  const handleSyncAll = useCallback(async () => {
    if (syncState === 'syncing') return;
    setSyncState('syncing');
    setProgress(0);
    setTotal(0);
    setResultMessage('');
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);

    try {
      const res = await apiFetch('/api/matches/sync-all', { method: 'POST' });

      // Task 3.7 — API Key missing (HTTP 400 before SSE stream)
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: '请求失败' }));
        const isKeyMissing = res.status === 400 && json.error?.includes('API key');
        setSyncState('error');
        setResultMessage(isKeyMissing ? '__key_missing__' : (json.error ?? '同步失败'));
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const chunk of lines) {
          const line = chunk.trim();
          if (!line.startsWith('data:')) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());

            if (evt.type === 'progress') {
              setProgress(evt.current);
              setTotal(evt.total);
            } else if (evt.type === 'done') {
              // Task 3.6 — refresh SSR data after 2s
              const parts: string[] = [];
              if (evt.syncedCount > 0) parts.push(`更新 ${evt.syncedCount} 场`);
              if (evt.settledCount > 0) parts.push(`结算 ${evt.settledCount} 笔注单`);
              if (evt.errorCount > 0) parts.push(`${evt.errorCount} 场失败`);
              const msg = parts.length > 0 ? parts.join('，') : '暂无新结果';
              setResultMessage(msg);
              setSyncState('done');
              doneTimerRef.current = setTimeout(() => {
                router.refresh();
                setSyncState('idle');
                setResultMessage('');
              }, 2000);
            }
          } catch {
            // ignore malformed SSE lines
          }
        }
      }
    } catch (e) {
      setSyncState('error');
      setResultMessage((e as Error).message ?? '网络错误');
      doneTimerRef.current = setTimeout(() => {
        setSyncState('idle');
        setResultMessage('');
      }, 4000);
    }
  }, [syncState, router]);

  const tabs = [
    { id: 'standings' as Tab, label: '积分榜', icon: BarChart2 },
    { id: 'scores' as Tab, label: '比分', icon: Activity },
    { id: 'group' as Tab, label: '小组赛预测', icon: ListTodo },
    { id: 'bracket' as Tab, label: '淘汰赛', icon: Award },
  ];

  return (
    <div className="space-y-6">
      {/* Task 3.4 — Tab switcher + Sync button row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex p-0.5 rounded-apple-md bg-apple-secondary-bg border border-apple-border/20">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-1.5 rounded-apple-sm text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-apple-bg text-apple-fg shadow-sm'
                    : 'text-apple-secondary-fg hover:text-apple-fg'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* AI Sync button */}
        <div className="flex items-center gap-2">
          {/* Task 3.7 — API key missing error with settings link */}
          {syncState === 'error' && resultMessage === '__key_missing__' && (
            <span className="text-xs text-apple-danger flex items-center gap-1">
              <AlertCircle size={12} />
              未配置 API Key —{' '}
              <a href="/settings" className="underline hover:text-apple-accent">去设置</a>
            </span>
          )}
          {syncState === 'error' && resultMessage !== '__key_missing__' && (
            <span className="text-xs text-apple-danger flex items-center gap-1">
              <AlertCircle size={12} />
              {resultMessage}
            </span>
          )}
          {syncState === 'done' && (
            <span className="text-xs text-apple-success flex items-center gap-1">
              <CheckCircle size={12} />
              {resultMessage}
            </span>
          )}

          {/* Task 3.5 — disabled when no pending matches */}
          <button
            onClick={handleSyncAll}
            disabled={syncState === 'syncing' || pendingMatchCount === 0}
            title={pendingMatchCount === 0 ? '暂无需同步的比赛' : `同步 ${pendingMatchCount} 场已到时间的比赛`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-apple-sm text-xs font-semibold border transition-all ${
              syncState === 'syncing'
                ? 'bg-apple-accent/10 border-apple-accent/30 text-apple-accent cursor-not-allowed'
                : pendingMatchCount === 0
                ? 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg/40 cursor-not-allowed'
                : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg hover:border-apple-accent/40'
            }`}
          >
            <RefreshCw
              size={12}
              className={syncState === 'syncing' ? 'animate-spin' : ''}
            />
            {syncState === 'syncing'
              ? total > 0 ? `同步中 ${progress}/${total}` : '连接中...'
              : 'AI 同步比分'}
          </button>
        </div>
      </div>

      {activeTab === 'scores' && (
        <MatchScoresList matches={initialMatches} />
      )}

      {activeTab === 'standings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Object.entries(groups).map(([groupName, teams]) => (
            <LiveGroupStandings
              key={groupName}
              groupName={groupName}
              teams={teams}
              matches={initialMatches}
            />
          ))}
        </div>
      )}

      {activeTab === 'group' && (
        <GroupStageClient
          initialPredictions={initialPredictions}
          initialMatches={initialMatches}
          groups={groups}
        />
      )}

      {activeTab === 'bracket' && (
        <BracketClient
          initialPredictions={initialPredictions}
          initialMatches={initialMatches}
          initialBets={initialBets}
        />
      )}
    </div>
  );
}
