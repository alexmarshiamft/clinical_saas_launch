import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  Building2,
  Users,
  DollarSign,
  Calendar,
  FileText,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Layers,
  Database
} from 'lucide-react';
import { usePracticeOs } from '../lib/practice-os-context';

export const MigrationWizard: React.FC = () => {
  const navigate = useNavigate();
  const { workers, compensationPlans } = usePracticeOs();
  const [step, setStep] = useState(1);
  const [sourceStack, setSourceStack] = useState('sp_gusto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);

  // Synthetic uploaded files state
  const [uploadedFiles, setUploadedFiles] = useState({
    roster: true,
    clients: true,
    claims: true,
    appointments: true
  });

  const sourceStacks = [
    {
      id: 'sp_gusto',
      name: 'SimplePractice + Gusto + QuickBooks',
      description: 'The standard fragmented stack: SimplePractice for clinical & billing, Gusto for payroll, QuickBooks for accounting.',
      activeClinicians: '8–25 clinicians',
      fragmentationPain: 'Requires manual spreadsheet export of billing to calculate splits for Gusto payroll.'
    },
    {
      id: 'tn_adp',
      name: 'TherapyNotes + ADP + External Biller',
      description: 'EHR separated from high-fee 3rd party billing agency with ADP run manually on biweekly spreadsheet reports.',
      activeClinicians: '10–40 clinicians',
      fragmentationPain: 'Delayed collections reconciliation and double data entry across three portals.'
    },
    {
      id: 'kareo_spreadsheets',
      name: 'Kareo / Tebra + Paychex + Custom Spreadsheets',
      description: 'Complex multi-tier compensation calculated in Google Sheets with frequent formula errors.',
      activeClinicians: '5–30 clinicians',
      fragmentationPain: 'High administrative friction and lack of auditable pay explanations for clinicians.'
    },
    {
      id: 'csv_generic',
      name: 'Custom EHR & Spreadsheets (Generic CSV)',
      description: 'Custom behavioral health setup exporting standard CSV/XLS data files.',
      activeClinicians: 'Any size',
      fragmentationPain: 'Data siloed across multiple disconnected platforms.'
    }
  ];

  const handleSimulateImport = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setMigrationDone(true);
      setStep(5);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Layers className="w-3.5 h-3.5" />
            Group Practice Consolidation Suite
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Migrate to Unified TheraFlow OS
          </h1>
          <p className="mt-2 text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Consolidate your EHR, billing agency, Gusto/ADP payroll, and bank spreadsheets into one single source of truth. Zero duplicate data entry from day one.
          </p>
        </div>

        {/* Stepper Progress */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-8 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Source Stack' },
              { num: 2, label: 'Data Upload' },
              { num: 3, label: 'Field Mapping' },
              { num: 4, label: 'Audit & Preview' },
              { num: 5, label: 'Live Cutover' }
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      step === s.num
                        ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 ring-4 ring-cyan-500/20'
                        : step > s.num
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={`text-xs mt-2 font-medium hidden sm:block ${step === s.num ? 'text-white' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < 4 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      step > idx + 1 ? 'bg-emerald-500' : 'bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step 1: Select Source Stack */}
        {step === 1 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                Select Your Practice's Current Stack
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                TheraFlow includes automated schema parsers for standard exports from leading practice software combinations.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {sourceStacks.map((stack) => (
                <label
                  key={stack.id}
                  onClick={() => setSourceStack(stack.id)}
                  className={`p-5 rounded-xl border text-left cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    sourceStack === stack.id
                      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="sourceStack"
                        checked={sourceStack === stack.id}
                        onChange={() => setSourceStack(stack.id)}
                        className="text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="font-bold text-white text-base">{stack.name}</span>
                    </div>
                    <p className="text-xs text-slate-300 pl-6">{stack.description}</p>
                    <div className="pl-6 pt-1 flex items-center gap-1.5 text-xs text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Current issue: {stack.fragmentationPain}</span>
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0 pl-6 sm:pl-0">
                    <span className="text-xs bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-medium">
                      {stack.activeClinicians}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                Continue to Data Upload
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Data Upload (Synthetic pre-loaded) */}
        {step === 2 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-cyan-400" />
                Upload Practice Data Exports
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Drop your standard CSV exports. For this demonstration, realistic synthetic files from your selected stack have been pre-staged.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'roster',
                  title: 'Clinician & Staff Roster',
                  file: 'gusto_workforce_export_2026.csv',
                  details: '14 Clinicians, NPIs, W-2/1099 designations, compensation plan tags'
                },
                {
                  id: 'clients',
                  title: 'Client Records & Insurance',
                  file: 'simplepractice_clients_demographics.csv',
                  details: '342 Active Clients, primary payers, copay & deductible profiles'
                },
                {
                  id: 'claims',
                  title: 'Claims Ledger & Outstanding AR',
                  file: 'claims_history_and_ar_q3_2026.csv',
                  details: '$48,250 Outstanding AR across Aetna, Optum, BCBS, and Cigna'
                },
                {
                  id: 'appointments',
                  title: 'Upcoming Calendar & Encounters',
                  file: 'upcoming_schedule_oct_nov_2026.ics',
                  details: '185 Upcoming appointments scheduled through November 2026'
                }
              ].map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-white text-sm">{item.title}</span>
                    </div>
                    <p className="text-xs font-mono text-cyan-400">{item.file}</p>
                    <p className="text-xs text-slate-400">{item.details}</p>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Smart Schema Ingestion:</strong> TheraFlow auto-detects column headers for SimplePractice, TherapyNotes, Gusto, and ADP exports, mapping CPT codes, client IDs, and clinician NPIs without manual re-formatting.
              </span>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                Proceed to Field Mapping
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Field Mapping & Validation */}
        {step === 3 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-cyan-400" />
                Automated Field Mapping & Data Hygiene
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                TheraFlow matched 48 fields across your uploaded exports with 100% confidence.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  category: 'Workforce & Provider Roster',
                  sourceField: 'Gusto: `employee_id`, `ssn_last4`, `pay_rate`, `title`',
                  theraField: 'TheraFlow: `workers.id`, `employment_type`, `assigned_plan_id`',
                  status: 'Matched (14/14)',
                  color: 'text-emerald-400'
                },
                {
                  category: 'Clinical CPT Codes',
                  sourceField: 'SimplePractice: `billing_code`, `modifier_1`, `duration_minutes`',
                  theraField: 'TheraFlow: `cpt_code`, `encounter_type`, `telehealth_pos`',
                  status: 'Standard 2026 CPT Mapped',
                  color: 'text-emerald-400'
                },
                {
                  category: 'Compensation Splits',
                  sourceField: 'Excel: `therapist_cut_pct`, `intake_flat_rate`, `no_show_split`',
                  theraField: 'TheraFlow: `compensation_rules` (tiered & flat)',
                  status: 'Converted to Auditable Rules',
                  color: 'text-cyan-400'
                },
                {
                  category: 'Insurance AR & Claims',
                  sourceField: 'Clearinghouse 837/835: `payer_claim_control_no`, `allowed_amount`',
                  theraField: 'TheraFlow: `claims` & `payment_reconciliations`',
                  status: '34 Pending Claims Linked',
                  color: 'text-emerald-400'
                }
              ].map((mapItem, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-white text-sm">{mapItem.category}</span>
                    <p className="text-slate-400 font-mono">{mapItem.sourceField}</p>
                    <p className="text-cyan-300 font-mono">↳ {mapItem.theraField}</p>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <span className={`px-2.5 py-1 rounded bg-slate-800 font-semibold border border-slate-700 ${mapItem.color}`}>
                      {mapItem.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Zero Conflict Check Passed:</strong> No duplicate NPI numbers or overlapping client chart IDs found. All records are ready for atomic cutover.
              </span>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20"
              >
                Preview Migration Audit
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Audit & Consolidated Preview */}
        {step === 4 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Consolidated Migration Audit
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Review what will be ingested into your unified TheraFlow practice ledger upon cutover.
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
                <Users className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                <div className="text-2xl font-black text-white">14</div>
                <div className="text-xs text-slate-400">Clinicians & Staff</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
                <Building2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <div className="text-2xl font-black text-white">342</div>
                <div className="text-xs text-slate-400">Client Charts</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
                <DollarSign className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <div className="text-2xl font-black text-white">$48,250</div>
                <div className="text-xs text-slate-400">Outstanding AR</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
                <Calendar className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <div className="text-2xl font-black text-white">185</div>
                <div className="text-xs text-slate-400">Future Sessions</div>
              </div>
            </div>

            {/* Provider Breakdown preview */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300">
                Sample Clinician Migration Staging
              </div>
              <div className="divide-y divide-slate-800 text-xs">
                {workers.slice(0, 4).map((w) => (
                  <div key={w.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{w.firstName} {w.lastName}, {w.credentials.licenseType}</span>
                      <span className="text-slate-400 ml-2 font-mono">NPI: {w.credentials.npi}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">{w.employmentType}</span>
                      <span className="text-cyan-400 font-medium">Plan: {w.compensationPlanId}</span>
                      <span className="text-emerald-400 font-semibold">Ready</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-white">What happens next?</div>
              <p>
                When you click <strong>Execute Consolidated Cutover</strong>, TheraFlow creates atomic records across the clinical calendar, EHR charts, compensation rules engine, and banking ledger. All historical records are frozen into the audit log.
              </p>
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleSimulateImport}
                disabled={isProcessing}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing Atomic Cutover...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Execute Consolidated Cutover
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Live Cutover Success */}
        {step === 5 && migrationDone && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">
                Migration Complete — Your Practice is Consolidated
              </h2>
              <p className="text-sm text-slate-400 max-w-lg mx-auto">
                All 14 clinicians, 342 active charts, $48,250 in receivables, and 185 future appointments are now unified under TheraFlow OS.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="text-slate-400 font-semibold uppercase tracking-wider">Decommissioned Stack Summary:</div>
              <div className="flex justify-between text-slate-300">
                <span>Previous EHR (SimplePractice / TherapyNotes):</span>
                <span className="text-emerald-400 font-bold">Consolidated</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>External Payroll (Gusto / ADP):</span>
                <span className="text-emerald-400 font-bold">Integrated</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Manual Compensation Spreadsheets:</span>
                <span className="text-emerald-400 font-bold">Replaced with Engine</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 text-sm"
              >
                Open Unified Owner Command Center
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/dashboard/workforce')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm"
              >
                Inspect Workforce Roster
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
