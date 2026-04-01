import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'rvb_supabase_config';

const DEFAULT_URL      = 'https://dygvluteinksuynvrqdo.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z3ZsdXRlaW5rc3V5bnZycWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MzQ2NDAsImV4cCI6MjA5MDQxMDY0MH0.-SkwqrEPJju7OaWvbI1TobQ0UhaWbv3khPAozoNqFTY';

export function getStoredConfig(): { url: string; anonKey: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.url && parsed.anonKey) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, anonKey }));
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getEffectiveConfig(): { url: string; anonKey: string } {
  return getStoredConfig() ?? { url: DEFAULT_URL, anonKey: DEFAULT_ANON_KEY };
}

export function getSupabase() {
  const config = getStoredConfig();
  return createClient(
    config?.url     ?? DEFAULT_URL,
    config?.anonKey ?? DEFAULT_ANON_KEY,
  );
}

export async function logAction(
  action: string,
  userName: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const db = getSupabase();
  await db.from('user_action_logs').insert({
    action,
    user_name: userName,
    details,
  });
}
