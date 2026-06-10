'use client';

import React, { useState } from 'react';
import { PublicUserSettings } from '../types';
import { apiFetch } from '../lib/apiClient';
import { Save, Trash2, Cpu, Eye, EyeOff, AlertTriangle, CheckCircle2, KeyRound } from 'lucide-react';

interface SettingsClientProps {
  initialSettings: PublicUserSettings;
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [provider, setProvider] = useState<'gemini' | 'deepseek'>(initialSettings.llmProvider);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyPreview, setApiKeyPreview] = useState(initialSettings.apiKeyPreview);
  const [hasApiKey, setHasApiKey] = useState(initialSettings.hasApiKey);
  const [llmModel, setLlmModel] = useState(initialSettings.llmModel || '');
  const [localApiSecret, setLocalApiSecret] = useState(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('LOCAL_API_SECRET') ?? '';
  });
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (localApiSecret.trim()) {
      sessionStorage.setItem('LOCAL_API_SECRET', localApiSecret.trim());
    } else {
      sessionStorage.removeItem('LOCAL_API_SECRET');
    }

    try {
      const response = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmProvider: provider,
          apiKey,
          llmModel
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '保存设置失败。');
      }

      if (data.settings) {
        setApiKeyPreview(data.settings.apiKeyPreview);
        setHasApiKey(data.settings.hasApiKey);
        setLlmModel(data.settings.llmModel || '');
        setApiKey('');
      }

      setToastMessage('设置保存成功！');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const confirm1 = confirm('警告：此操作将永久清空您的小组赛预测、淘汰赛对阵、下注账本，并将所有真实赛果比分重置。此操作无法撤销。\n\n您确定要继续吗？');
    if (!confirm1) return;

    const confirm2 = confirm('请再次确认。点击“确定”以彻底清除所有本地数据文件。');
    if (!confirm2) return;

    setIsResetting(true);

    try {
      const response = await apiFetch('/api/reset', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('数据清空失败。');
      }

      setToastMessage('数据库已成功重置！');
      setShowToast(true);

      setTimeout(() => {
        setIsResetting(false);
        setShowToast(false);
        window.location.reload();
      }, 1500);
    } catch (e) {
      alert('重置失败: ' + (e as Error).message);
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">

      <form onSubmit={handleSave} className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-6 backdrop-blur-md shadow-sm space-y-6">
        <div className="flex items-center space-x-2 pb-4 border-b border-apple-border/10">
          <Cpu className="text-apple-accent" size={18} />
          <h2 className="text-sm font-bold tracking-tight text-apple-fg">AI 引擎配置</h2>
        </div>

        {/* Provider selection */}
        <div>
          <label className="block text-[10px] text-apple-secondary-fg font-semibold mb-2 uppercase">AI 服务商</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setProvider('gemini')}
              className={`text-xs py-3 rounded-apple-md font-bold border transition-all ${
                provider === 'gemini'
                  ? 'bg-apple-accent border-apple-accent text-white shadow-sm'
                  : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
              }`}
            >
              Google Gemini
            </button>
            <button
              type="button"
              onClick={() => setProvider('deepseek')}
              className={`text-xs py-3 rounded-apple-md font-bold border transition-all ${
                provider === 'deepseek'
                  ? 'bg-apple-accent border-apple-accent text-white shadow-sm'
                  : 'bg-apple-secondary-bg border-apple-border/20 text-apple-secondary-fg hover:text-apple-fg'
              }`}
            >
              DeepSeek AI
            </button>
          </div>
        </div>

        {/* Model name — free input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] text-apple-secondary-fg font-semibold uppercase">模型名称</label>
            <a
              href={provider === 'gemini' ? 'https://ai.google.dev/gemini-api/docs/models' : 'https://api-docs.deepseek.com/quick_start/pricing'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-apple-accent font-semibold hover:underline"
            >
              查看可用模型 ↗
            </a>
          </div>
          <input
            type="text"
            placeholder={provider === 'gemini' ? 'gemini-2.5-flash（默认）' : 'deepseek-chat（默认）'}
            value={llmModel}
            onChange={e => setLlmModel(e.target.value)}
            className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md px-4 py-2.5 text-xs text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50 font-mono"
          />
          <p className="text-[10px] text-apple-secondary-fg leading-relaxed">
            留空则使用默认模型。Gemini 示例：<span className="font-mono text-apple-fg">gemini-2.0-flash</span>、<span className="font-mono text-apple-fg">gemini-1.5-pro</span>；DeepSeek 示例：<span className="font-mono text-apple-fg">deepseek-reasoner</span>。
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] text-apple-secondary-fg font-semibold uppercase">API 密钥 (Access Key)</label>
            <a
              href={provider === 'gemini' ? 'https://aistudio.google.com/' : 'https://platform.deepseek.com/'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-apple-accent font-semibold hover:underline"
            >
              获取 {provider === 'gemini' ? 'Gemini' : 'DeepSeek'} 密钥 ↗
            </a>
          </div>

          {hasApiKey && !apiKey && (
            <p className="text-[10px] text-apple-secondary-fg">
              当前已保存密钥: <span className="font-mono text-apple-fg">{apiKeyPreview}</span>（留空则保持不变）
            </p>
          )}

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              placeholder={hasApiKey ? '输入新密钥以更新，留空保持不变' : `输入您的 ${provider === 'gemini' ? 'Gemini' : 'DeepSeek'} API Key`}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md pl-4 pr-12 py-2.5 text-xs text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50 font-semibold"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3.5 top-3 text-apple-secondary-fg hover:text-apple-fg transition-colors"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-apple-secondary-fg leading-relaxed">
            密钥保存在本地 data/settings.json，仅用于直连大模型 API，不会在 GET 接口中返回完整内容。
          </p>
        </div>

        <div className="space-y-2 pt-2 border-t border-apple-border/10">
          <div className="flex items-center space-x-2">
            <KeyRound size={14} className="text-apple-secondary-fg" />
            <label className="block text-[10px] text-apple-secondary-fg font-semibold uppercase">本地 API 令牌（可选）</label>
          </div>
          <input
            type="password"
            placeholder="若服务端设置了 LOCAL_API_SECRET，在此填入以授权写操作"
            value={localApiSecret}
            onChange={e => setLocalApiSecret(e.target.value)}
            className="w-full bg-apple-secondary-bg border border-apple-border/20 rounded-apple-md px-4 py-2.5 text-xs text-apple-fg focus:outline-none focus:ring-1 focus:ring-apple-accent/50 font-semibold"
          />
          <p className="text-[10px] text-apple-secondary-fg leading-relaxed">
            部署时设置环境变量 LOCAL_API_SECRET 后，所有写操作需携带此令牌（保存在浏览器 sessionStorage）。
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center justify-center space-x-2 bg-apple-accent hover:bg-apple-accent/90 text-white font-semibold text-xs py-2.5 px-6 rounded-apple-md transition-all disabled:opacity-50"
        >
          <Save size={14} />
          <span>{isSaving ? '正在保存...' : '保存设置'}</span>
        </button>
      </form>

      <div className="bg-apple-card-bg border border-apple-danger/20 rounded-apple-xl p-6 backdrop-blur-md shadow-sm space-y-6">
        <div className="flex items-center space-x-2 pb-4 border-b border-apple-danger/10">
          <AlertTriangle className="text-apple-danger" size={18} />
          <h2 className="text-sm font-bold tracking-tight text-apple-fg">危险区域</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-apple-fg">重置本地数据库</h3>
            <p className="text-[10px] text-apple-secondary-fg leading-normal max-w-sm">
              此操作将清除所有下注记录、淘汰赛预测树、小组赛预测数据，并将真实比分重置为未开赛状态。
            </p>
          </div>

          <button
            onClick={handleReset}
            disabled={isResetting}
            className="flex items-center justify-center space-x-2 bg-apple-danger hover:bg-apple-danger/90 text-white font-semibold text-xs py-2.5 px-6 rounded-apple-md transition-all disabled:opacity-50"
          >
            <Trash2 size={14} />
            <span>{isResetting ? '正在重置...' : '清除全部本地数据'}</span>
          </button>
        </div>
      </div>

      {showToast && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 z-50 bg-apple-fg text-apple-bg border border-apple-border/20 px-6 py-3 rounded-full shadow-lg flex items-center space-x-2.5 animate-bounce">
          <CheckCircle2 size={18} className="text-apple-success" />
          <span className="text-sm font-semibold tracking-tight">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
