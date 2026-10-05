import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requireRole?: 'therapist' | 'client' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireRole }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // 1. Loading Phase: Render clinical loading indicator while session hydrates
  if (loading) {
    return (
      <div 
        data-testid="auth-loading-spinner"
        className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6"
      >
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
            <div className="absolute w-6 h-6 rounded-full bg-indigo-50 dark:bg-slate-900" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Verifying Clinical Credentials
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Establishing encrypted HIPAA session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Strictly block and redirect to login preserving destination
  if (!user) {
    const targetPath = `${location.pathname}${location.search}${location.hash}`;
    const redirectUrl = `/login?redirect=${encodeURIComponent(targetPath)}`;
    return <Navigate to={redirectUrl} replace state={{ from: location }} />;
  }

  // 3. Optional Role-Based Access Control
  if (requireRole) {
    const userRole = profile?.role || (user.user_metadata?.role as string);
    if (userRole && userRole !== requireRole) {
      if (userRole === 'client') {
        return <Navigate to="/portal" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  // 4. Authenticated: Render children or nested route outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
