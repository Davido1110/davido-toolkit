import { useState } from 'react';
import DashboardTab  from './components/DashboardTab';
import InventoryTab  from './components/InventoryTab';
import SyncLogsTab   from './components/SyncLogsTab';
import SettingsTab   from './components/SettingsTab';
import { getStoredConfig } from './lib/supabase';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'inventory', label: 'Tồn kho' },
  { id: 'logs',      label: 'Sync Logs' },
  { id: 'settings',  label: 'Settings' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function KiotVietSync() {
  const [tab, setTab]           = useState<TabId>('dashboard');
  const [connected, setConnected] = useState(true); // always connected via hardcoded defaults

  function handleSettingsSaved() {
    setConnected(!!getStoredConfig());
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔄</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">KiotViet Sync</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {connected
                ? 'Kết nối Supabase: OK'
                : 'Chưa kết nối — vào Settings để cấu hình'}
            </p>
          </div>
          {connected && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Connected
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6">
        <nav className="flex gap-1" aria-label="Tabs">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'inventory' && <InventoryTab />}
        {tab === 'logs'      && <SyncLogsTab />}
        {tab === 'settings'  && <SettingsTab onSaved={handleSettingsSaved} />}
      </div>
    </div>
  );
}
