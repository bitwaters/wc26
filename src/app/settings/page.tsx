import { readSettings, maskApiKey, readPlayers } from '@/lib/storage';
import SettingsClient from '@/components/SettingsClient';
import PlayerManager from '@/components/PlayerManager';
import { PublicUserSettings } from '@/types';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const settings = readSettings();
  const publicSettings: PublicUserSettings = {
    llmProvider: settings.llmProvider,
    apiKey: '',
    apiKeyPreview: maskApiKey(settings.apiKey),
    hasApiKey: Boolean(settings.apiKey),
    llmModel: settings.llmModel || ''
  };
  const players = readPlayers();

  return (
    <div className="space-y-8 max-w-2xl">

      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-apple-fg">设置</h1>
        <p className="text-apple-secondary-fg text-sm mt-1">
          管理投注人、配置 AI 比分同步服务。
        </p>
      </div>

      {/* 1. 投注人管理 */}
      <div className="bg-apple-card-bg border border-apple-card-border rounded-apple-xl p-6 backdrop-blur-md shadow-sm">
        <PlayerManager initialPlayers={players} />
      </div>

      {/* 2. AI 引擎配置 + 3. 危险区域 */}
      <SettingsClient initialSettings={publicSettings} />

    </div>
  );
}
