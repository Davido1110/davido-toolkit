import { useState } from 'react';
import DashboardTab from './components/DashboardTab';
import AlertTab     from './components/AlertTab';
import SyncLogsTab  from './components/SyncLogsTab';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'alert',     label: '⚠️ Cảnh báo' },
  { id: 'logs',      label: 'Sync Logs' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function KiotVietSync() {
  const [tab, setTab] = useState<TabId>('dashboard');

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      {/* Combined header + tab bar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6">
        <div className="flex items-center gap-3 pt-4 pb-0">
          <span className="text-xl">🔄</span>
          <h1 className="text-base font-bold text-gray-900 dark:text-white">KiotViet Sync</h1>
          <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 ml-auto pb-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Connected
          </span>
        </div>

        <nav className="flex gap-1 mt-1" aria-label="Tabs">
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
        {tab === 'alert'     && <AlertTab />}
        {tab === 'logs'      && <SyncLogsTab />}
      </div>
    </div>
  );
}
