'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Predictions, Match } from '../types';
import Flag from './Flag';
import { Save, AlertCircle, Award, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { teamZhName } from '../lib/teamNames';

interface GroupStageClientProps {
  initialPredictions: Predictions;
  initialMatches: Match[];
  groups: Record<string, string[]>;
}

export default function GroupStageClient({ initialPredictions, groups }: GroupStageClientProps) {
  const router = useRouter();

  // Initialize group standings state
  // We store them as Record<string, [first, second, third]>
  const [standings, setStandings] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    Object.keys(groups).forEach(gName => {
      initial[gName] = initialPredictions.groupStandings[gName] || ['', '', ''];
    });
    return initial;
  });

  // Initialize best third place teams state (array of group names)
  const [bestThirds, setBestThirds] = useState<string[]>(initialPredictions.bestThirdTeams || []);
  
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const groupNames = Object.keys(groups);

  const handleRankSelect = (groupName: string, team: string, rankIdx: number) => {
    const current = [...(standings[groupName] || ['', '', ''])];
    
    // Toggle off if clicking the same rank
    if (current[rankIdx] === team) {
      current[rankIdx] = '';
    } else {
      // Clear team from any other rank in this group first
      for (let i = 0; i < 3; i++) {
        if (current[i] === team) {
          current[i] = '';
        }
      }
      // Clear this rank from any other team
      current[rankIdx] = team;
    }

    setStandings({
      ...standings,
      [groupName]: current
    });

    // If we changed the 3rd place team or cleared it, verify if we need to remove it from bestThirds
    const prevThird = standings[groupName]?.[2];
    const newThird = current[2];
    if (prevThird && prevThird !== newThird) {
      setBestThirds(prev => prev.filter(g => g !== groupName));
    }
  };

  const handleThirdCheckboxToggle = (groupName: string) => {
    if (bestThirds.includes(groupName)) {
      setBestThirds(prev => prev.filter(g => g !== groupName));
    } else {
      if (bestThirds.length >= 8) {
        alert("根据国际足联规则，您最多只能选择 8 支成绩最好的第三名队伍。");
        return;
      }
      setBestThirds(prev => [...prev, groupName]);
    }
  };

  const handleSave = async () => {
    // Validation
    const incompleteGroups: string[] = [];
    groupNames.forEach(gName => {
      const arr = standings[gName] || [];
      if (!arr[0] || !arr[1] || !arr[2]) {
        incompleteGroups.push(gName);
      }
    });

    if (incompleteGroups.length > 0) {
      alert(`请为所有小组选出第 1、第 2 和第 3 名队伍。\n未完成的小组: ${incompleteGroups.join(', ')}`);
      return;
    }

    if (bestThirds.length !== 8) {
      alert(`请恰好选择 8 支成绩最好的小组第三名队伍。(当前已选: ${bestThirds.length}/8)`);
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiFetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupStandings: standings,
          bestThirdTeams: bestThirds
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save predictions.');
      }

      setToastMessage('预测排名已保存！正在跳转至淘汰赛...');
      setShowToast(true);

      setTimeout(() => {
        setIsSaving(false);
        setShowToast(false);
        router.push('/schedule');
      }, 1500);

    } catch (e) {
      console.error(e);
      alert('保存排名失败: ' + (e as Error).message);
      setIsSaving(false);
    }
  };

  // List of groups that have a designated 3rd place team
  const availableThirds = groupNames.map(gName => ({
    groupName: gName,
    team: standings[gName]?.[2]
  })).filter(item => item.team !== '');

  return (
    <div className="space-y-8 lg:space-y-10 pb-20">
      
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-apple-fg flex items-center">
          <Award className="mr-3 text-apple-accent" size={32} />
          小组赛预测
          <span className="ml-3 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">
            沙盒预测
          </span>
        </h1>
        <p className="text-apple-secondary-fg text-sm mt-1">
          手动设定各组排名以生成淘汰赛对阵预测。此处排名<strong>不影响</strong>「积分榜」中的真实积分——真实积分由已录入的比赛比分自动计算。
        </p>
      </div>

      {/* Grid of 12 Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {groupNames.map(groupName => {
          const teams = groups[groupName];
          const currentStandings = standings[groupName] || ['', '', ''];

          return (
            <div 
              key={groupName}
              className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-5 sm:p-6 backdrop-blur-md shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-apple-border/10">
                <h2 className="text-md font-bold tracking-tight text-apple-fg">{groupName}</h2>
                <div className="text-[10px] text-apple-secondary-fg font-semibold tracking-wider uppercase">
                  选择小组名次
                </div>
              </div>

              <div className="space-y-3">
                {teams.map(team => {
                  const firstIdx = currentStandings.indexOf(team);
                  
                  return (
                    <div 
                      key={team} 
                      className="flex items-center justify-between py-1 px-1.5 rounded-apple-md hover:bg-apple-secondary-bg/30 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Flag teamName={team} size={16} />
                        <span className="text-sm font-medium text-apple-fg">{teamZhName(team)}</span>
                      </div>

                      {/* iOS Segmented Pill Group */}
                      <div className="inline-flex p-0.5 rounded-[8px] bg-apple-secondary-bg border border-apple-border/10">
                        <button
                          onClick={() => handleRankSelect(groupName, team, 0)}
                          className={`px-3 py-1 rounded-[6px] text-[10px] font-bold transition-all duration-150 ${
                            firstIdx === 0
                              ? 'bg-apple-accent text-white shadow-sm'
                              : 'text-apple-secondary-fg hover:text-apple-fg'
                          }`}
                        >
                          第一
                        </button>
                        <button
                          onClick={() => handleRankSelect(groupName, team, 1)}
                          className={`px-3 py-1 rounded-[6px] text-[10px] font-bold transition-all duration-150 ${
                            firstIdx === 1
                              ? 'bg-apple-accent text-white shadow-sm'
                              : 'text-apple-secondary-fg hover:text-apple-fg'
                          }`}
                        >
                          第二
                        </button>
                        <button
                          onClick={() => handleRankSelect(groupName, team, 2)}
                          className={`px-3 py-1 rounded-[6px] text-[10px] font-bold transition-all duration-150 ${
                            firstIdx === 2
                              ? 'bg-apple-secondary-fg text-white shadow-sm'
                              : 'text-apple-secondary-fg hover:text-apple-fg'
                          }`}
                        >
                          第三
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Wildcard Section (Best 3rd-Place Teams) */}
      <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-6 backdrop-blur-md shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-apple-border/10">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-apple-fg">小组第三名外卡晋级资格</h2>
            <p className="text-apple-secondary-fg text-xs mt-0.5">
              请准确选择 8 支成绩最好的第三名队伍晋级淘汰赛 (已选择: {bestThirds.length}/8)。
            </p>
          </div>
          
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-[6px] border text-[11px] font-semibold tracking-wide uppercase ${
            bestThirds.length === 8 
              ? 'bg-apple-success/10 border-apple-success/30 text-apple-success' 
              : 'bg-apple-secondary-bg border-apple-border/40 text-apple-secondary-fg'
          }`}>
            <AlertCircle size={14} />
            <span>已选择 {bestThirds.length} / 8 个</span>
          </div>
        </div>

        {availableThirds.length === 0 ? (
          <div className="text-center py-8 text-sm text-apple-secondary-fg">
            请先在上方设定各组的第三名队伍，以便在此选择外卡晋级。
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {availableThirds.map(({ groupName, team }) => {
              const isSelected = bestThirds.includes(groupName);
              
              return (
                <button
                  key={groupName}
                  onClick={() => handleThirdCheckboxToggle(groupName)}
                  className={`flex flex-col items-center justify-center p-4 rounded-apple-lg border transition-all duration-200 text-center space-y-3 select-none ${
                    isSelected
                      ? 'bg-apple-accent/5 border-apple-accent text-apple-fg ring-1 ring-apple-accent'
                      : 'bg-apple-secondary-bg/30 hover:bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
                  }`}
                >
                  <div className="text-[10px] font-bold tracking-wider uppercase text-apple-secondary-fg">
                    {groupName}
                  </div>
                  
                  <div className="flex flex-col items-center space-y-1.5">
                    <Flag teamName={team} size={16} />
                    <span className="text-xs font-semibold tracking-tight">{teamZhName(team)}</span>
                  </div>

                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    isSelected 
                      ? 'bg-apple-accent border-apple-accent text-white' 
                      : 'border-apple-border/60 bg-apple-bg'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Save Bar */}
      <div className="fixed bottom-16 lg:bottom-6 left-0 right-0 lg:left-[260px] flex justify-center px-6 z-30 pointer-events-none">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="pointer-events-auto flex items-center space-x-2 bg-apple-fg hover:bg-apple-fg/90 text-apple-bg rounded-full font-semibold px-8 py-3.5 transition-all shadow-lg active:scale-[0.98]"
        >
          <Save size={18} />
          <span>{isSaving ? '保存中...' : '保存预测排名'}</span>
        </button>
      </div>

      {/* Toast Alert */}
      {showToast && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-50 bg-apple-fg text-apple-bg border border-apple-border/20 px-6 py-3 rounded-full shadow-lg flex items-center space-x-2.5 animate-bounce">
          <CheckCircle2 size={18} className="text-apple-success" />
          <span className="text-sm font-semibold tracking-tight">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
