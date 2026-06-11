'use client';

import React, { useState } from 'react';
import { Player, DepositCurrency } from '../types';
import { apiFetch } from '../lib/apiClient';
import { Plus, Trash2, Users, Pencil, Check, X, Search } from 'lucide-react';

function formatDeposit(amount: number, currency?: DepositCurrency) {
  if (currency === 'USDT') return `${amount} USDT`;
  return `¥${amount}`;
}

function CurrencyToggle({ value, onChange }: { value: DepositCurrency; onChange: (c: DepositCurrency) => void }) {
  return (
    <div className="flex rounded-apple-md overflow-hidden border border-apple-border/20 flex-shrink-0">
      {(['CNY', 'USDT'] as DepositCurrency[]).map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={`px-2.5 py-1.5 text-[11px] font-bold transition-all ${
            value === c
              ? 'bg-apple-accent text-white'
              : 'bg-apple-secondary-bg text-apple-secondary-fg hover:text-apple-fg'
          }`}
        >
          {c === 'CNY' ? '¥' : 'USDT'}
        </button>
      ))}
    </div>
  );
}

const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

interface PlayerManagerProps {
  initialPlayers: Player[];
}

export default function PlayerManager({ initialPlayers }: PlayerManagerProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[1]);
  const [newDeposit, setNewDeposit] = useState('');
  const [newCurrency, setNewCurrency] = useState<DepositCurrency>('CNY');
  const [isAdding, setIsAdding] = useState(false);
  const [editDepositId, setEditDepositId] = useState<string | null>(null);
  const [editDepositValue, setEditDepositValue] = useState('');
  const [editDepositCurrency, setEditDepositCurrency] = useState<DepositCurrency>('CNY');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      const res = await apiFetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), color: newColor, initialDeposit: Number(newDeposit || 0), depositCurrency: newCurrency })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlayers(prev => [...prev, data.player]);
      setNewName('');
      setNewDeposit('');
      setNewColor(PRESET_COLORS[1]);
      setNewCurrency('CNY');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (player: Player) => {
    if (!confirm(`确定删除投注人「${player.name}」吗？其历史注单仍会保留。`)) return;
    try {
      const res = await apiFetch(`/api/players?playerId=${player.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setPlayers(prev => prev.filter(p => p.id !== player.id));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleUpdateDeposit = async (player: Player) => {
    const newVal = Number(editDepositValue);
    if (isNaN(newVal)) return;
    try {
      const res = await apiFetch('/api/players', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: player.id, initialDeposit: newVal, depositCurrency: editDepositCurrency })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '更新预存金额失败。');
      }
      setPlayers(prev => prev.map(p => p.id === player.id ? { ...p, initialDeposit: newVal, depositCurrency: editDepositCurrency } : p));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setEditDepositId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-1">
        <Users size={16} className="text-apple-accent" />
        <h3 className="text-sm font-bold text-apple-fg">投注人管理</h3>
      </div>

      {/* Search — only shown when 4+ players */}
      {players.length >= 4 && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-apple-secondary-fg" />
          <input
            type="text"
            placeholder="搜索投注人..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md pl-8 pr-3 py-2 text-xs text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50"
          />
        </div>
      )}

      {/* Player list — max 5 visible, scroll if more */}
      <div className={`space-y-2 ${players.length > 5 ? 'max-h-[280px] overflow-y-auto pr-1' : ''}`}>
        {players.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(player => (
          <div key={player.id} className="flex items-center justify-between p-3 rounded-apple-lg bg-apple-secondary-bg/50 border border-apple-border/20">
            {/* Left: color dot + name */}
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: player.color }} />
              <span className="text-sm font-semibold text-apple-fg truncate">
                {player.name}
                {player.id === 'self' && (
                  <span className="ml-2 text-[10px] text-apple-accent bg-apple-accent/10 px-1.5 py-0.5 rounded-full">默认</span>
                )}
              </span>
            </div>

            {/* Right: deposit + actions */}
            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
              {editDepositId === player.id ? (
                <>
                  <CurrencyToggle value={editDepositCurrency} onChange={setEditDepositCurrency} />
                  <input
                    type="number"
                    value={editDepositValue}
                    onChange={e => setEditDepositValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleUpdateDeposit(player); if (e.key === 'Escape') setEditDepositId(null); }}
                    className="w-20 bg-apple-bg border border-apple-accent/40 rounded-apple-md px-2 py-1 text-sm text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50"
                    autoFocus
                  />
                  <button onClick={() => handleUpdateDeposit(player)} className="p-1.5 text-apple-accent hover:bg-apple-accent/10 rounded-full transition-colors">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditDepositId(null)} className="p-1.5 text-apple-secondary-fg hover:bg-apple-secondary-bg rounded-full transition-colors">
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold text-apple-fg">{formatDeposit(player.initialDeposit, player.depositCurrency)}</span>
                  <button
                    onClick={() => { setEditDepositId(player.id); setEditDepositValue(String(player.initialDeposit)); setEditDepositCurrency(player.depositCurrency ?? 'CNY'); }}
                    className="p-1.5 text-apple-secondary-fg hover:text-apple-accent hover:bg-apple-accent/10 rounded-full transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                  {player.id !== 'self' && (
                    <button onClick={() => handleDelete(player)} className="p-1.5 text-apple-secondary-fg hover:text-apple-danger hover:bg-apple-danger/10 rounded-full transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new player form */}
      <div className="border border-apple-border/20 rounded-apple-lg p-4 space-y-3 bg-apple-secondary-bg/20">
        <div className="text-xs font-bold text-apple-secondary-fg uppercase tracking-wide">添加投注人</div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="姓名（如：小王）"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1 bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md px-3 py-2 text-sm text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50"
          />
          <div className="flex gap-2">
            <CurrencyToggle value={newCurrency} onChange={setNewCurrency} />
            <input
              type="number"
              placeholder="预存金额"
              value={newDeposit}
              onChange={e => setNewDeposit(e.target.value)}
              className="flex-1 sm:w-28 bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md px-3 py-2 text-sm text-apple-fg focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-apple-secondary-fg">颜色：</span>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setNewColor(c)}
              className={`w-5 h-5 rounded-full transition-all ${newColor === c ? 'ring-2 ring-offset-1 ring-apple-accent' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <button
          onClick={handleAdd}
          disabled={isAdding || !newName.trim()}
          className="flex items-center space-x-2 text-xs font-bold py-2 px-4 bg-apple-accent hover:bg-apple-accent/90 text-white rounded-apple-md transition-all disabled:opacity-50"
        >
          <Plus size={14} />
          <span>{isAdding ? '添加中...' : '添加投注人'}</span>
        </button>
      </div>
    </div>
  );
}
