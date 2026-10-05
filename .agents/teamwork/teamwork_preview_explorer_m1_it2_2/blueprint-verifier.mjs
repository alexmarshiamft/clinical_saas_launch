import { JSDOM } from 'jsdom';
import React from 'react';
import ReactDOM from 'react-dom/client';

// Proposed getValidStoredDemoSession implementation
const DEMO_CLINICIAN_USER = {
  id: 'a0000000-0000-4000-8000-000000000001',
  email: 'sarah.chen.md@behavioralhealth.org',
};

const STORAGE_KEY_DEMO_SESSION = 'clinical_saas_session';

function getValidStoredDemoSession(storage) {
  if (!storage) return null;
  const stored = storage.getItem(STORAGE_KEY_DEMO_SESSION);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') {
      storage.removeItem(STORAGE_KEY_DEMO_SESSION);
      return null;
    }

    const { user, session } = parsed;

    if (!user || typeof user !== 'object' || user.id !== DEMO_CLINICIAN_USER.id) {
      storage.removeItem(STORAGE_KEY_DEMO_SESSION);
      return null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = session?.expires_at;

    if (
      !session ||
      typeof session !== 'object' ||
      typeof session.access_token !== 'string' ||
      !session.access_token.trim() ||
      typeof expiresAt !== 'number' ||
      isNaN(expiresAt) ||
      expiresAt <= nowSeconds
    ) {
      storage.removeItem(STORAGE_KEY_DEMO_SESSION);
      return null;
    }

    return { user, session };
  } catch {
    storage.removeItem(STORAGE_KEY_DEMO_SESSION);
    return null;
  }
}

// Proposed sanitizeRedirectTarget implementation
function sanitizeRedirectTarget(raw) {
  if (!raw || typeof raw !== 'string') return '/dashboard';
  const trimmed = raw.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
    return trimmed;
  }
  return '/dashboard';
}

console.log('=== BLUEPRINT VERIFIER: AUTH & REDIRECT SECURITY ===');

// Test 1: Forged string user
{
  const store = { [STORAGE_KEY_DEMO_SESSION]: JSON.stringify({ user: 'attacker', session: 'dummy' }) };
  const mockStorage = { getItem: (k) => store[k] ?? null, removeItem: (k) => delete store[k] };
  const res = getValidStoredDemoSession(mockStorage);
  console.log('1. Forged string user rejected:', res === null && store[STORAGE_KEY_DEMO_SESSION] === undefined);
}

// Test 2: Forged arbitrary object
{
  const store = { [STORAGE_KEY_DEMO_SESSION]: JSON.stringify({ user: { id: 'unauthorized-intruder' }, session: { access_token: 'fake' } }) };
  const mockStorage = { getItem: (k) => store[k] ?? null, removeItem: (k) => delete store[k] };
  const res = getValidStoredDemoSession(mockStorage);
  console.log('2. Forged arbitrary object rejected:', res === null && store[STORAGE_KEY_DEMO_SESSION] === undefined);
}

// Test 3: Expired session (expires_at: 100)
{
  const store = { [STORAGE_KEY_DEMO_SESSION]: JSON.stringify({ user: DEMO_CLINICIAN_USER, session: { access_token: 'valid', expires_at: 100 } }) };
  const mockStorage = { getItem: (k) => store[k] ?? null, removeItem: (k) => delete store[k] };
  const res = getValidStoredDemoSession(mockStorage);
  console.log('3. Expired token rejected:', res === null && store[STORAGE_KEY_DEMO_SESSION] === undefined);
}

// Test 4: Missing/invalid expires_at
{
  const store = { [STORAGE_KEY_DEMO_SESSION]: JSON.stringify({ user: DEMO_CLINICIAN_USER, session: { access_token: 'valid' } }) };
  const mockStorage = { getItem: (k) => store[k] ?? null, removeItem: (k) => delete store[k] };
  const res = getValidStoredDemoSession(mockStorage);
  console.log('4. Missing expires_at rejected:', res === null && store[STORAGE_KEY_DEMO_SESSION] === undefined);
}

// Test 5: Valid unexpired session
{
  const store = { [STORAGE_KEY_DEMO_SESSION]: JSON.stringify({ user: DEMO_CLINICIAN_USER, session: { access_token: 'valid', expires_at: Math.floor(Date.now() / 1000) + 3600 } }) };
  const mockStorage = { getItem: (k) => store[k] ?? null, removeItem: (k) => delete store[k] };
  const res = getValidStoredDemoSession(mockStorage);
  console.log('5. Valid unexpired session accepted:', res !== null && store[STORAGE_KEY_DEMO_SESSION] !== undefined);
}

// Test 6: External redirect URL sanitization
console.log('6. Open redirect https://evil-phishing.com ->', sanitizeRedirectTarget('https://evil-phishing.com') === '/dashboard');
console.log('7. Protocol-relative //evil.com ->', sanitizeRedirectTarget('//evil.com') === '/dashboard');
console.log('8. Javascript URI javascript:alert(1) ->', sanitizeRedirectTarget('javascript:alert(1)') === '/dashboard');
console.log('9. Backslash bypass /\\evil.com ->', sanitizeRedirectTarget('/\\evil.com') === '/dashboard');
console.log('10. Valid relative route /dashboard/scribe?patient=101 ->', sanitizeRedirectTarget('/dashboard/scribe?patient=101') === '/dashboard/scribe?patient=101');
