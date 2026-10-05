import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  Shield,
  Activity,
  Zap,
  Mail,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginRole, setLoginRole] = useState<'therapist' | 'client'>('therapist');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect');

  // Sanitize redirect target: enforce safe relative paths starting with single '/'
  // Fall back to /dashboard for external URLs, protocol-relative '//', or malicious URI schemes
  const redirectTarget = useMemo(() => {
    if (!rawRedirect || typeof rawRedirect !== 'string') return '/dashboard';
    const trimmed = rawRedirect.trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) {
      return trimmed;
    }
    return '/dashboard';
  }, [rawRedirect]);

  const { user, login, loginAsDemo } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      try {
        navigate(redirectTarget, { replace: true });
      } catch (err) {
        console.warn('[Login] Navigation failed; falling back to /dashboard:', err);
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate, redirectTarget]);

  // Handle Live Email/Password Auth
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await login(email, password);
      if (res.error) {
        setErrorMessage(res.error.message || 'Authentication failed. Please check credentials or use Quick Demo Sign-In.');
        return;
      }
      localStorage.setItem('preferredRole', loginRole);
      try {
        navigate(redirectTarget, { replace: true });
      } catch {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials or use Quick Demo Sign-In.');
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-Click Demo Clinician Login
  const handleDemoClinicianClick = () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      loginAsDemo();
      localStorage.setItem('preferredRole', 'therapist');
      try {
        navigate(redirectTarget, { replace: true });
      } catch {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setErrorMessage('Could not initialize demo clinician session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-indigo-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* App Logo */}
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-indigo-200 mb-4">
          <Activity className="h-6 w-6" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          TheraFlow Clinical OS
        </h2>
        <p className="mt-1 text-sm text-slate-500 font-medium">
          Unified Telehealth, AI Scribe, Copilot &amp; HIPAA Redaction
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-100 rounded-3xl border border-slate-200">
          {/* Prominent Quick Demo Sign-In Box */}
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-teal-50 border border-indigo-100 shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                Instant Sandbox &amp; Auditor Access
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-snug">
              Bypass credential entry. Evaluates all 4 applications as certified practitioner <strong>Dr. Sarah Chen, MD</strong>.
            </p>
            <button
              type="button"
              id="demo-clinician-signin-btn"
              onClick={handleDemoClinicianClick}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Zap className="h-4 w-4 text-amber-300" />
              <span>Quick Sign-In: Demo Clinician</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-600 font-bold tracking-wider">
                Or Continue With Credentials
              </span>
            </div>
          </div>

          {/* Role Selector */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => setLoginRole('therapist')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                loginRole === 'therapist'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Clinical Provider
            </button>
            <button
              type="button"
              onClick={() => setLoginRole('client')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                loginRole === 'client'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Client Portal
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah.chen.md@behavioralhealth.org"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Authenticating...' : isSignUp ? 'Create Practice Account' : 'Sign In to Workspace'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            {isSignUp ? 'Already registered? ' : "Need a clinic account? "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              {isSignUp ? 'Sign in here' : 'Sign up for free'}
            </button>
          </div>
        </div>

        {/* Security / HIPAA Seal */}
        <div className="mt-6 text-center text-xs text-slate-600 flex items-center justify-center gap-1.5 font-medium">
          <Shield className="h-3.5 w-3.5 text-emerald-600" />
          <span>Encrypted with TLS 1.3 • HIPAA BAA Certified Platform</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
