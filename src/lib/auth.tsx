import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export interface ClinicianProfile {
  id: string;
  name: string;
  email: string;
  role: 'therapist' | 'client' | 'admin';
  specialty: string;
  practiceName: string;
  npi?: string;
  license?: string;
  avatarUrl?: string;
  subscriptionTier: 'starter' | 'pro' | 'group';
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ClinicianProfile | null;
  loading: boolean;
  isDemoClinician: boolean;
  login: (email: string, password: string) => Promise<{ user?: User | null; error?: Error | null }>;
  loginAsDemo: () => void;
  loginDemoClinician: () => void;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ user?: User | null; error?: Error | null }>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const STORAGE_KEY_DEMO_SESSION = 'clinical_saas_session';
export const STORAGE_KEY_PREFERRED_ROLE = 'preferredRole';

/**
 * Authoritative Demo Clinician User Fixture.
 * Fully conforms to Supabase User interface.
 */
export const DEMO_CLINICIAN_USER: User = {
  id: 'a0000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'sarah.chen.md@behavioralhealth.org',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone: '+1 (415) 555-0199',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {
    provider: 'demo',
    providers: ['demo'],
  },
  user_metadata: {
    full_name: 'Dr. Sarah Chen, MD',
    title: 'Dr. Sarah Chen, MD',
    role: 'therapist',
    specialty: 'Behavioral Health Specialist',
    practice_name: 'Bay Area Behavioral Health Group',
    npi: '1982736450',
    license: 'MD-CA-C182940',
    avatar_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    subscription_tier: 'pro',
  },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: new Date().toISOString(),
};

/**
 * Authoritative Demo Clinician Session Fixture.
 * Fully conforms to Supabase Session interface.
 */
export const DEMO_CLINICIAN_SESSION: Session = {
  access_token: 'demo-token-sarah-chen-jwt-valid',
  token_type: 'bearer',
  expires_in: 3600 * 24 * 30, // 30-day sandbox token
  expires_at: Math.floor(Date.now() / 1000) + (3600 * 24 * 30),
  refresh_token: 'demo-refresh-token-valid-permanent',
  user: DEMO_CLINICIAN_USER,
};

/**
 * Airtight session verification and anti-forgery parser for stored demo sessions.
 * Validates:
 * 1. Valid JSON object envelope.
 * 2. User object with strict schema and matching DEMO_CLINICIAN_USER.id & email.
 * 3. Session object with non-empty access_token and valid future expires_at.
 * 4. On any validation failure: immediately purges localStorage and returns null (fail-closed).
 */
