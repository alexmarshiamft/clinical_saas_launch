import React from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useClinicalContext } from '@/lib/clinical-context';
import { useSubscription } from '@/lib/subscription';
import { useDemoGuide } from '@/lib/demo-guide-context';

export const DashboardHome: React.FC = () => {
  const { profile } = useAuth();
  const clinical = useClinicalContext();
  const { isSubscribed } = useSubscription();
  const { openGuide } = useDemoGuide();

  const activePatient = clinical.activePatient;
  const clinicianName = profile?.name || 'Dr. Sarah Chen, MD';
  const practiceName = profile?.practiceName || 'Bay Area Behavioral Health Group';

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
      statusClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      id: 'apt-2',
      time: '11:30 AM',
      duration: '45 min',
      patient: 'Marcus Vance',
      type: 'In-Person',
      cpt: '90834',
      status: 'Confirmed',
      statusClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'apt-3',
      time: '02:00 PM',
      duration: '60 min',
      patient: 'Elena Rostova',
      type: 'Telehealth',
      cpt: '90837',
      status: 'Confirmed',
      statusClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'apt-4',
      time: '03:30 PM',
      duration: '90 min',
      patient: 'Samuel Green',
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
      badge: 'Acoustic Ready',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      description: 'Ambient dual-speaker transcription, real-time waveform, and automated SOAP notes.',
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
      description: 'Statutory 18-rule redaction engine with forensic audit table and zero-leak diff viewer.',
      stats: '1,280 Identifiers Scrubbed • 100% HIPAA',
      actionLabel: 'Open Scrubber Engine',
    },
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
            Welcome back, <strong>{clinicianName}</strong> — {practiceName}
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
              Experience the 4 unified clinical suites: Clinical EHR, Ambient AI Scribe v2, Aura Assistant Copilot, and 18 Safe Harbor PHI Scrubber. Follow our step-by-step clinical consultation journey or test tier access gates in the sandbox.
            </p>
            <div className="pt-1 flex items-center gap-2 text-[11px] text-amber-200/90 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-lg">
              <span className="font-bold text-amber-400 uppercase text-[10px] tracking-wider">⚠️ Synthetic Data Only:</span>
              <span>All patient charts, transcripts, and records are 100% fictional computer-generated data (Not real people, not real PHI).</span>
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
                MRN: {activePatient.mrn}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
                  {activePatient.name}
                </h2>
                <p className="text-indigo-200 text-sm leading-relaxed mb-4">
                  DOB: <strong>{activePatient.dob}</strong> (Age {activePatient.age || 38}) • Current Session:{' '}
                  <strong>CPT {activePatient.cptCode}</strong> ({activePatient.cptDesc || 'Psychotherapy, 60m'}).
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
      )}

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
