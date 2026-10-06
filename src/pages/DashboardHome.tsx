import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Stethoscope,
  Mic,
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  Video,
  FileText,
  ArrowRight,
  Activity,
  Lock,
  DollarSign,
  Users,
  Wallet,
  Building2,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Play,
  Layers,
  ChevronRight,
  CreditCard,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useClinicalContext } from '@/lib/clinical-context';
import { useSubscription } from '@/lib/subscription';
import { useDemoGuide } from '@/lib/demo-guide-context';
import { usePracticeOs } from '@/lib/practice-os-context';

export const DashboardHome: React.FC = () => {
  const { profile } = useAuth();
  const clinical = useClinicalContext();
  const { isSubscribed } = useSubscription();
  const { openGuide } = useDemoGuide();
  const {
    workers,
    activePayPeriod,
    operatingAccount,
    isHydrating,
    reconciliations,
    financialSummary,
    executeCascadeSimulation,
    simulatePrivatePaySettlement,
    dbError
  } = usePracticeOs();

  const [cascadeRunning, setCascadeRunning] = useState(false);
  const [cascadeNotice, setCascadeNotice] = useState<string | null>(null);

  const activePatient = clinical.activePatient;
  const clinicianName = profile?.name || 'Dr. Sarah Chen, MD';
  const practiceName = profile?.practiceName || 'Bay Area Behavioral Health Group';

  const handleRunCascade = async () => {
    setCascadeRunning(true);
    setCascadeNotice(null);
    try {
      await executeCascadeSimulation();
      setCascadeNotice('Cascade Executed: Encounter 90837 ($150) -> Deposit Reconciled -> $85 Comp Accrued ($75 rate + $10 doc bonus) to Sarah Chen -> Added to Oct 1–15 Payroll');
    } catch (err: any) {
      setCascadeNotice(`Cascade Notice: ${err.message}`);
    } finally {
      setCascadeRunning(false);
      setTimeout(() => setCascadeNotice(null), 6000);
    }
  };

  // Today's Clinical Schedule
  const todayAppointments = [
    {
      id: 'apt-1',
      time: '10:00 AM',
      duration: '60 min',
      patient: isSubscribed ? 'Jane Doe' : 'Confidential Client (Gated)',
      type: 'Telehealth',
      cpt: '90837',
      status: 'Active',
      statusClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      id: 'apt-2',
      time: '11:30 AM',
      duration: '45 min',
      patient: isSubscribed ? 'Marcus Vance' : 'Confidential Client (Gated)',
      type: 'In-Person',
      cpt: '90834',
      status: 'Confirmed',
      statusClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'apt-3',
      time: '02:00 PM',
      duration: '60 min',
      patient: isSubscribed ? 'Elena Rostova' : 'Confidential Client (Gated)',
      type: 'Telehealth',
      cpt: '90837',
      status: 'Confirmed',
      statusClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'apt-4',
      time: '03:30 PM',
      duration: '90 min',
      patient: isSubscribed ? 'Samuel Green' : 'Confidential Client (Gated)',
      type: 'Intake Evaluation',
      cpt: '90791',
      status: 'Confirmed',
      statusClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
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
      actionLabel: 'Open EHR Roster',
    },
    {
      id: 'scribe',
      name: 'Clinical AI Scribe v2',
      path: '/dashboard/scribe',
      icon: Mic,
      badge: 'Browser Speech',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Browser speech, manual/demo speaker labels, waveforms and structured note templates.',
      stats: '42 Encounters Transcribed • 6 Templates',
      actionLabel: 'Launch Scribe Recording',
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
      actionLabel: 'Launch Aura Studio',
    },
    {
      id: 'phi',
      name: 'HIPAA PHI Scrubber',
      path: '/dashboard/phi-scrubber',
      icon: ShieldCheck,
      badge: '18 Safe Harbor',
      badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      description: 'Statutory 18-rule pattern redaction engine with forensic audit table and side-by-side diff viewer.',
      stats: '1,280 Identifiers Scrubbed • Pattern De-Identification',
      actionLabel: 'Open Scrubber Engine',
    },
  ];

  // Compute Practice Operating System Questions
  const totalBilled = 34500;
  const totalCollected = financialSummary?.totalRevenue ?? financialSummary?.monthlyTotalRevenue ?? 0;
  const accruedComp = financialSummary?.clinicianCompensation ?? financialSummary?.monthlyClinicianCompensation ?? 0;
  const grossMargin = financialSummary?.grossMargin ?? financialSummary?.monthlyGrossPracticeMargin ?? 0;
  const grossMarginPct = financialSummary?.grossMarginPercentage ?? financialSummary?.monthlyGrossMarginPercentage ?? 0;
  const operatingCash = operatingAccount?.currentBalance ?? 0;
  const nextPayrollAmount = activePayPeriod?.totalGrossCompensation ?? 0;
  const hasCashCoverage = operatingCash >= nextPayrollAmount;
  const outstandingAR = (reconciliations ?? [])
    .filter(r => r.status === 'pending_deposit')
    .reduce((sum, r) => sum + r.allowedAmount, 0) || 12450;

  return (
    <div className="space-y-8">
      {/* Top Welcome & Clinician Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 font-bold text-[11px] uppercase tracking-wider">
              Unified Practice OS
            </span>
            <span className="text-xs text-slate-600 font-medium">Session to Paycheck Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Practice Owner & Clinical Command Center
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Operating: <strong>{practiceName}</strong> • Logged in as <strong>{clinicianName}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRunCascade}
            disabled={cascadeRunning}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className={`h-3.5 w-3.5 ${cascadeRunning ? 'animate-spin' : ''}`} />
            <span>{cascadeRunning ? 'Cascading...' : 'Run One-Click Downstream Cascade'}</span>
          </button>
          <NavLink
            to="/onboarding"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <Building2 className="h-3.5 w-3.5 text-cyan-600" />
            <span>Practice Setup</span>
          </NavLink>
          <NavLink
            to="/migration"
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 shadow-2xs flex items-center gap-1.5 transition-all"
          >
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            <span>Migrate Stack</span>
          </NavLink>
        </div>
      </div>

      {/* Database Authority Failure Banner (Fail Visibly) */}
      {dbError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">PostgreSQL Authoritative Backend Alert</h4>
            <p className="text-xs text-amber-800 mt-0.5">{dbError}</p>
          </div>
        </div>
      )}

      {/* Cascade Notification Banner */}
      {cascadeNotice && (
        <div className="p-4 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
            <span><strong>Automated Ledger Ripple:</strong> {cascadeNotice}</span>
          </div>
          <NavLink to="/dashboard/payroll" className="underline font-bold text-cyan-300 hover:text-white shrink-0 ml-4">
            View in Payroll →
          </NavLink>
        </div>
      )}

      {/* 9-QUESTION UNIFIED OWNER HUD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2 text-white">
              <Activity className="w-5 h-5 text-cyan-400" />
              Unified Practice Operating System — Executive Health HUD
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Answer the 9 critical questions of group practice management in real time from one unified ledger.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {isHydrating ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Syncing Practice Ledger...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Ledger Synchronized
              </span>
            )}
          </div>
        </div>

        {/* 9 Questions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
          {/* Q1: Clinical Activity */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>1. What's Happening Clinically?</span>
              <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">4 Today</span>
              <span className="text-xs text-emerald-400 font-semibold">1 Active</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              98 completed encounters this cycle across {workers.length} clinicians.
            </p>
            <NavLink to="/dashboard/ehr" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300">
              Inspect Clinical Encounters <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>

          {/* Q2: Billed */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>2. What Has Been Billed?</span>
              <FileText className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">${totalBilled.toLocaleString()}</span>
              <span className="text-xs text-slate-400">Claims Submitted</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Synthetic billing events shown for workflow evaluation; no clearinghouse acceptance verified.
            </p>
            <NavLink to="/dashboard/billing" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300">
              Open Claims Ledger <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>

          {/* Q3: Collected */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>3. What's Been Collected?</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">${totalCollected.toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-medium">Net Realized</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ${(financialSummary.insuranceCollections ?? financialSummary.monthlyRevenueInsurance).toLocaleString()} Insurance ERA + ${(financialSummary.privatePayCollections ?? financialSummary.monthlyRevenuePrivatePay).toLocaleString()} Private Pay.
            </p>
            <NavLink to="/dashboard/banking" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300">
              View Bank Deposits <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>

          {/* Q4: Clinician Comp Owed */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>4. What Are Clinicians Owed?</span>
              <Users className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-300">${accruedComp.toLocaleString()}</span>
              <span className="text-xs text-slate-400">Accrued Comp</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic splits automatically calculated per signed encounter.
            </p>
            <NavLink to="/dashboard/compensation" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300">
              Compensation Rules Engine <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>

          {/* Q5: Next Payroll */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>5. What Is Next Payroll?</span>
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300">${nextPayrollAmount.toLocaleString()}</span>
              <span className="text-xs text-slate-400">Oct 1–15 Cycle</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pay Date: Oct 20, 2026 • Status: <span className="text-emerald-400 font-semibold">{activePayPeriod?.status ?? 'open'}</span>
            </p>
            <NavLink to="/dashboard/payroll" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300">
              Inspect Payroll Review Table <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>

          {/* Q6: Cash Coverage */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>6. Can We Fund Payroll?</span>
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black ${hasCashCoverage ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hasCashCoverage ? 'Fully Covered' : 'Deficit'}
              </span>
              <span className="text-xs text-slate-400 font-mono">${operatingCash.toLocaleString()} Cash</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Operating account holds 3.6x total biweekly payroll obligation.
            </p>
            <NavLink to="/dashboard/banking" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300">
              Embedded Banking Ledger <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>

          {/* Q7: Outstanding AR */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>7. Outstanding Claims AR</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300">${outstandingAR.toLocaleString()}</span>
              <span className="text-xs text-slate-400">Pending Remit</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Average reimbursement velocity: 11.2 days across commercial payers.
            </p>
            <NavLink to="/dashboard/banking" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300">
              Claim-to-Bank Reconciliation <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>

          {/* Q8: Clinician Utilization */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>8. Clinician Productivity</span>
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-cyan-300">86.4%</span>
              <span className="text-xs text-slate-400">Target Billable</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isSubscribed ? 'Sarah Chen (92%), Marcus Vance (84%), Elena Rostova (88%).' : 'Lead Clinician (92%), Staff Clinicians (86% avg).'}
            </p>
            <NavLink to="/dashboard/workforce" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300">
              Workforce Roster &amp; Targets <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>

          {/* Q9: Practice Gross Margin */}
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition-all">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>9. Practice Gross Margin</span>
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400">${grossMargin.toLocaleString()}</span>
              <span className="text-xs text-emerald-400 font-bold">({grossMarginPct.toFixed(1)}%)</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Net operating cash flow after OpEx: +${(financialSummary.netOperatingCashFlow ?? financialSummary.monthlyNetCashFlow).toLocaleString()}.
            </p>
            <NavLink to="/dashboard/banking" className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300">
              Practice Economics Waterfall <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>
        </div>

        {/* 4 Practice OS Navigation Pills */}
        <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <NavLink
            to="/dashboard/workforce"
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-center transition-all group"
          >
            <Users className="w-4 h-4 text-cyan-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Workforce Roster</div>
            <div className="text-[10px] text-slate-400">{workers.length} Active Providers</div>
          </NavLink>

          <NavLink
            to="/dashboard/compensation"
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-center transition-all group"
          >
            <Briefcase className="w-4 h-4 text-purple-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">Compensation Plans</div>
            <div className="text-[10px] text-slate-400">Tiered &amp; CPT Splits</div>
          </NavLink>

          <NavLink
            to="/dashboard/payroll"
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-center transition-all group"
          >
            <Wallet className="w-4 h-4 text-amber-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">TheraFlow Payroll</div>
            <div className="text-[10px] text-slate-400">Gusto / ADP Abstraction</div>
          </NavLink>

          <NavLink
            to="/dashboard/banking"
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-center transition-all group"
          >
            <Building2 className="w-4 h-4 text-emerald-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-white">TheraFlow Money</div>
            <div className="text-[10px] text-slate-400">Treasury Sandbox &amp; Recon</div>
          </NavLink>
        </div>
      </div>

      {/* Interactive Demo & Feature Guide Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                Interactive Demo Walkthrough &amp; Sandbox
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">• Shortcut: press ? anywhere</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>Checking out the TheraFlow Platform?</span>
              <Sparkles className="h-5 w-5 text-amber-400 shrink-0" />
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/80 leading-relaxed">
              Experience the complete behavioral health operating system: Clinical EHR, Ambient AI Scribe v2, Aura Assistant, PHI Redaction, Workforce Rosters, Clinician Compensation Rules, Payroll Orchestration, and Sandbox Treasury.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-amber-200/90 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-lg">
              <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider">⚠️ Synthetic Data Only:</span>
              <span>All patient charts, transcripts, provider rosters, compensation splits, and bank balances are 100% fictional computer-generated demonstration data.</span>
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-col xl:flex-row items-stretch lg:items-end gap-2.5 shrink-0">
            <button
              onClick={() => openGuide('journey')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-102"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Launch 6-Step Clinical Tour</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openGuide('catalog')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Feature Catalog
              </button>
              <button
                onClick={() => openGuide('sandbox')}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Sandbox Tiers</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Patient Encounter Hero Card */}
      {!isSubscribed ? (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Clinical Encounter Access Gated
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Patient Chart &amp; Telehealth Locked
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-xl">
              An active clinical subscription or trial is required to access active patient charts, diagnostic coding, and session workflows. Protected health information (ePHI) is strictly masked until subscription confirmation.
            </p>
            <div className="flex flex-wrap gap-3">
              <NavLink
                to="/dashboard/subscription"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <span>View Subscription Plans</span>
                <ArrowRight className="h-4 w-4" />
              </NavLink>
            </div>
          </div>
        </div>
      ) : (
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
                MRN: {isSubscribed ? activePatient.mrn : '#MC-•••••'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                  {isSubscribed ? activePatient.name : 'Confidential Client (Gated)'}
                </h2>
                <p className="text-indigo-200 text-sm leading-relaxed mb-4">
                  DOB: <strong>{isSubscribed ? activePatient.dob : '••/••/••••'}</strong> (Age {isSubscribed ? (activePatient.age || 38) : '••'}) • Current Session:{' '}
                  <strong>CPT {activePatient.cptCode}</strong> ({activePatient.cptDesc || 'Psychotherapy, 60m'}).
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-white/10 px-3 py-1 rounded-full text-indigo-100">
                    Diagnosis: {isSubscribed ? 'F41.1 Generalized Anxiety' : '[Protected Clinical Diagnosis]'}
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
      )}

      {/* The 4 Core Integrated Clinical Tool Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Integrated Clinical Tools (EHR, AI Scribe, Aura, PHI Scrubber)
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
        {!isSubscribed ? (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Today's Encounter Schedule</h3>
                <p className="text-xs text-slate-500">Access Restricted</p>
              </div>
              <NavLink
                to="/dashboard/subscription"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                Subscribe to View →
              </NavLink>
            </div>
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center flex flex-col items-center justify-center">
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Lock className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">Schedule &amp; Patient Roster Gated</h4>
              <p className="text-xs text-slate-500 max-w-md mb-4">
                Patient appointments, telehealth rooms, and clinical intake evaluations are protected under HIPAA access controls. Activate your clinician license to view schedule details.
              </p>
              <NavLink
                to="/dashboard/subscription"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors"
              >
                Activate Clinical Access
              </NavLink>
            </div>
          </div>
        ) : (
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
        )}

        {/* Right (1 col): The Unified Encounter-to-Paycheck Chain */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Encounter → Paycheck</h3>
              <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                One Practice Ledger
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-5">
              Enter clinical activity once. Downstream revenue, compensation, payroll, and banking derive automatically:
            </p>

            <div className="space-y-3 relative text-xs">
              {[
                { step: '1', title: 'Clinical Note & CPT', desc: 'Therapist signs SOAP note with CPT 90837 ($150).' },
                { step: '2', title: 'Claim / Patient Charge', desc: 'Synthetic claim or payment event recorded.' },
                { step: '3', title: 'Bank Deposit & ERA Match', desc: 'Insurance remit or card settlement reconciled to checking.' },
                { step: '4', title: 'Compensation Engine', desc: 'Rules apply (60% split = $90 payable to clinician).' },
                { step: '5', title: 'Payroll Run & Direct Deposit', desc: '$90 aggregated into Oct 1–15 payroll batch for Gusto/ADP.' }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {item.step}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{item.title}</div>
                    <div className="text-[11px] text-slate-600">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 mt-6 space-y-2">
            <button
              onClick={handleRunCascade}
              disabled={cascadeRunning}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 text-cyan-400" />
              <span>Simulate Downstream Cascade</span>
            </button>
            <NavLink
              to="/dashboard/payroll"
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View Active Payroll Ledger</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
