import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Calendar,
  Users,
  FileText,
  Video,
  CreditCard,
  ShieldCheck,
  Settings,
  Target,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';

// TheraFlow Subviews
import { ClientsView } from './ClientsView';
import { ClientProfileView } from './ClientProfileView';
import { CalendarView } from './CalendarView';
import { DAPNotesView } from './DAPNotesView';
import { TreatmentPlanView } from './TreatmentPlanView';
import { BillingView } from './BillingView';
import { TelehealthView } from './TelehealthView';
import { AuditLogsView } from './AuditLogsView';

export type EhrTab =
  | 'overview'
  | 'clients'
  | 'calendar'
  | 'notes'
  | 'treatment-plans'
  | 'billing'
  | 'telehealth'
  | 'audit-logs'
  | 'settings';

interface EhrWorkspaceProps {
  defaultTab?: EhrTab;
}

export const EhrWorkspace: React.FC<EhrWorkspaceProps> = ({ defaultTab }) => {
  const { activePatient, activeEncounterNotes } = useClinicalContext();
  const location = useLocation();
  const params = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // Determine initial tab from route path or prop
  const resolveTabFromLocation = (): EhrTab => {
    const path = location.pathname;
    if (path.includes('/calendar')) return 'calendar';
    if (path.includes('/clients')) return 'clients';
    if (path.includes('/billing')) return 'billing';
    if (path.includes('/telehealth')) return 'telehealth';
    if (path.includes('/audit-logs')) return 'audit-logs';
    if (path.includes('/notes')) return 'notes';
    if (path.includes('/treatment-plans')) return 'treatment-plans';
    if (path.includes('/settings')) return 'settings';
    return defaultTab || 'overview';
  };

  const [activeTab, setActiveTab] = useState<EhrTab>(resolveTabFromLocation);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(params.id || null);

  // Sync tab if URL changes
  useEffect(() => {
    const resolved = resolveTabFromLocation();
    setActiveTab(resolved);
    if (params.id) {
      setSelectedClientId(params.id);
    }
  }, [location.pathname, defaultTab, params.id]);

  const navTabs: { id: EhrTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: Stethoscope },
    { id: 'clients', label: 'Client Roster', icon: Users },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'notes', label: 'DAP Notes', icon: FileText },
    { id: 'treatment-plans', label: 'Treatment Plans', icon: Target },
    { id: 'billing', label: 'Billing & Claims', icon: CreditCard },
    { id: 'telehealth', label: 'Telehealth Room', icon: Video },
    { id: 'audit-logs', label: 'HIPAA Audit Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Practice Settings', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. Persistent Canonical EHR Header & Summary Cards                  */}
      {/* Strict Invariant Contract for E2E Tests T1.4.1 - T1.4.5 & T3.2      */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Clinical EHR &amp; Telehealth</h2>
              <p className="text-xs text-slate-500">TheraFlow Practice Management &amp; Patient Charting</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            EHR Active
          </span>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Patient roster, interactive appointment calendar, DAP progress notes, treatment plans, and superbill reimbursement statements.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold mb-1">Active Patient Chart</div>
            <div className="text-sm font-bold text-slate-900">{activePatient.name}</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">{activePatient.mrn} • CPT {activePatient.cptCode}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold mb-1">Telehealth State</div>
            <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
              <Video className="h-4 w-4" /> Ready for Session
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Encrypted WebRTC Room</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 font-semibold mb-1">Clinical Notes</div>
            <div className="text-sm font-bold text-slate-900">DAP / SOAP Formats</div>
            <div className="text-xs text-slate-500 mt-0.5">Auto-synced with Scribe</div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. TheraFlow Sub-Navigation Bar                                     */}
      {/* ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-2xs">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`tab-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'clients') {
                    setSelectedClientId(null);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ==================================================================== */}
      {/* 3. Subview Router & Component Display                                */}
      {/* ==================================================================== */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('telehealth')}
                className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white text-left shadow-xs hover:shadow-md transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div className="text-xs font-medium text-indigo-100">Live Video Encounter</div>
                <div className="text-base font-bold mt-0.5 flex items-center gap-1">
                  Start Telehealth
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-[11px] text-indigo-200 mt-2 font-mono">
                  CPT 90837 • 53m Psychotherapy
                </div>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className="p-5 rounded-2xl bg-white border border-slate-200 text-left shadow-2xs hover:border-indigo-300 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium text-slate-500">Clinical Documentation</div>
                <div className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                  Draft DAP Note
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform text-slate-400" />
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  AI Expander &amp; Digital Lock
                </div>
              </button>

              <button
                onClick={() => setActiveTab('treatment-plans')}
                className="p-5 rounded-2xl bg-white border border-slate-200 text-left shadow-2xs hover:border-indigo-300 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                  <Target className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium text-slate-500">Goal Tracking</div>
                <div className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                  Treatment Plan
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform text-slate-400" />
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  GAD-7 &amp; PHQ-9 Presets
                </div>
              </button>

              <button
                onClick={() => setActiveTab('billing')}
                className="p-5 rounded-2xl bg-white border border-slate-200 text-left shadow-2xs hover:border-indigo-300 transition-all group"
              >
                <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="text-xs font-medium text-slate-500">Claims &amp; Invoices</div>
                <div className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                  Superbill Statement
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform text-slate-400" />
                </div>
                <div className="text-[11px] text-slate-500 mt-2">
                  Provider NPI: 1982736450
                </div>
              </button>
            </div>

            {/* Overview Detail Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Active Encounter Summary */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Current Encounter Context</h3>
                      <p className="text-xs text-slate-500">Synchronized across Scribe, Aura, and EHR</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('clients')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View All Clients &rarr;
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-slate-900">{activePatient.name}</div>
                      <div className="text-xs text-slate-500 font-mono">
                        MRN: {activePatient.mrn} • DOB: {activePatient.dob || '05/14/1988'} • Age: {activePatient.age || 38}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Active Encounter
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Primary Diagnosis</div>
                      <div className="text-xs font-bold text-slate-800">
                        {activePatient.cptDesc ? `GAD (F41.1) • ${activePatient.cptDesc}` : 'Generalized Anxiety Disorder (F41.1)'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">CPT Encounter Code</div>
                      <div className="text-xs font-bold text-indigo-600">
                        CPT {activePatient.cptCode} (Psychotherapy)
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Encounter Date</div>
                      <div className="text-xs font-bold text-slate-800">
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  {activeEncounterNotes.assessment && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium mb-1">Clinical Assessment Summary</div>
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 font-sans leading-relaxed">
                        {activeEncounterNotes.assessment}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Compliance & Security Status */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">HIPAA Security &amp; Compliance</h3>
                    <p className="text-xs text-slate-500">Statutory 45 CFR §164.312(b)</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-slate-700">Audit Ledger</span>
                    </div>
                    <span className="font-semibold text-slate-900">SHA-256 Chained</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-slate-700">WebRTC Encryption</span>
                    </div>
                    <span className="font-semibold text-slate-900">256-bit DTLS/SRTP</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-slate-700">Business Associate</span>
                    </div>
                    <span className="font-semibold text-slate-900">Synthetic evaluation</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="font-medium text-slate-700">Claims Standard</span>
                    </div>
                    <span className="font-semibold text-slate-900">Reimbursement statement</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('audit-logs')}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                  View Cryptographic Audit Trail
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feature 8: Client Roster or Selected Client Profile */}
        {activeTab === 'clients' && (
          <div>
            {selectedClientId ? (
              <ClientProfileView
                clientId={selectedClientId}
                onBack={() => setSelectedClientId(null)}
                onNavigateToTelehealth={() => setActiveTab('telehealth')}
                onNavigateToCalendar={() => setActiveTab('calendar')}
              />
            ) : (
              <ClientsView
                onSelectClient={(id) => {
                  setSelectedClientId(id);
                }}
              />
            )}
          </div>
        )}

        {/* Feature 9: Interactive Calendar */}
        {activeTab === 'calendar' && (
          <CalendarView
            initialClientId={selectedClientId || undefined}
            onNavigateToTelehealth={() => setActiveTab('telehealth')}
            onNavigateToNotes={() => setActiveTab('notes')}
          />
        )}

        {/* Feature 10: DAP Notes */}
        {activeTab === 'notes' && (
          <DAPNotesView initialClientId={selectedClientId || undefined} />
        )}

        {/* Feature 10: Treatment Plans */}
        {activeTab === 'treatment-plans' && (
          <TreatmentPlanView initialClientId={selectedClientId || undefined} />
        )}

        {/* Feature 11: Invoicing & Superbill Statements */}
        {activeTab === 'billing' && <BillingView />}

        {/* Feature 12: Telehealth WebRTC Simulation */}
        {activeTab === 'telehealth' && (
          <TelehealthView
            clientId={selectedClientId || undefined}
            onLeave={() => setActiveTab('overview')}
            onOpenScribe={() => navigate('/dashboard/scribe')}
          />
        )}

        {/* Feature 12: HIPAA Immutable Audit Logs */}
        {activeTab === 'audit-logs' && <AuditLogsView />}

        {/* Practice Settings Panel */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">TheraFlow Practice Settings</h3>
              <p className="text-xs text-slate-500">Provider credentials, billing billing taxonomy, and EHR compliance defaults.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Billing Provider NPI</label>
                  <input
                    type="text"
                    readOnly
                    value="1982736450"
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">National Provider Identifier (CMS-1500 Box 33a)</span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Federal Tax ID (EIN)</label>
                  <input
                    type="text"
                    readOnly
                    value="XX-XXX4912"
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Healthcare Provider Taxonomy</label>
                  <input
                    type="text"
                    readOnly
                    value="101YM0800X (Mental Health Counselor)"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Primary Practice Facility</label>
                  <input
                    type="text"
                    readOnly
                    value="Bay Area Behavioral Health Group"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Clinical Practice Timezone</label>
                  <input
                    type="text"
                    readOnly
                    value="America/Los_Angeles (PST/PDT)"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Data Storage Engine</label>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Dual-Engine Active: Supabase + Offline LocalStorage Sandbox
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EhrWorkspace;