export function getValidatedStoredDemoSession(): { user: User; session: Session } | null {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    // 1. Envelope validation: must be a non-null, non-array object
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Malformed session envelope: expected non-array object');
    }

    // 2. User structure validation: reject string users, arrays, missing IDs, or forged identities
    const user = parsed.user;
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      throw new Error('Malformed user: expected non-array object');
    }
    if (user.id !== DEMO_CLINICIAN_USER.id) {
      throw new Error(`Unauthorized user ID: ${String(user.id)}`);
    }
    if (user.email && user.email !== DEMO_CLINICIAN_USER.email) {
      throw new Error(`Unauthorized user email: ${String(user.email)}`);
    }

    // 3. Session structure validation: reject non-objects and empty tokens
    const session = parsed.session;
    if (!session || typeof session !== 'object' || Array.isArray(session)) {
      throw new Error('Malformed session: expected non-array object');
    }
    if (typeof session.access_token !== 'string' || session.access_token.trim().length === 0) {
      throw new Error('Malformed session: missing or empty access_token');
    }

    // 4. Expiration validation: must be a valid future unix timestamp in seconds
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      typeof session.expires_at !== 'number' ||
      !Number.isFinite(session.expires_at) ||
      session.expires_at <= nowSeconds
    ) {
      throw new Error(
        `Expired or invalid session token (expires_at: ${session.expires_at}, now: ${nowSeconds})`
      );
    }

    return { user: user as User, session: session as Session };
  } catch (err: any) {
    // Fail-closed security policy: immediately wipe corrupt/forged session from localStorage
    try {
      localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
    } catch {}
    return null;
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isDemoClinician: false,
  login: async () => ({ error: new Error('AuthContext not initialized') }),
  loginAsDemo: () => {},
  loginDemoClinician: () => {},
  signUp: async () => ({ error: new Error('AuthContext not initialized') }),
  logout: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initial validation of stored demo session
  const [initialSession] = useState<{ user: User; session: Session } | null>(() => {
    return getValidatedStoredDemoSession();
  });

  const [user, setUser] = useState<User | null>(() => initialSession?.user ?? null);
  const [session, setSession] = useState<Session | null>(() => initialSession?.session ?? null);
  const [isDemoClinician, setIsDemoClinician] = useState<boolean>(() => Boolean(initialSession));

  const [loading, setLoading] = useState<boolean>(() => {
    if (isSupabaseConfigured) {
      if (initialSession) return false;
      return true;
    }
    return false;
  });

  // Derive normalized clinician profile
  const profile = useMemo<ClinicianProfile | null>(() => {
    if (!user) return null;
    const meta = user.user_metadata || {};
    return {
      id: user.id,
      name: meta.full_name || meta.title || user.email?.split('@')[0] || 'Clinician',
      email: user.email || '',
      role: (meta.role as 'therapist' | 'client' | 'admin') || 'therapist',
      specialty: meta.specialty || 'Behavioral Health Specialist',
      practiceName: meta.practice_name || 'Bay Area Behavioral Health Group',
      npi: meta.npi || '1982736450',
      license: meta.license || 'MD-CA-C182940',
      avatarUrl: meta.avatar_url,
      subscriptionTier: (meta.subscription_tier as 'starter' | 'pro' | 'group') || 'pro',
    };
  }, [user]);

  // Initial Session Restoration & Listener Lifecycle
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        // 1. Check for persisted Demo Clinician session
        if (typeof window !== 'undefined') {
          const validatedDemo = getValidatedStoredDemoSession();
          if (validatedDemo) {
            if (isMounted) {
              setUser(validatedDemo.user);
              setSession(validatedDemo.session);
              setIsDemoClinician(true);
              setLoading(false);
            }
            return;
          }
        }

        // 2. Check Supabase Auth if configured
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.error('[Auth] Supabase getSession error:', error.message);
          }
          if (isMounted) {
            if (data?.session) {
              setSession(data.session);
              setUser(data.session.user);
              setIsDemoClinician(false);
            } else {
              setSession(null);
              setUser(null);
              setIsDemoClinician(false);
            }
            setLoading(false);
          }
        } else {
          // Neither demo nor live Supabase available; unauthenticated state
          if (isMounted) {
            setUser(null);
            setSession(null);
            setIsDemoClinician(false);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('[Auth] Session restoration error:', err);
        if (isMounted) {
          setUser(null);
          setSession(null);
          setIsDemoClinician(false);
          setLoading(false);
        }
      }
    };

    restoreSession();

    // 3. Supabase Auth State Change Listener (only if configured)
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
        const hasDemoStored = typeof window !== 'undefined' && Boolean(getValidatedStoredDemoSession());
        if (!hasDemoStored && isMounted) {
          setSession(supabaseSession);
          setUser(supabaseSession?.user ?? null);
          setIsDemoClinician(false);
          setLoading(false);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  /**
   * One-Click Instant Demo Clinician Login.
   * Deterministically logs in as Dr. Sarah Chen, MD with fresh 30-day session expiry.
   */
  const loginAsDemo = () => {
    const freshSession: Session = {
      ...DEMO_CLINICIAN_SESSION,
      expires_at: Math.floor(Date.now() / 1000) + (3600 * 24 * 30),
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        STORAGE_KEY_DEMO_SESSION,
        JSON.stringify({ user: DEMO_CLINICIAN_USER, session: freshSession })
      );
      localStorage.setItem(STORAGE_KEY_PREFERRED_ROLE, 'therapist');

      // Ensure demo clinician has active pro subscription persisted in storage
      const existingSub = localStorage.getItem('clinical_saas_subscription');
      if (!existingSub || existingSub.includes('"none"') || existingSub.includes('"canceled"')) {
        localStorage.setItem(
          'clinical_saas_subscription',
          JSON.stringify({
            tier: 'pro',
            status: 'active',
            billingCycle: 'monthly',
            renewsOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trialDaysRemaining: 14,
            lastSessionId: 'demo_session_pro_active',
          })
        );
      }
      try {
        window.dispatchEvent(new Event('subscription:sync'));
      } catch {}
    }
    setUser(DEMO_CLINICIAN_USER);
    setSession(freshSession);
    setIsDemoClinician(true);
    setLoading(false);
  };

  /**
   * Email/Password Login (Supabase Engine with Graceful Offline Fallback).
   */
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setLoading(false);
          return { error };
        }
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
          localStorage.setItem(STORAGE_KEY_PREFERRED_ROLE, data.user?.user_metadata?.role || 'therapist');
        }
        setUser(data.user);
        setSession(data.session);
        setIsDemoClinician(false);
        setLoading(false);
        return { user: data.user };
      } else {
        if (email.toLowerCase().includes('demo') || email.toLowerCase().includes('chen')) {
          loginAsDemo();
          return { user: DEMO_CLINICIAN_USER };
        }
        setLoading(false);
        return {
          error: new Error('Supabase is not configured. Please use "Quick Sign-In: Demo Clinician" to proceed.'),
        };
      }
    } catch (err: any) {
      setLoading(false);
      return { error: err };
    }
  };

  /**
   * Email/Password Sign-Up.
   */
  const signUp = async (email: string, password: string, metadata: Record<string, any> = {}) => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: metadata.full_name || 'Clinician',
              practice_name: metadata.practice_name || 'My Clinical Practice',
              role: metadata.role || 'therapist',
              ...metadata,
            },
          },
        });
        setLoading(false);
        if (error) return { error };
        return { user: data.user };
      } else {
        setLoading(false);
        return {
          error: new Error('Supabase is not configured. Sign-up requires active backend credentials.'),
        };
      }
    } catch (err: any) {
      setLoading(false);
      return { error: err };
    }
  };

  /**
   * Comprehensive Logout / Sign-Out.
   * Clears state across both Demo and Supabase engines.
   */
  const logout = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
        localStorage.removeItem(STORAGE_KEY_PREFERRED_ROLE);
        localStorage.removeItem('clinical_saas_subscription');

        // HIPAA §164.312(a)(2)(iii) Storage Hygiene: Purge all local clinical data and PHI
        localStorage.removeItem('theraflow_store_data');
        localStorage.removeItem('theraflow_active_patient_id');
        localStorage.removeItem('theraflow_processed_idempotency_keys');
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('theraflow_') || key.startsWith('clinical_saas_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      }
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } finally {
      setUser(null);
      setSession(null);
      setIsDemoClinician(false);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isDemoClinician,
        login,
        loginAsDemo,
        loginDemoClinician: loginAsDemo,
        signUp,
        logout,
        signOut: logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export async function logout(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
    localStorage.removeItem(STORAGE_KEY_PREFERRED_ROLE);
    localStorage.removeItem('clinical_saas_subscription');
    localStorage.removeItem('theraflow_store_data');
    localStorage.removeItem('theraflow_active_patient_id');
    localStorage.removeItem('theraflow_processed_idempotency_keys');
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('theraflow_') || key.startsWith('clinical_saas_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  }
}
