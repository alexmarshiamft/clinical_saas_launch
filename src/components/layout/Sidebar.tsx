import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Stethoscope,
  Mic,
  Sparkles,
  ShieldCheck,
  Calendar,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Activity,
  Crown,
  Lock,
  Video,
  Briefcase,
  Wallet,
  Building2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSubscription, getTierBadgeInfo } from '@/lib/subscription';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { profile, signOut, logout } = useAuth();
  const { tier, isSubscribed, status, planName } = useSubscription();
  const tierBadge = getTierBadgeInfo(status, tier);
  const navigate = useNavigate();
  const location = useLocation();

  const isToolLocked = (toolPath: string): boolean => {
    if (!isSubscribed) return true; // Unsubscribed: all clinical tools locked
    if (status === 'trialing') return false; // Trial has full access
    if (tier === 'starter') {
      // Starter tier unlocks EHR and PHI Scrubber; locks AI Scribe and Aura Assistant (Pro required)
      return toolPath === '/dashboard/scribe' || toolPath === '/dashboard/aura';
    }
    return false;
  };

  const handleSignOut = async () => {
    if (signOut) await signOut();
    else if (logout) await logout();
    navigate('/login');
  };

  // Practice Operations & Financial OS
  const practiceOsItems = [
    {
      name: 'Workforce Roster',
      path: '/dashboard/workforce',
      icon: Users,
      badge: '14 Clinicians',
      badgeClass: 'bg-cyan-500/10 text-cyan-700 border-cyan-300 dark:text-cyan-300',
      description: 'W-2 & 1099 Clinicians'
    },
    {
      name: 'Compensation Engine',
      path: '/dashboard/compensation',
      icon: Briefcase,
      badge: 'Rules Engine',
      badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-300',
      description: 'Tiered, CPT & % Splits'
    },
    {
      name: 'TheraFlow Payroll',
      path: '/dashboard/payroll',
      icon: Wallet,
      badge: 'Gusto/ADP',
      badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300',
      description: 'Orchestration & Review'
    },
    {
      name: 'TheraFlow Money',
      path: '/dashboard/banking',
      icon: Building2,
      badge: 'BaaS & Recon',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300',
      description: 'Operating Cash & Deposits'
    }
  ];

  // The 4 Core Merged Clinical Tools
  const coreTools = [
    {
      name: 'Clinical EHR & Telehealth',
      path: '/dashboard/ehr',
      icon: Stethoscope,
      badge: 'EHR',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:border-emerald-700 dark:text-emerald-300',
      description: 'Charts, Video & Superbills',
    },
    {
      name: 'Clinical AI Scribe v2',
      path: '/dashboard/scribe',
      icon: Mic,
      badge: 'AI Live',
      badgeClass: 'bg-purple-500/15 text-purple-700 border-purple-300 dark:border-purple-700 dark:text-purple-300',
      pulse: true,
      description: 'Dual-Speaker Diarization',
    },
    {
      name: 'Aura Assistant',
      path: '/dashboard/aura',
      icon: Sparkles,
      badge: 'Copilot',
      badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-300 dark:border-amber-700 dark:text-amber-300',
      description: 'DSM-5 & Typewriter SOAP',
    },
    {
      name: 'HIPAA PHI Scrubber',
      path: '/dashboard/phi-scrubber',
      icon: ShieldCheck,
      badge: '18 Safe Harbor',
      badgeClass: 'bg-cyan-500/15 text-cyan-700 border-cyan-300 dark:border-cyan-700 dark:text-cyan-300',
      description: 'Zero-Leak De-identification',
    },
  ];

  // Practice Operations
  const practiceOps = [
    { name: 'Calendar & Sessions', path: '/dashboard/calendar', icon: Calendar },
    { name: 'Client Roster', path: '/dashboard/clients', icon: Users },
    { name: 'Billing & Claims', path: '/dashboard/billing', icon: CreditCard },
    { name: 'Telehealth Room', path: '/dashboard/telehealth', icon: Video },
    { name: 'HIPAA Audit Logs', path: '/dashboard/audit-logs', icon: ShieldCheck },
    { name: 'Settings & Security', path: '/dashboard/settings', icon: Settings },
  ];

  const clinicianName = profile?.name || 'Dr. Sarah Chen, MD';
  const clinicianSpecialty = profile?.specialty || 'Practice Owner & Medical Director';

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-cyan-200">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900 tracking-tight text-base">TheraFlow OS</span>
              <span
                data-testid="sidebar-tier-badge"
                className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full border ${tierBadge.className}`}
              >
                Practice OS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Session to Paycheck</p>
          </div>
        </NavLink>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {/* Practice Operations & Finances (Operating System Pillar) */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800">
              Practice OS &amp; Finances
            </span>
            <span className="text-[10px] font-semibold bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded-full">
              4 Pillars
            </span>
          </div>
          <div className="space-y-1">
            {practiceOsItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-cyan-50 text-cyan-950 font-bold border border-cyan-200/80 shadow-2xs'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="truncate leading-tight font-semibold text-slate-900">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate leading-tight font-normal">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${item.badgeClass}`}>
                    {item.badge}
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Core Clinical Tools (The 4 Merged Apps) */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Clinical &amp; AI Tools
            </span>
            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
              4 Apps
            </span>
          </div>
          <div className="space-y-1">
            {coreTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = location.pathname.startsWith(tool.path);
              return (
                <NavLink
                  key={tool.path}
                  to={tool.path}
                  onClick={onCloseMobile}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-50/80 text-indigo-900 shadow-xs shadow-indigo-50 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="truncate leading-tight font-semibold text-slate-800 group-hover:text-slate-900">
                        {tool.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate leading-tight font-normal">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {isToolLocked(tool.path) ? (
                      <span
                        data-testid={`tool-upgrade-badge-${tool.path.replace('/dashboard/', '')}`}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
                      >
                        <Crown className="h-3 w-3 text-amber-600" />
                        Upgrade
                      </span>
                    ) : (
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${tool.badgeClass}`}
                      >
                        {tool.pulse && (
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                        )}
                        {tool.badge}
                      </span>
                    )}
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Practice Administration */}
        <div>
          <div className="px-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Administration &amp; EHR
            </span>
          </div>
          <div className="space-y-1">
            {practiceOps.map((op) => {
              const Icon = op.icon;
              const isActive = location.pathname === op.path;
              const isLocked = !isSubscribed;
              return (
                <NavLink
                  key={op.path}
                  to={op.path}
                  onClick={onCloseMobile}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-600'}`} />
                    <span>{op.name}</span>
                  </div>
                  {isLocked && <Lock className="h-3.5 w-3.5 text-amber-500" />}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Quick Launch Wizards */}
        <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
            Practice Onboarding &amp; Migration
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <NavLink
              to="/onboarding"
              onClick={onCloseMobile}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-center text-[11px] font-semibold text-slate-200 transition-colors"
            >
              Start-a-Practice
            </NavLink>
            <NavLink
              to="/migration"
              onClick={onCloseMobile}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-center text-[11px] font-semibold text-cyan-300 transition-colors"
            >
              Consolidate Stack
            </NavLink>
          </div>
        </div>

        {/* Active Subscription Box */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 to-teal-50 border border-indigo-100/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                {planName}
              </span>
            </div>
            <span
              className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${tierBadge.className}`}
            >
              {tierBadge.label}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mb-2 leading-snug">
            {isSubscribed
              ? 'Complete Practice OS active with unlimited compensation runs and BaaS banking.'
              : 'Subscription inactive. Clinical tools are locked.'}
          </p>
          <NavLink
            to="/dashboard/subscription"
            onClick={onCloseMobile}
            className="block w-full text-center py-1.5 text-xs font-semibold rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-2xs transition-colors"
          >
            {isSubscribed ? 'Manage Subscription' : 'Activate Plan'}
          </NavLink>
        </div>
      </div>

      {/* Footer / Clinician Profile */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="h-8 w-8 rounded-full bg-cyan-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              SC
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">{clinicianName}</div>
              <div className="text-[10px] text-slate-500 truncate">{clinicianSpecialty}</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="h-8 w-8 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col shrink-0 h-screen sticky top-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] flex-1 flex flex-col z-10 shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
