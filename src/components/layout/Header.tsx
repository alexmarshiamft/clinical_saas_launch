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
  Check,
  Crown,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useClinicalContext } from '@/lib/clinical-context';
import { useSubscription, SubscriptionStatus, SubscriptionTier, getTierBadgeInfo } from '@/lib/subscription';
import { useDemoGuide } from '@/lib/demo-guide-context';

export { getTierBadgeInfo };

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const { status, tier, isSubscribed } = useSubscription();
  const tierBadge = getTierBadgeInfo(status, tier);
  const clinical = useClinicalContext();

  const navigate = useNavigate();

  // Practice selection state
  const practices = [
    { id: '1', name: 'Bay Area Behavioral Health', type: 'Primary Clinic' },
    { id: '2', name: 'Pacific Telehealth Group', type: 'Affiliate Group' },
  ];
  const [selectedPractice, setSelectedPractice] = useState(practices[0]);
  const [showPracticeMenu, setShowPracticeMenu] = useState(false);

  const activePatient = clinical.activePatient;
  const [showPatientMenu, setShowPatientMenu] = useState(false);
  const { openGuide } = useDemoGuide();

  const rosterSample = [
    { id: 'p-101', name: 'Jane Doe', dob: '04/12/1988', cptCode: '90837', mrn: '#MC-88219' },
    { id: 'p-102', name: 'Marcus Vance', dob: '11/03/1992', cptCode: '90834', mrn: '#MC-91042' },
    { id: 'p-103', name: 'Elena Rostova', dob: '07/22/1985', cptCode: '90791', mrn: '#MC-77312' },
  ];

  const handleSelectPatient = (p: typeof rosterSample[0]) => {
    clinical.setActivePatient({
      id: p.id,
      name: p.name,
      dob: p.dob,
      mrn: p.mrn,
      cptCode: p.cptCode,
      encounterId: `enc-${Date.now()}`,
    });
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
        {!isSubscribed ? (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 shadow-2xs">
            <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="font-medium text-slate-600">Patient Encounter Context: Inactive</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
              Subscription Required
            </span>
          </div>
        ) : (
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
              <span className="flex items-center gap-1 text-[10px] text-amber-800 font-bold bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300">
                Synthetic • Not PHI
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-600 group-hover:text-indigo-600 transition-colors ml-1" />
          </div>
        )}

        {/* Patient Switcher Menu */}
        {isSubscribed && showPatientMenu && (
          <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-40">
            <div className="px-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Active Patient Encounter</span>
                <span className="text-[10px] text-amber-700 font-semibold">100% Synthetic Demo Data • Not Real PHI</span>
              </div>
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
        {/* Interactive Feature & Demo Guide */}
        <button
          onClick={() => openGuide()}
          data-testid="header-demo-guide-btn"
          title="Platform Demo & Feature Guide (or press ?)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-200/80 text-xs font-extrabold transition-all shadow-2xs hover:shadow-indigo-100 cursor-pointer group"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 group-hover:rotate-12 transition-transform" />
          <span>Demo Guide</span>
          <span className="hidden xl:inline text-[9px] font-mono text-indigo-500 bg-white/80 border border-indigo-200 px-1 py-0.2 rounded font-bold">
            ?
          </span>
        </button>

        {/* Active Subscription Tier Badge */}
        <NavLink
          to="/dashboard/subscription"
          data-testid="header-tier-badge"
          title={`Subscription: ${tierBadge.label} (Click to manage)`}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border shadow-2xs transition-all hover:opacity-90 ${tierBadge.className}`}
        >
          <Crown className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>{tierBadge.label}</span>
        </NavLink>

        {/* HIPAA Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
          <Shield className="h-3.5 w-3.5 text-emerald-600" />
          <span>HIPAA Safe Harbor</span>
        </div>

        {/* PHI Scrubber Quick Launcher */}
        <NavLink
          to="/dashboard/phi-scrubber"
          title="HIPAA PHI Scrubber"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-2xs"
        >
          <Shield className="h-3.5 w-3.5" />
          <span>PHI Scrubber</span>
        </NavLink>

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
