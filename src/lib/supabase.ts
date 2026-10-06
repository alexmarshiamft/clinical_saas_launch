import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable resolution supporting Vite (import.meta.env) and Node/test runners (process.env)
const getEnvVar = (key: string): string => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (metaEnv && metaEnv[key]) {
    return String(metaEnv[key]).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  return '';
};

// Headless / Node.js test environment WebSocket fallback
// Prevents @supabase/realtime-js constructor throwing when running in Node environments < 22 or JSDOM
if (typeof window === 'undefined' && typeof globalThis.WebSocket === 'undefined') {
  class HeadlessMockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    readyState = 3;
    onopen = null;
    onclose = null;
    onerror = null;
    onmessage = null;
    constructor() {}
    send() {}
    close() {}
  }
  (globalThis as any).WebSocket = HeadlessMockWebSocket;
  if (typeof global !== 'undefined') {
    (global as any).WebSocket = HeadlessMockWebSocket;
  }
}

const rawSupabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const rawSupabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

/**
 * Validates whether live Supabase credentials are configured.
 * Returns false if missing, empty, or using known dummy/placeholder domains.
 */
export const isSupabaseConfigured: boolean = Boolean(
  rawSupabaseUrl &&
  rawSupabaseAnonKey &&
  !rawSupabaseUrl.includes('placeholder.supabase.co') &&
  !rawSupabaseUrl.includes('example.com') &&
  rawSupabaseAnonKey !== 'placeholder' &&
  rawSupabaseAnonKey.length > 10
);

// Fallback dummy credentials to prevent createClient constructor exceptions
const safeUrl = isSupabaseConfigured ? rawSupabaseUrl : 'https://placeholder-sandbox.supabase.co';
const safeKey = isSupabaseConfigured ? rawSupabaseAnonKey : 'placeholder-anon-key-valid-format-token';

if (!isSupabaseConfigured) {
  console.info(
    '[Clinical SaaS Auth] Supabase credentials not detected or using placeholder. Running in Deterministic Sandbox / Demo Mode.'
  );
}

/**
 * Singleton Supabase Client.
 * Safe to import and execute across all environments.
 */
export const supabase: SupabaseClient = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
