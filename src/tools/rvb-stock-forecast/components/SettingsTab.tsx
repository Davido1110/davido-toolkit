import { useState } from 'react';
import { getStoredConfig, saveConfig, clearConfig } from '../lib/supabase';

export default function SettingsTab({ onSaved }: { onSaved: () => void }) {
  const stored = getStoredConfig();
  const [url, setUrl]         = useState(stored?.url ?? '');
  const [anonKey, setAnonKey] = useState(stored?.anonKey ?? '');
  const [saved, setSaved]     = useState(false);
  const [testResult, setTestResult] = useState('');

  function handleSave() {
    if (!url.trim() || !anonKey.trim()) return;
    saveConfig(url.trim(), anonKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved();
  }

  async function handleTest() {
    setTestResult('Đang kiểm tra...');
    try {
      const res = await fetch(`${url.trim()}/rest/v1/branches?select=branch_name&limit=1`, {
        headers: {
          'apikey': anonKey.trim(),
          'Authorization': `Bearer ${anonKey.trim()}`,
        },
      });
      const text = await res.text();
      if (res.ok) setTestResult(`OK — ${text}`);
      else setTestResult(`Lỗi ${res.status}: ${text}`);
    } catch (e) {
      setTestResult(`Network error: ${e}`);
    }
  }

  function handleClear() {
    clearConfig();
    setUrl('');
    setAnonKey('');
    onSaved();
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Kết nối Supabase (RVB)</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Nhập thông tin Supabase project của RVB. Thông tin này chỉ lưu trên trình duyệt này (localStorage).
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Supabase URL
          </label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://xxxxxxxxxxxx.supabase.co"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Anon / Public Key
          </label>
          <input
            type="text"
            value={anonKey}
            onChange={e => setAnonKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
          />
          <p className="mt-1 text-xs text-gray-400">Chỉ dùng anon key — không bao giờ nhập service role key vào đây.</p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saved ? 'Đã lưu!' : 'Lưu kết nối'}
        </button>
        <button
          onClick={handleTest}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
        >
          Test kết nối
        </button>
        {stored && (
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg transition-colors"
          >
            Xóa kết nối
          </button>
        )}
      </div>

      {testResult && (
        <p className={`text-xs font-mono p-3 rounded-lg ${testResult.startsWith('OK') ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
          {testResult}
        </p>
      )}

      <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Hướng dẫn deploy Edge Function</h3>
        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
          <li>Cài Supabase CLI: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">npm i -g supabase</code></li>
          <li>Login: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">supabase login</code></li>
          <li>Link project: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">supabase link --project-ref YOUR_REF</code></li>
          <li>Set secrets: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">supabase secrets set KIOTVIET_CLIENT_ID=... KIOTVIET_CLIENT_SECRET=... KIOTVIET_RETAILER=ranverbae</code></li>
          <li>Chạy SQL migration trong Supabase SQL Editor</li>
          <li>Deploy function: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">supabase functions deploy rvb-sync</code></li>
        </ol>
      </div>
    </div>
  );
}
