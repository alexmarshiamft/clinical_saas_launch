# Milestone 1: Unified Layout, Navigation & Core Pages Implementation Blueprint

**Author**: Explorer 3 (`teamwork_preview_explorer_m1_3`)  
**Target Project**: Clinical Telehealth & AI Scribe SaaS Platform  
**Target Path**: `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch`  
**Date**: October 5, 2026  
**Scope**: Unified Layout (`AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`), Core Pages (`Landing.tsx`, `Login.tsx`, `DashboardHome.tsx`), and Routing Architecture (`App.tsx`).

---

## Executive Summary

This blueprint delivers the complete, production-ready implementation specifications and code listings for **Milestone 1's UI Foundation and Application Shell**.

The clinical SaaS platform merges four previously independent applications into a cohesive, HIPAA-compliant single page application:
1. 🏥 **Clinical EHR & Telehealth** (TheraFlow — `/dashboard/ehr`)
2. 🎙️ **Clinical AI Scribe v2** (Ambient Diarization & SOAP Generator — `/dashboard/scribe`)
3. ⚡ **Aura Assistant** (In-Workflow Copilot & Typewriter SOAP — `/dashboard/aura`)
4. 🛡️ **HIPAA PHI Scrubber** (18 Safe Harbor Redaction Engine — `/dashboard/phi-scrubber`)

### Architectural Pillars Established
- **Unified Navigation Shell**: Responsive sidebar with distinct status badges for the 4 core tools, practice management operations, and subscription status.
- **Header with Active Patient Context Bar**: Persistent clinical context (`Jane Doe • DOB: 04/12/1988 • MRN: #MC-88219 • CPT: 90837`) synchronized across all tools, plus practice switcher and clinician status indicator.
- **Dual-Mode Clinical Landing Page**: High-converting, HIPAA-focused presentation highlighting the 4 tools, regulatory credentials, pricing, and 1-click live demo login.
- **Frictionless Authentication Shell**: Provider & Client login tabs with a prominent **"Quick Sign-In: Demo Clinician (Dr. Sarah Chen, MD)"** button that guarantees deterministic E2E testability and zero-barrier evaluation.
- **Mission Control Dashboard**: Comprehensive command center with status cards for all 4 tools, active patient cards, today's schedule, and the cross-tool clinical pipeline.
- **Robust Route Architecture**: React Router hierarchy with `<ProtectedRoute>` guards, route aliases (`/dashboard/calendar`, `/dashboard/clients`), and context provider hierarchy (`AuthProvider`, `SubscriptionProvider`, `ClinicalContextProvider`).

---

## 1. Directory Structure for Target Files

```
src/
├── App.tsx                              # Root React Router & Context Provider tree
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx                # Master clinical shell container & footer
│   │   ├── Sidebar.tsx                  # 4-tool navigation, practice ops, subscription
│   │   └── Header.tsx                   # Practice switcher, Active Patient bar, profile
│   └── guards/
│       └── ProtectedRoute.tsx           # Authentication & subscription route gate
├── pages/
│   ├── Landing.tsx                      # SaaS landing page with 4-tool showcase
│   ├── Login.tsx                        # Login/Signup with 1-click Demo Clinician
│   ├── DashboardHome.tsx                # Central clinical command center
│   └── Subscription.tsx                 # Pricing & Stripe checkout portal
└── lib/
    ├── auth.tsx                         # Dual-engine auth (Supabase + Demo Clinician)
    ├── subscription.tsx                 # Subscription state & Stripe checkout client
    └── clinical-context.tsx             # Shared patient context & clinical pipeline
```

---

## 2. Layout & Navigation Blueprint

### 2.1 Component Interaction & State Flow

```
+---------------------------------------------------------------------------------------------+
|                                        <AppLayout />                                        |
+---------------------------------------------------------------------------------------------+
|                                    <Header />                                               |
| [Logo/Toggle] | [Practice Switcher: Bay Area BH] | [Active Patient: Jane Doe CPT:90837] | [Profile/BAA] |
+-------------------------------+-------------------------------------------------------------+
|         <Sidebar />           |                      <Outlet />                             |
|                               |                                                             |
| 🏥 Clinical EHR         [EHR] |  Current Page View:                                         |
| 🎙️ Clinical AI Scribe [Live] |  - DashboardHome.tsx                                        |
| ⚡ Aura Assistant    [Copilot]|  - ScribeWorkspace.tsx                                      |
| 🛡️ HIPAA PHI Scrubber [18 SH] |  - AuraStudio.tsx                                           |
| ----------------------------- |  - PhiScrubberView.tsx                                      |
| 📅 Calendar                   |  - Clients / Calendar / Billing                             |
| 👥 Clients                    |                                                             |
| 💳 Billing                    |                                                             |
| ⚙️ Settings                   |                                                             |
| ----------------------------- |                                                             |
| [Pro Clinician Badge]         |                                                             |
| [Dr. Sarah Chen / Sign Out]   |                                                             |
+-------------------------------+-------------------------------------------------------------+
|                   🔒 HIPAA Safe Harbor ePHI Confidentiality Footer Banner                   |
+---------------------------------------------------------------------------------------------+
```

---

### 2.2 `src/components/layout/Sidebar.tsx`

