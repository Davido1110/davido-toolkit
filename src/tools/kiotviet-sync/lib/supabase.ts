import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'kiotviet_supabase_config';

const DEFAULT_URL     = 'https://fvmbfhkdycoazhhbclcs.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2bWJmaGtkeWNvYXpoaGJjbGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MDkxMjEsImV4cCI6MjA4OTk4NTEyMX0.yT8qa9uyZLBBN9NGT728Ljfkz8p1wz_6f-FPqaykKio';

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
