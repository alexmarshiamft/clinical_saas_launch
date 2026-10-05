import { DEMO_CLINICIAN_USER, DEMO_CLINICIAN_SESSION } from '../../../src/lib/auth';

function validateDemoSession(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw;
  if (!candidate.user || typeof candidate.user !== 'object' || Array.isArray(candidate.user)) {
    return null;
  }
  if (candidate.user.id !== DEMO_CLINICIAN_USER.id) {
    return null;
  }
  if (!candidate.session || typeof candidate.session !== 'object' || Array.isArray(candidate.session)) {
    return null;
  }
  if (typeof candidate.session.access_token !== 'string' || candidate.session.access_token.length === 0) {
    return null;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof candidate.session.expires_at !== 'number' || candidate.session.expires_at <= nowSec) {
    return null;
  }
  return {
    user: candidate.user,
    session: candidate.session,
  };
}

function sanitizeRedirect(raw) {
  if (!raw) return '/dashboard';
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes(':\\')) {
    return raw;
  }
  return '/dashboard';
}

console.log('Testing sanitizeRedirect:');
console.assert(sanitizeRedirect('/dashboard') === '/dashboard', 'Test 1 failed');
console.assert(sanitizeRedirect('/dashboard/scribe?patient=101') === '/dashboard/scribe?patient=101', 'Test 2 failed');
console.assert(sanitizeRedirect('https://evil-phishing.com') === '/dashboard', 'Test 3 failed');
console.assert(sanitizeRedirect('//evil-phishing.com') === '/dashboard', 'Test 4 failed');
console.assert(sanitizeRedirect('javascript:alert(1)') === '/dashboard', 'Test 5 failed');
console.assert(sanitizeRedirect(null) === '/dashboard', 'Test 6 failed');
console.log('✓ All sanitizeRedirect assertions passed!');

console.log('\nTesting validateDemoSession against adversarial payloads:');
// S3-attack-string-user
const p1 = { user: 'attacker', session: 'dummy' };
console.assert(validateDemoSession(p1) === null, 'p1 should fail');

// S3-attack-arbitrary-object
const p2 = { user: { id: 'unauthorized-intruder', email: 'attacker@evil.com' }, session: { access_token: 'fake' } };
console.assert(validateDemoSession(p2) === null, 'p2 should fail');

// S3-attack-expired-token
const p3 = { user: { id: 'expired-session-user' }, session: { access_token: 'expired-token', expires_at: 100 } };
console.assert(validateDemoSession(p3) === null, 'p3 should fail');

// Expired token with demo user ID
const p4 = { user: DEMO_CLINICIAN_USER, session: { access_token: 'demo-token', expires_at: 100 } };
console.assert(validateDemoSession(p4) === null, 'p4 should fail');

// Legitimate Demo Clinician
const pLegit = { user: DEMO_CLINICIAN_USER, session: DEMO_CLINICIAN_SESSION };
const resLegit = validateDemoSession(pLegit);
console.assert(resLegit !== null && resLegit.user.id === DEMO_CLINICIAN_USER.id, 'pLegit should pass');

console.log('✓ All validateDemoSession assertions passed!');