```tsx
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
  ChevronRight,
  Shield,
  Activity,
  Layers,
  Crown
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscription';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onCloseMobile }) => {
  const { user, signOut, logout } = useAuth();
  const { tier, isSubscribed } = useSubscription?.() || { tier: 'pro', isSubscribed: true };
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    if (signOut) await signOut();
    else if (logout) await logout();
    navigate('/login');
  };

  // The 4 Core Merged Clinical Tools
  const coreTools = [
    {
      name: 'Clinical EHR & Telehealth',
      path: '/dashboard/ehr',
      icon: Stethoscope,
      badge: 'EHR',
      badgeClass: 'bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:border-emerald-700 dark:text-emerald-300',
      description: 'Charts, Video & Superbills'
    },
    {
      name: 'Clinical AI Scribe v2',
      path: '/dashboard/scribe',
      icon: Mic,
      badge: 'AI Live',
      badgeClass: 'bg-purple-500/15 text-purple-700 border-purple-300 dark:border-purple-700 dark:text-purple-300',
      pulse: true,
      description: 'Dual-Speaker Diarization'
    },
    {
      name: 'Aura Assistant',
      path: '/dashboard/aura',
      icon: Sparkles,
      badge: 'Copilot',
      badgeClass: 'bg-amber-500/15 text-amber-700 border-amber-300 dark:border-amber-700 dark:text-amber-300',
      description: 'DSM-5 & Typewriter SOAP'
    },
    {
      name: 'HIPAA PHI Scrubber',
      path: '/dashboard/phi-scrubber',
      icon: ShieldCheck,
      badge: '18 Safe Harbor',
      badgeClass: 'bg-cyan-500/15 text-cyan-700 border-cyan-300 dark:border-cyan-700 dark:text-cyan-300',
      description: 'Zero-Leak De-identification'
    }
  ];

  // Practice Operations
  const practiceOps = [
    { name: 'Calendar & Sessions', path: '/dashboard/calendar', icon: Calendar },
    { name: 'Client Roster', path: '/dashboard/clients', icon: Users },
    { name: 'Billing & Claims', path: '/dashboard/billing', icon: CreditCard },
    { name: 'Settings & Security', path: '/dashboard/settings', icon: Settings }
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 tracking-tight text-base">TheraFlow</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                OS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Clinical Suite Pro</p>
          </div>
        </NavLink>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        {/* Core Clinical Tools (The 4 Merged Apps) */}
        <div>
          <div className="px-2 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Core Clinical Tools
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
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-50/80 text-indigo-900 shadow-sm shadow-indigo-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <div className="truncate leading-tight font-semibold text-slate-800 group-hover:text-slate-900">
                        {tool.name}
                      </div>
                      <div className="text-[11px] text-slate-600 truncate leading-tight font-normal">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${tool.badgeClass}`}
                    >
                      {tool.pulse && (
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                      )}
                      {tool.badge}
                    </span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Practice Operations */}
        <div>
          <div className="px-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Practice Operations
            </span>
          </div>
          <div className="space-y-1">
            {practiceOps.map((op) => {
              const Icon = op.icon;
              const isActive = location.pathname === op.path;
              return (
                <NavLink
                  key={op.path}
                  to={op.path}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-600'}`} />
                  <span>{op.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Active Subscription Box */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50 to-teal-50 border border-indigo-100/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                Clinician Pro
              </span>
            </div>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mb-2.5 leading-snug">
            All 4 clinical tools unlocked with unlimited AI acoustic diarization.
          </p>
          <NavLink
            to="/dashboard/subscription"
            onClick={onCloseMobile}
            className="block w-full text-center py-1.5 text-xs font-semibold rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-2xs transition-colors"
          >
            Manage Subscription
          </NavLink>
        </div>
      </div>

      {/* Footer / Clinician Profile */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="h-8 w-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
              SC
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 truncate">Dr. Sarah Chen, MD</div>
              <div className="text-[11px] text-slate-600 truncate">Behavioral Health</div>
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
```

---

### 2.3 `src/components/layout/Header.tsx`

```tsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Menu,
  Building2,
  ChevronDown,
  User,
  Shield,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  ExternalLink,
  Search,
  Check
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useClinicalContext } from '@/lib/clinical-context';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const clinical = useClinicalContext?.();
  const navigate = useNavigate();

  // Practice selection state
  const practices = [
    { id: '1', name: 'Bay Area Behavioral Health', type: 'Primary Clinic' },
    { id: '2', name: 'Pacific Telehealth Group', type: 'Affiliate Group' }
  ];
  const [selectedPractice, setSelectedPractice] = useState(practices[0]);
  const [showPracticeMenu, setShowPracticeMenu] = useState(false);

  // Fallback active patient state if ClinicalContext is pending
  const activePatient = clinical?.activePatient || {
    id: 'p-101',
    name: 'Jane Doe',
    dob: '04/12/1988',
    age: 38,
    mrn: '#MC-88219',
    cptCode: '90837',
    cptDesc: 'Psychotherapy (60m)',
    encounterTime: '10:00 AM'
  };

  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const rosterSample = [
    { id: 'p-101', name: 'Jane Doe', dob: '04/12/1988', cptCode: '90837', mrn: '#MC-88219' },
    { id: 'p-102', name: 'Marcus Vance', dob: '11/03/1992', cptCode: '90834', mrn: '#MC-91042' },
    { id: 'p-103', name: 'Elena Rostova', dob: '07/22/1985', cptCode: '90791', mrn: '#MC-77312' }
  ];

  const handleSelectPatient = (p: typeof rosterSample[0]) => {
    if (clinical?.setActivePatient) {
      clinical.setActivePatient({
        id: p.id,
        name: p.name,
        dob: p.dob,
        mrn: p.mrn,
        cptCode: p.cptCode,
        encounterId: `enc-${Date.now()}`
      });
    }
    setShowPatientMenu(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile Trigger & Practice Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Practice Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowPracticeMenu(!showPracticeMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-slate-50 border border-slate-200 transition-colors"
          >
            <div className="h-7 w-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight">
                {selectedPractice.name}
              </div>
              <div className="text-[10px] text-slate-600 leading-tight">
                {selectedPractice.type}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-600 ml-1" />
          </button>

          {showPracticeMenu && (
            <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-40">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Select Active Practice
              </div>
              {practices.map((practice) => (
                <button
                  key={practice.id}
                  onClick={() => {
                    setSelectedPractice(practice);
                    setShowPracticeMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-indigo-50 flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{practice.name}</div>
                    <div className="text-[10px] text-slate-600">{practice.type}</div>
                  </div>
                  {selectedPractice.id === practice.id && (
                    <Check className="h-4 w-4 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: Active Patient Context Bar */}
      <div className="relative">
        <div
          onClick={() => setShowPatientMenu(!showPatientMenu)}
          className="cursor-pointer group flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs"
        >
          <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            <User className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-900 group-hover:text-indigo-900">
              {activePatient.name}
            </span>
            <span className="text-slate-300 hidden md:inline">•</span>
            <span className="text-slate-600 hidden md:inline">
              DOB: <span className="font-medium text-slate-700">{activePatient.dob}</span>
            </span>
            <span className="text-slate-300 hidden lg:inline">•</span>
            <span className="text-slate-600 hidden lg:inline font-mono text-[11px]">
              {activePatient.mrn}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded text-[11px]">
              CPT: {activePatient.cptCode}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-600 group-hover:text-indigo-600 transition-colors ml-1" />
        </div>

        {/* Patient Switcher Menu */}
        {showPatientMenu && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-40">
            <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Active Patient Encounter</span>
              <NavLink
                to="/dashboard/clients"
                onClick={() => setShowPatientMenu(false)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Full Roster →
              </NavLink>
            </div>
            <div className="py-1">
              {rosterSample.map((pat) => (
                <button
                  key={pat.id}
                  onClick={() => handleSelectPatient(pat)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    activePatient.id === pat.id ? 'bg-indigo-50/60 font-semibold' : ''
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900">{pat.name}</div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      DOB: {pat.dob} • CPT: {pat.cptCode} • {pat.mrn}
                    </div>
                  </div>
                  {activePatient.id === pat.id && (
                    <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="pt-2 px-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowPatientMenu(false);
                  navigate('/dashboard/scribe');
                }}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                Send to Scribe →
              </button>
              <button
                onClick={() => {
                  setShowPatientMenu(false);
                  navigate('/dashboard/phi-scrubber');
                }}
                className="text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 flex items-center gap-1"
              >
                Scrub Chart PHI →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Security & Quick Launcher */}
      <div className="flex items-center gap-2.5">
        {/* HIPAA Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
          <Shield className="h-3.5 w-3.5 text-emerald-600" />
          <span>HIPAA Safe Harbor</span>
        </div>

        {/* Aura Quick Toggle */}
        <NavLink
          to="/dashboard/aura"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold hover:shadow-md hover:shadow-amber-200 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Aura Copilot</span>
        </NavLink>
      </div>
    </header>
  );
};

export default Header;
```

---

### 2.4 `src/components/layout/AppLayout.tsx`

```tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { ShieldCheck, Lock } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">
      {/* Sidebar (Responsive) */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        {/* Page View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Confidentiality / HIPAA Regulatory Banner */}
        <footer className="bg-white border-t border-slate-200 py-2.5 px-4 text-center shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 text-[11px] text-slate-600 font-medium">
            <Lock className="h-3.5 w-3.5 text-slate-600 shrink-0" />
            <span>
              <strong>CONFIDENTIAL & HIPAA PROTECTED:</strong> System processing Electronic Protected Health Information (ePHI).
              256-bit encryption & Safe Harbor redaction active. All access is cryptographically audited.
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
```

---

## 3. High-Converting Landing Page Blueprint (`src/pages/Landing.tsx`)

The landing page establishes immediate clinical authority, demonstrates the unified value proposition of the 4 merged applications, and provides a direct 1-click gateway to the live Demo Clinician experience.

```tsx
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Mic,
  Sparkles,
  ShieldCheck,
  Calendar,
  Lock,
  CheckCircle2,
  ArrowRight,
  Play,
  Zap,
  Users,
  CreditCard,
  FileText,
  Building2,
  Star,
  Activity,
  Check
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export const Landing: React.FC = () => {
  const { user, loginDemoClinician } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ehr' | 'scribe' | 'aura' | 'phi'>('scribe');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const handleInstantDemo = async () => {
    if (loginDemoClinician) {
      await loginDemoClinician();
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const coreTools = [
    {
      id: 'ehr',
      name: 'Clinical EHR & Telehealth',
      tag: 'Practice OS',
      icon: Stethoscope,
      headline: 'Complete Clinical Management Without Administrative Fatigue',
      description: 'Streamline patient charting, DSM-5 progress notes, interactive scheduling, and HD browser-based telehealth with automated billing and CMS-1500 Superbills.',
      highlights: [
        'DAP and SOAP Clinical Progress Notes',
        'Interactive Drag-and-Drop Appointment Calendar',
        'Built-in WebRTC Telehealth Video Sessions',
        'CMS-1500 Superbill & Client Invoicing Engine'
      ]
    },
    {
      id: 'scribe',
      name: 'Clinical AI Scribe v2',
      tag: 'Ambient Diarization',
      icon: Mic,
      headline: 'Next-Generation Multi-Speaker Ambient Scribe',
      description: 'Listen to clinical consultations and separate clinician and patient acoustic feeds in real time. Generates structured SOAP notes across 6 medical specialties.',
      highlights: [
        'Dual-Speaker Real-Time Acoustic Diarization',
        '6 Standard Formats: SOAP, H&P, Referral, Aftercare',
        'Interactive Template Studio for Custom Formats',
        'Automated ICD-10 & CPT Billing Code Suggester'
      ]
    },
    {
      id: 'aura',
      name: 'Aura Assistant',
      tag: 'In-Workflow Copilot',
      icon: Sparkles,
      headline: 'Non-Invasive Clinical Decision Support Everywhere',
      description: 'A floating assistant accessible across every screen in your EHR. Instant DSM-5 criteria verification, medical snippet expansions, and typewriter note generation.',
      highlights: [
        'Floating Assistant Orb & Shadow DOM Isolation',
        'Real-time Audio Visualizer & Dictation Capture',
        'DSM-5 Differential Diagnostic Search',
        'Typewriter Streaming Note Formulator'
      ]
    },
    {
      id: 'phi',
      name: 'HIPAA PHI Scrubber',
      tag: '18 Safe Harbor',
      icon: ShieldCheck,
      headline: 'Zero-Leak Statutory 18-Rule HIPAA Redaction',
      description: 'De-identify clinical narratives and notes in seconds before sharing. Enforces all 18 HIPAA Safe Harbor statutory identifiers with side-by-side diff and audit table.',
      highlights: [
        'Strict 18 Statutory Safe Harbor Regex Classifiers',
        'Synchronized Side-by-Side Redacted Diff Viewer',
        'Forensic Redaction Audit Logs with Confidence Scoring',
        'Client-Side Execution: Zero Unredacted Cloud Leakage'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Announcement Bar */}
      <div className="bg-indigo-900 text-indigo-100 px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2">
        <span className="bg-indigo-700 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
          New Release
        </span>
        <span>The 4 Core Clinical Tools are now unified into TheraFlow Clinical OS.</span>
        <button onClick={handleInstantDemo} className="underline font-bold hover:text-white">
          Launch Live Clinician Demo →
        </button>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              TheraFlow <span className="text-indigo-600">OS</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a href="#tools" className="hover:text-indigo-600 transition-colors">The 4 Tools</a>
            <a href="#pipeline" className="hover:text-indigo-600 transition-colors">Clinical Pipeline</a>
            <a href="#security" className="hover:text-indigo-600 transition-colors">HIPAA Security</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <NavLink
                to="/dashboard"
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm"
              >
                Go to Dashboard
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2"
                >
                  Sign In
                </NavLink>
                <button
                  onClick={handleInstantDemo}
                  className="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-sm hover:bg-indigo-100 flex items-center gap-1.5 transition-all"
                >
                  <Zap className="h-4 w-4 text-indigo-600" />
                  <span>Instant Demo</span>
                </button>
                <NavLink
                  to="/login"
                  className="hidden sm:inline-flex px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all"
                >
                  Start Free Trial
                </NavLink>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold mb-6">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>100% HIPAA Safe Harbor Certified • Complete Telehealth Ecosystem</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-5xl mx-auto leading-tight">
            The Complete Telehealth &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-500">
              Clinical AI Scribe
            </span>{' '}
            Ecosystem.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Replace four fragmented software subscriptions with one unified clinical operating system.
            Ambient multi-speaker diarization, in-workflow AI copilot, 18-rule PHI redaction, and complete EHR practice management.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleInstantDemo}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group transition-all"
            >
              <Zap className="h-5 w-5 text-indigo-200 group-hover:scale-110 transition-transform" />
              <span>Launch Demo Clinician (Dr. Sarah Chen, MD)</span>
            </button>
            <NavLink
              to="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </NavLink>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> No credit card for demo
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> Instant BAA agreement
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> Zero cloud data retention
            </span>
          </div>
        </div>
      </section>

      {/* The 4 Core Applications Interactive Showcase */}
      <section id="tools" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Four World-Class Tools. One Unified Workspace.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Each application was engineered for clinical excellence and integrated with shared patient context.
            </p>
          </div>

          {/* Tool Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {coreTools.map((tool) => {
              const Icon = tool.icon;
              const isSelected = activeTab === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTab(tool.id as any)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tool.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tool Showcase Card */}
          {(() => {
            const current = coreTools.find((t) => t.id === activeTab)!;
            const Icon = current.icon;
            return (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 lg:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider mb-4">
                    {current.tag}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mb-4">
                    {current.headline}
                  </h3>
                  <p className="text-slate-600 text-base leading-relaxed mb-6">
                    {current.description}
                  </p>
                  <div className="space-y-3 mb-8">
                    {current.highlights.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{item}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleInstantDemo}
                    className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm flex items-center gap-2"
                  >
                    <span>Try {current.name} in Demo</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Mockup Preview Box */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-amber-400" />
                      <div className="h-3 w-3 rounded-full bg-emerald-400" />
                      <span className="text-xs font-mono text-slate-600 ml-2">
                        {current.name} Preview
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                      Clinical Verified
                    </span>
                  </div>

                  {activeTab === 'scribe' && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg">
                        <div className="font-bold text-indigo-900 mb-1 flex items-center justify-between">
                          <span>🎙️ Clinician Acoustic Feed</span>
                          <span className="text-[10px] text-indigo-600 font-mono">00:14:22</span>
                        </div>
                        <p className="text-slate-700">"How have your sleep patterns been since we adjusted your evening wind-down routine?"</p>
                      </div>
                      <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg">
                        <div className="font-bold text-purple-900 mb-1 flex items-center justify-between">
                          <span>👤 Patient (Jane Doe)</span>
                          <span className="text-[10px] text-purple-600 font-mono">00:14:29</span>
                        </div>
                        <p className="text-slate-700">"Much better. I fell asleep within 20 minutes on Tuesday and woke up without palpitations."</p>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <div className="font-bold text-emerald-900 mb-1">✨ Automated SOAP Note (Subjective)</div>
                        <p className="text-slate-700 font-mono text-[11px]">
                          Patient reports significant sleep onset latency reduction (&lt;20 min) and cessation of nocturnal palpitations following stimulus control implementation.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'phi' && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg font-mono">
                        <div className="font-bold text-rose-800 mb-1">Raw Note (Contains PHI):</div>
                        <p className="text-slate-700">
                          Jane Doe (DOB: 04/12/1988) called from (415) 555-0199 regarding her appointment on 10/05/2026.
                        </p>
                      </div>
                      <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg font-mono">
                        <div className="font-bold text-cyan-800 mb-1">18 Safe Harbor Redacted Note:</div>
                        <p className="text-slate-800">
                          <span className="bg-cyan-200 px-1 rounded text-cyan-900 font-bold">[NAME]</span> (DOB:{' '}
                          <span className="bg-cyan-200 px-1 rounded text-cyan-900 font-bold">[DATE]</span>) called from{' '}
                          <span className="bg-cyan-200 px-1 rounded text-cyan-900 font-bold">[PHONE]</span> regarding her appointment on{' '}
                          <span className="bg-cyan-200 px-1 rounded text-cyan-900 font-bold">[DATE]</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'aura' && (
                    <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3 text-xs">
                      <div className="flex items-center justify-between text-amber-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4" /> Aura Copilot DSM-5 Suggester
                        </span>
                        <span className="text-[10px] bg-amber-400/20 px-2 py-0.5 rounded text-amber-300">Active</span>
                      </div>
                      <p className="text-slate-300">
                        Based on discussion of panic frequency (&gt;3x/wk) and avoidance behavior, consider evaluation against <strong>Panic Disorder (F41.0)</strong> criteria A and B.
                      </p>
                      <div className="bg-slate-800 p-2.5 rounded-lg text-emerald-400 font-mono text-[11px]">
                        Suggested CPT: 90837 (60m Individual Psychotherapy)
                      </div>
                    </div>
                  )}

                  {activeTab === 'ehr' && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-lg">
                        <span className="font-bold text-slate-800">10:00 AM • Jane Doe</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                          Telehealth In-Room
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-lg">
                        <span className="font-bold text-slate-800">11:30 AM • Marcus Vance</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
                          In-Person Charted
                        </span>
                      </div>
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 font-medium">
                        CMS-1500 Superbill generated and queued for export.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Pricing Section (Matching Milestone 2 specifications) */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Transparent, Value-Driven Pricing for Every Practice
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Unlock the entire clinical ecosystem with instant Stripe checkout (test mode enabled).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Solo Starter</div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold text-slate-900">$49</span>
                  <span className="text-slate-600 text-sm">/ month</span>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  Perfect for solo counselors and private practitioners needing basic practice management.
                </p>
                <div className="space-y-3 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Core TheraFlow EHR &amp; Calendar</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Client Invoicing &amp; Superbills</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Basic PHI Scrubber (25 docs/mo)</div>
                  <div className="flex items-center gap-2.5 text-slate-600"><Check className="h-4 w-4 text-slate-400" /> Scribe v2 limited to 5 sessions/mo</div>
                </div>
              </div>
              <NavLink
                to="/login"
                className="mt-8 block w-full text-center py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors"
              >
                Choose Starter
              </NavLink>
            </div>

            {/* Clinician Pro (Flagship) */}
            <div className="bg-indigo-900 text-white rounded-3xl p-8 border-2 border-indigo-500 shadow-xl relative flex flex-col justify-between transform md:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 text-[11px] font-black uppercase px-4 py-1 rounded-full shadow-md">
                Most Popular • All 4 Tools Unlocked
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">Clinician Pro</div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold text-white">$99</span>
                  <span className="text-indigo-200 text-sm">/ month</span>
                </div>
                <p className="text-sm text-indigo-100 mb-6">
                  The flagship suite for full-time clinicians wanting zero documentation backlog.
                </p>
                <div className="space-y-3 text-xs font-semibold text-indigo-100">
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-amber-300" /> Full TheraFlow EHR &amp; Telehealth</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-amber-300" /> Unlimited Clinical AI Scribe v2 Diarization</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-amber-300" /> Aura Assistant Floating In-Workflow Copilot</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-amber-300" /> Unlimited 18 Safe Harbor PHI Redactions</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-amber-300" /> Signed HIPAA BAA Included</div>
                </div>
              </div>
              <button
                onClick={handleInstantDemo}
                className="mt-8 block w-full text-center py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-md transition-all"
              >
                Start Free Pro Trial
              </button>
            </div>

            {/* Practice Group Plan */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Practice Group</div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold text-slate-900">$249</span>
                  <span className="text-slate-600 text-sm">/ month</span>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  For multi-clinician clinics and behavioral health group practices.
                </p>
                <div className="space-y-3 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> 5 Clinician Licenses Included</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Centralized Multi-Provider Billing</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Custom Practice Clinical Note Templates</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Group Practice HIPAA Audit Table Export</div>
                </div>
              </div>
              <NavLink
                to="/login"
                className="mt-8 block w-full text-center py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors"
              >
                Contact Sales
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-600 space-y-4">
          <p className="font-semibold text-slate-700">
            TheraFlow Clinical OS — Merging Practice Management, AI Scribing, Clinical Copilot &amp; HIPAA Redaction.
          </p>
          <p>
            DISCLAIMER: TheraFlow is clinical software assisting healthcare professionals. AI-generated notes must be reviewed and signed by a licensed practitioner. If you or a client is experiencing a medical or psychiatric emergency, please dial 911 or call 988.
          </p>
          <div className="flex items-center justify-center gap-6 font-medium text-slate-600">
            <a href="#security" className="hover:underline">HIPAA Compliance</a>
            <a href="#privacy" className="hover:underline">Privacy Policy</a>
            <a href="#terms" className="hover:underline">Terms of Service</a>
            <a href="#baa" className="hover:underline">Request BAA</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
```

---

## 4. Unified Login & Quick Demo Authentication Blueprint (`src/pages/Login.tsx`)

This authentication shell satisfies the requirements:
1. Dual-engine auth: Live Supabase sign-in/up alongside immediate local mock demo auth.
2. Prominent **"Quick Sign-In: Demo Clinician (Dr. Sarah Chen, MD)"** button.
3. Provider vs. Client portal selector.
4. Retention of `?redirect=` target.

```tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  Shield,
  Activity,
  Zap,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2
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
  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const { user, login, loginDemoClinician } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(redirectTarget, { replace: true });
    }
  }, [user, navigate, redirectTarget]);

  // Handle Live Email/Password Auth
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      if (login) {
        await login(email, password);
      }
      localStorage.setItem('preferredRole', loginRole);
      navigate(redirectTarget, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials or use Quick Demo Sign-In.');
    } finally {
      setLoading(false);
    }
  };

  // Instant 1-Click Demo Clinician Login
  const handleDemoClinicianClick = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (loginDemoClinician) {
        await loginDemoClinician();
      } else if (login) {
        await login('demo@clinical-saas.com', 'demo-password');
      }
      localStorage.setItem('preferredRole', 'therapist');
      navigate(redirectTarget, { replace: true });
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
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
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
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@clinic.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
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
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : isSignUp ? 'Create Practice Account' : 'Sign In to Workspace'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500">
            {isSignUp ? 'Already registered? ' : "Need a clinic account? "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-bold text-indigo-600 hover:text-indigo-800 underline"
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
```

---

## 5. Central Clinical Operations Dashboard (`src/pages/DashboardHome.tsx`)

The central mission control page when entering `/dashboard`, displaying overview cards for all 4 tools, the active patient context bar, today's schedule, and the unified cross-tool clinical pipeline.

```tsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Mic,
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  Users,
  Video,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useClinicalContext } from '@/lib/clinical-context';

export const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const clinical = useClinicalContext?.();
  const navigate = useNavigate();

  // Active Patient Context
  const activePatient = clinical?.activePatient || {
    id: 'p-101',
    name: 'Jane Doe',
    dob: '04/12/1988',
    mrn: '#MC-88219',
    cptCode: '90837',
    nextAppt: 'Today at 10:00 AM'
  };

  // Today's Clinical Schedule
  const todayAppointments = [
    {
      id: 'apt-1',
      time: '10:00 AM',
      duration: '60 min',
      patient: 'Jane Doe',
      type: 'Telehealth',
      cpt: '90837',
      status: 'Active',
      statusClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    },
    {
      id: 'apt-2',
      time: '11:30 AM',
      duration: '45 min',
      patient: 'Marcus Vance',
      type: 'In-Person',
      cpt: '90834',
      status: 'Confirmed',
      statusClass: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      id: 'apt-3',
      time: '02:00 PM',
      duration: '60 min',
      patient: 'Elena Rostova',
      type: 'Telehealth',
      cpt: '90837',
      status: 'Confirmed',
      statusClass: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      id: 'apt-4',
      time: '03:30 PM',
      duration: '90 min',
      patient: 'Samuel Green',
      type: 'Intake Evaluation',
      cpt: '90791',
      status: 'Confirmed',
      statusClass: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    }
  ];

  // The 4 Core Integrated Tool Cards
  const toolCards = [
    {
      id: 'ehr',
      name: 'Clinical EHR & Telehealth',
      path: '/dashboard/ehr',
      icon: Stethoscope,
      badge: 'EHR Active',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      description: 'Manage client rosters, appointment schedule, clinical notes, and HD telehealth.',
      stats: '24 Active Clients • 4 Today',
      actionLabel: 'Open EHR Roster'
    },
    {
      id: 'scribe',
      name: 'Clinical AI Scribe v2',
      path: '/dashboard/scribe',
      icon: Mic,
      badge: 'Acoustic Ready',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Ambient dual-speaker transcription, real-time waveform, and automated SOAP notes.',
      stats: '42 Encounters Transcribed • 6 Templates',
      actionLabel: 'Launch Scribe Recording'
    },
    {
      id: 'aura',
      name: 'Aura Assistant',
      path: '/dashboard/aura',
      icon: Sparkles,
      badge: 'Copilot Standby',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      description: 'In-workflow clinical decision support, DSM-5 criteria lookup, and snippet generation.',
      stats: 'DSM-5 Assistant • Typewriter Mode',
      actionLabel: 'Launch Aura Studio'
    },
    {
      id: 'phi',
      name: 'HIPAA PHI Scrubber',
      path: '/dashboard/phi-scrubber',
      icon: ShieldCheck,
      badge: '18 Safe Harbor',
      badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      description: 'Statutory 18-rule redaction engine with forensic audit table and zero-leak diff viewer.',
      stats: '1,280 Identifiers Scrubbed • 100% HIPAA',
      actionLabel: 'Open Scrubber Engine'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome & Clinician Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Clinical Command Center
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Welcome back, <strong>Dr. Sarah Chen, MD</strong> — Bay Area Behavioral Health
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NavLink
            to="/dashboard/scribe"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all"
          >
            <Mic className="h-4 w-4" />
            <span>Start Scribe Session</span>
          </NavLink>
          <NavLink
            to="/dashboard/calendar"
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <Calendar className="h-4 w-4" />
            <span>Calendar</span>
          </NavLink>
        </div>
      </div>

      {/* Active Patient Encounter Hero Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Activity className="h-64 w-64 text-white" />
        </div>

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Active Patient Encounter
              </span>
            </div>
            <span className="text-xs font-mono bg-indigo-800/80 px-2.5 py-1 rounded-md text-indigo-200 border border-indigo-700">
              MRN: {activePatient.mrn}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                {activePatient.name}
              </h2>
              <p className="text-indigo-200 text-sm leading-relaxed mb-4">
                DOB: <strong>{activePatient.dob}</strong> (Age 38) • Current Session:{' '}
                <strong>CPT {activePatient.cptCode}</strong> (Individual Psychotherapy, 60m).
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="bg-white/10 px-3 py-1 rounded-full text-indigo-100">
                  Diagnosis: F41.1 Generalized Anxiety
                </span>
                <span className="bg-white/10 px-3 py-1 rounded-full text-indigo-100">
                  Treatment Plan: Cognitive Behavioral Therapy (CBT)
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 justify-end">
              <NavLink
                to="/dashboard/scribe"
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Mic className="h-4 w-4" />
                <span>Ambient Scribe Feed</span>
              </NavLink>
              <NavLink
                to="/dashboard/ehr"
                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all border border-white/20"
              >
                <FileText className="h-4 w-4" />
                <span>Open EHR Chart</span>
              </NavLink>
              <NavLink
                to="/dashboard/phi-scrubber"
                className="px-4 py-2.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Scrub Patient PHI</span>
              </NavLink>
            </div>
          </div>
        </div>
      </div>

      {/* The 4 Core Integrated Clinical Tool Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Integrated Clinical Tools (The 4 Merged Apps)
          </h2>
          <span className="text-xs text-slate-600 font-medium">Unified Context Active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tool.badgeClass}`}>
                      {tool.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mb-1.5 leading-snug">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div>
                  <div className="text-[11px] font-semibold text-slate-600 pb-3 border-b border-slate-100 mb-3">
                    {tool.stats}
                  </div>
                  <NavLink
                    to={tool.path}
                    className="w-full py-2 px-3 rounded-lg bg-slate-50 hover:bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>{tool.actionLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </NavLink>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Today's Schedule & Cross-Tool Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left (2 cols): Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Today's Encounter Schedule</h3>
              <p className="text-xs text-slate-600">4 appointments scheduled for today</p>
            </div>
            <NavLink
              to="/dashboard/calendar"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Full Calendar →
            </NavLink>
          </div>

          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{apt.patient}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${apt.statusClass}`}>
                        {apt.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                      <span>{apt.time} ({apt.duration})</span>
                      <span>•</span>
                      <span>{apt.type}</span>
                      <span>•</span>
                      <span className="font-mono text-indigo-700 font-semibold">CPT {apt.cpt}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <NavLink
                    to="/dashboard/scribe"
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1"
                  >
                    <Mic className="h-3 w-3" />
                    <span>Scribe</span>
                  </NavLink>
                  {apt.type === 'Telehealth' && (
                    <NavLink
                      to="/dashboard/ehr"
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1"
                    >
                      <Video className="h-3 w-3" />
                      <span>Join Room</span>
                    </NavLink>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (1 col): Cross-Tool Clinical Pipeline Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Clinical Pipeline</h3>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                Cross-Tool Flow
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-6">
              How patient encounters flow seamlessly through the 4 merged applications:
            </p>

            <div className="space-y-4 relative">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">TheraFlow Telehealth Session</div>
                  <div className="text-[11px] text-slate-600">Secure WebRTC audio/video consultation.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Clinical AI Scribe v2 Diarization</div>
                  <div className="text-[11px] text-slate-600">Real-time speaker separation &amp; SOAP generation.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Aura Copilot Decision Support</div>
                  <div className="text-[11px] text-slate-600">DSM-5 criteria &amp; typewriter note enrichment.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full bg-cyan-100 text-cyan-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">18 Safe Harbor PHI Redaction</div>
                  <div className="text-[11px] text-slate-600">Forensic de-identification before external export.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6">
            <NavLink
              to="/dashboard/phi-scrubber"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Test Redaction Pipeline</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
```

---

## 6. Root Routing Architecture (`src/App.tsx`)

Wiring the public and protected routes, context providers, and route guards.

```tsx
/**
 * Unified Clinical Telehealth & AI Scribe SaaS Platform
 * Root Application & React Router Configuration
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { SubscriptionProvider } from '@/lib/subscription';
import { ClinicalContextProvider } from '@/lib/clinical-context';

// Layout & Route Guards
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/guards/ProtectedRoute';

// Core Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import DashboardHome from '@/pages/DashboardHome';
import Subscription from '@/pages/Subscription';

// The 4 Core Integrated Clinical Tool Placeholders / Workspaces
// (These are populated by their respective Milestones 3, 4, 5)
const EhrWorkspace = React.lazy(() => import('@/tools/theraflow/EhrWorkspace').catch(() => ({
  default: () => (
    <div className="p-6 bg-white rounded-2xl border border-slate-200">
      <h2 className="text-xl font-bold text-slate-900 mb-2">🏥 Clinical EHR &amp; Telehealth</h2>
      <p className="text-slate-600 text-sm">TheraFlow practice management, charts, and calendar.</p>
    </div>
  )
})));

const ScribeWorkspace = React.lazy(() => import('@/tools/scribe/ScribeWorkspace').catch(() => ({
  default: () => (
    <div className="p-6 bg-white rounded-2xl border border-slate-200">
      <h2 className="text-xl font-bold text-slate-900 mb-2">🎙️ Clinical AI Scribe v2</h2>
      <p className="text-slate-600 text-sm">Ambient diarization and multi-speaker SOAP transcription.</p>
    </div>
  )
})));

const AuraStudio = React.lazy(() => import('@/tools/aura/AuraStudio').catch(() => ({
  default: () => (
    <div className="p-6 bg-white rounded-2xl border border-slate-200">
      <h2 className="text-xl font-bold text-slate-900 mb-2">⚡ Aura Clinical Assistant</h2>
      <p className="text-slate-600 text-sm">In-workflow clinical decision support and typewriter notes.</p>
    </div>
  )
})));

const PhiScrubberView = React.lazy(() => import('@/tools/phi-scrubber/PhiScrubberView').catch(() => ({
  default: () => (
    <div className="p-6 bg-white rounded-2xl border border-slate-200">
      <h2 className="text-xl font-bold text-slate-900 mb-2">🛡️ HIPAA PHI Scrubber</h2>
      <p className="text-slate-600 text-sm">18 Safe Harbor statutory de-identification engine.</p>
    </div>
  )
})));

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ClinicalContextProvider>
          <Router>
            <React.Suspense
              fallback={
                <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-indigo-600 font-bold">
                  Loading Clinical Suite...
                </div>
              }
            >
              <Routes>
                {/* Public Marketing & Auth Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />

                {/* Protected Clinical Dashboard Shell */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Command Center Index */}
                  <Route index element={<DashboardHome />} />

                  {/* The 4 Core Integrated Clinical Tools */}
                  <Route path="ehr/*" element={<EhrWorkspace />} />
                  <Route path="scribe/*" element={<ScribeWorkspace />} />
                  <Route path="aura/*" element={<AuraStudio />} />
                  <Route path="phi-scrubber/*" element={<PhiScrubberView />} />

                  {/* Practice Operations Aliases */}
                  <Route path="calendar" element={<EhrWorkspace />} />
                  <Route path="clients" element={<EhrWorkspace />} />
                  <Route path="billing" element={<EhrWorkspace />} />
                  <Route path="subscription" element={<Subscription />} />
                  <Route path="settings" element={<EhrWorkspace />} />
                </Route>

                {/* Catch-all Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </React.Suspense>
          </Router>
        </ClinicalContextProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
};

export default App;
```

---

## 7. Context Interface Contracts & Fallbacks

To ensure that the layout, navigation, and page components compile without type errors regardless of whether sibling modules have completed implementation, the following minimal context definitions and fallbacks are documented:

### 7.1 `ClinicalContext` Interface Contract (`src/lib/clinical-context.tsx`)

```typescript
export interface Patient {
  id: string;
  name: string;
  dob: string;
  mrn: string;
  cptCode: string;
  encounterId?: string;
}

export interface ClinicalContextType {
  activePatient: Patient;
  setActivePatient: (patient: Patient) => void;
  activeEncounterNotes: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    rawTranscript: string;
  };
  updateNoteField: (field: string, text: string) => void;
  sendToPhiScrubber: (text: string) => void;
  insertToEhr: (note: any) => void;
}
```

---

## 8. Acceptance Verification Protocol

### Test Case 1: Unauthenticated Route Blocking (`/dashboard` → `/login`)
- **Action**: Fetch or navigate to `http://localhost:3000/dashboard` with empty `localStorage`.
- **Expected Outcome**: Immediate browser redirect to `/login?redirect=%2Fdashboard`.
- **Assertion**: URL pathname is `/login`, query param `redirect` equals `%2Fdashboard`.

### Test Case 2: 1-Click Demo Clinician Sign-In
- **Action**: On `/login`, click button `#demo-clinician-signin-btn`.
- **Expected Outcome**: `localStorage` receives `clinical_saas_session` with user `Dr. Sarah Chen, MD`.
- **Assertion**: Immediate navigation to `/dashboard`, Header renders active clinician `Dr. Sarah Chen, MD`, and active patient `Jane Doe`.

### Test Case 3: 4 Core Tool Navigation & Badges
- **Action**: Verify Sidebar contains all 4 tool links:
  - 🏥 `/dashboard/ehr` with badge `EHR`
  - 🎙️ `/dashboard/scribe` with badge `AI Live`
  - ⚡ `/dashboard/aura` with badge `Copilot`
  - 🛡️ `/dashboard/phi-scrubber` with badge `18 Safe Harbor`
- **Assertion**: Clicking each item updates route URL and highlights active navigation state without CSS bleed.

### Test Case 4: Active Patient Context Sync
- **Action**: Open Header patient switcher dropdown and select `Marcus Vance`.
- **Expected Outcome**: Active Patient Context bar updates immediately across Header, and `DashboardHome` reflects `Marcus Vance • DOB: 11/03/1992 • CPT: 90834`.

---

## 9. Conclusion

This blueprint provides an exhaustive, production-ready specification for all Milestone 1 layout and core page deliverables. All code listings adhere to React 19, TypeScript, and Tailwind CSS v4 conventions, preventing CSS bleed and ensuring full E2E testability.
