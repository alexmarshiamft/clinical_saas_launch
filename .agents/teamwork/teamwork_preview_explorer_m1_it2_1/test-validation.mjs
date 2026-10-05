import { JSDOM } from 'jsdom';

const DEMO_CLINICIAN_USER = {
  id: 'a0000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'sarah.chen.md@behavioralhealth.org',
};

const DEMO_CLINICIAN_SESSION = {
  access_token: 'demo-token-sarah-chen-jwt-valid',
  token_type: 'bearer',
  expires_in: 3600 * 24 * 30,
  expires_at: Math.floor(Date.now() / 1000) + (3600 * 24 * 30),
  refresh_token: 'demo-refresh-token-valid-permanent',
  user: DEMO_CLINICIAN_USER,
};

const STORAGE_KEY_DEMO_SESSION = 'clinical_saas_session';

function getValidatedStoredDemoSession(dom) {
  if (typeof dom.window === 'undefined') return null;

  const raw = dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    // 1. Envelope must be a non-null, non-array object
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Malformed session envelope: expected non-array object');
    }

    // 2. Validate user property: must be non-null object with expected demo user ID and email
    const user = parsed.user;
    if (!user || typeof user !== 'object' || Array.isArray(user)) {
      throw new Error('Malformed user: expected non-array object');
    }
    if (user.id !== DEMO_CLINICIAN_USER.id) {
      throw new Error(`Unauthorized or forged user ID: ${String(user.id)}`);
    }
    if (user.email !== DEMO_CLINICIAN_USER.email) {
      throw new Error(`Unauthorized user email: ${String(user.email)}`);
    }

    // 3. Validate session property: must be non-null object with valid access_token
    const session = parsed.session;
    if (!session || typeof session !== 'object' || Array.isArray(session)) {
      throw new Error('Malformed session: expected non-array object');
    }
    if (typeof session.access_token !== 'string' || session.access_token.trim().length === 0) {
      throw new Error('Malformed session: missing or empty access_token');
    }

    // 4. Validate session expiration: must be a valid future unix timestamp (seconds)
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

    return { user, session };
  } catch (err) {
    // Fail-closed: Immediately purge forged or corrupt session from localStorage
    try {
      dom.window.localStorage.removeItem(STORAGE_KEY_DEMO_SESSION);
    } catch {}
    return null;
  }
}

const testCases = [
  { id: 'S2-corrupt-json', payload: '{"user": {"id": "123"', expectValid: false },
  { id: 'S2-non-json', payload: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid', expectValid: false },
  { id: 'S2-primitive-number', payload: '12345', expectValid: false },
  { id: 'S2-primitive-bool', payload: 'true', expectValid: false },
  { id: 'S2-empty-obj', payload: '{}', expectValid: false },
  { id: 'S2-null-keys', payload: '{"user": null, "session": null}', expectValid: false },
  { id: 'S2-user-without-session', payload: '{"user": {"id": "some-id"}}', expectValid: false },
  { id: 'S2-session-without-user', payload: '{"session": {"access_token": "tok"}}', expectValid: false },
  { id: 'S3-attack-string-user', payload: JSON.stringify({ user: 'attacker', session: 'dummy' }), expectValid: false },
  { id: 'S3-attack-arbitrary-object', payload: JSON.stringify({ user: { id: 'unauthorized-intruder', email: 'attacker@evil.com' }, session: { access_token: 'fake' } }), expectValid: false },
  { id: 'S3-attack-expired-token', payload: JSON.stringify({ user: { id: 'expired-session-user' }, session: { access_token: 'expired-token', expires_at: 100 } }), expectValid: false },
  { id: 'S3-attack-matching-id-expired', payload: JSON.stringify({ user: DEMO_CLINICIAN_USER, session: { access_token: 'valid', expires_at: 100 } }), expectValid: false },
  { id: 'S5-legitimate-demo', payload: JSON.stringify({ user: DEMO_CLINICIAN_USER, session: DEMO_CLINICIAN_SESSION }), expectValid: true },
];

let allPassed = true;
for (const tc of testCases) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost:3000/',
  });
  dom.window.localStorage.setItem(STORAGE_KEY_DEMO_SESSION, tc.payload);
  const result = getValidatedStoredDemoSession(dom);
  const isValid = result !== null;
  const wiped = dom.window.localStorage.getItem(STORAGE_KEY_DEMO_SESSION) === null;

  if (isValid !== tc.expectValid) {
    console.error(`❌ [FAIL] ${tc.id}: expected valid=${tc.expectValid}, got ${isValid}`);
    allPassed = false;
  } else if (!tc.expectValid && !wiped) {
    console.error(`❌ [FAIL] ${tc.id}: failed session was NOT wiped from localStorage!`);
    allPassed = false;
  } else {
    console.log(`✓ [PASS] ${tc.id}: valid=${isValid}, wiped=${wiped}`);
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('\nAll isolated validation test cases PASSED!');
}
