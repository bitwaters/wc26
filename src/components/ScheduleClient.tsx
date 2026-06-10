'use client';

import React, { useState } from 'react';
import { Predictions, Match, Bet } from '../types';
import GroupStageClient from './GroupStageClient';
import BracketClient from './BracketClient';
import LiveGroupStandings from './LiveGroupStandings';
import { BarChart2, ListTodo, Award } from 'lucide-react';

interface ScheduleClientProps {
  initialPredictions: Predictions;
  initialMatches: Match[];
  initialBets: Bet[];
  groups: Record<string, string[]>;
}

type Tab = 'standings' | 'group' | 'bracket';

export default function ScheduleClient({
  initialPredictions,
  initialMatches,
  initialBets,
  groups
}: ScheduleClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('standings');

  const tabs = [
    { id: 'standings' as Tab, label: '积分榜', icon: BarChart2 },
    { id: 'group' as Tab, label: '小组赛预测', icon: ListTodo },
    { id: 'bracket' as Tab, label: '淘汰赛', icon: Award },
  ];

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
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
