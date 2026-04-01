import { useState } from 'react';
import DashboardTab    from './components/DashboardTab';
import AlertTab        from './components/AlertTab';
import SyncLogsTab     from './components/SyncLogsTab';
import SettingsTab     from './components/SettingsTab';
import ActivityLogTab  from './components/ActivityLogTab';
import { getStoredConfig } from './lib/supabase';

const USER_TABS = [
  { id: 'alert', label: '⚠️ Cảnh báo' },
] as const;

const ADMIN_TABS = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'alert',        label: '⚠️ Cảnh báo' },
  { id: 'logs',         label: 'Sync Logs' },
  { id: 'activity',     label: '📋 Activity Log' },
  { id: 'settings',     label: 'Settings' },
] as const;

const ADMIN_PIN = '0';

type TabId = typeof ADMIN_TABS[number]['id'];

export default function RVBStockForecast() {
  const [tab, setTab] = useState<TabId>('alert');
  const [connected, setConnected] = useState(() => !!getStoredConfig());
  const [isAdmin, setIsAdmin] = useState(false);

  function toggleAdmin() {
    if (isAdmin) { setIsAdmin(false); setTab('alert'); return; }
    const pin = window.prompt('Admin PIN:');
    if (pin === ADMIN_PIN) setIsAdmin(true);
  }

  function handleSettingsSaved() {
    setConnected(!!getStoredConfig());
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      {/* Combined header + tab bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6">
        <div className="flex items-center gap-3 pt-4 pb-0">
          <span className="text-xl">📦</span>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">Stock Forecast</h1>
          <span className={`flex items-center gap-1.5 text-xs ml-auto pb-1 ${connected ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
            <span className={`w-2 h-2 rounded-full inline-block ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
            {connected ? 'Connected' : 'Not connected'}
          </span>
          <button
            onClick={toggleAdmin}
            title={isAdmin ? 'Exit admin' : 'Admin'}
            className="ml-2 pb-1 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 text-xs"
          >
            {isAdmin ? '🔓' : '🔒'}
          </button>
        </div>

        <nav className="flex gap-1 mt-1" aria-label="Tabs">
          {(isAdmin ? ADMIN_TABS : USER_TABS).map(t => (
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
        {tab === 'alert'     && <AlertTab />}
        {tab === 'logs'      && <SyncLogsTab />}
        {tab === 'activity'  && <ActivityLogTab />}
        {tab === 'settings'  && <SettingsTab onSaved={handleSettingsSaved} />}
      </div>
    </div>
  );
}
