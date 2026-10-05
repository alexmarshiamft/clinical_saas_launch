import React, { useState } from 'react';
import {
  Award,
  Calculator,
  Percent,
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Plus,
  HelpCircle,
} from 'lucide-react';
import { usePracticeOs } from '@/lib/practice-os-context';
import { calculateEncounterCompensation } from '@/modules/compensation/compensation-engine';

export const CompensationView: React.FC = () => {
  const { compensationPlans, workers } = usePracticeOs();
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);

  // Live Simulator State
  const [simWorkerId, setSimWorkerId] = useState<string>(workers[0]?.id || '');
  const [simCpt, setSimCpt] = useState<string>('90837');
  const [simServiceType, setSimServiceType] = useState<'individual' | 'couples' | 'intake'>('individual');
  const [simStatus, setSimStatus] = useState<'completed' | 'no_show' | 'late_cancelled'>('completed');
  const [simCollected, setSimCollected] = useState<number>(160.00);
  const [simNoteOnTime, setSimNoteOnTime] = useState<boolean>(true);
  const [simSessionIndex, setSimSessionIndex] = useState<number>(22); // Session #22 (Tier 2 test)

  const activePlan = compensationPlans[selectedPlanIndex] || compensationPlans[0];
  const selectedWorker = workers.find((w) => w.id === simWorkerId) || workers[0];

  // Run calculation dynamically
  const simResult = calculateEncounterCompensation(
    {
      encounterId: 'enc-live-sim-1',
      workerId: selectedWorker.id,
      workerName: `${selectedWorker.firstName} ${selectedWorker.lastName}`,
      clientName: 'Jane Doe',
      dateOfService: '2026-10-05',
      cptCode: simCpt,
      serviceType: simServiceType,
      status: simStatus,
      amountBilled: simCollected + 40,
      allowedAmount: simCollected,
      amountCollected: Number(simCollected),
      isNoteSignedOnTime: simNoteOnTime,
      historicalSessionCountInPeriod: Number(simSessionIndex) - 1,
      timingEvent: 'cash_settled',
    },
    activePlan
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Clinician Compensation Engine</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Module 2: Flexible Rules &amp; Auditable Math
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure practice compensation plans, CPT rates, tiered volume splits, no-show allowances, and auditable line-item explanations.
          </p>
        </div>
      </div>

      {/* Plan Selector Pills */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        {compensationPlans.map((plan, idx) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlanIndex(idx)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              selectedPlanIndex === idx
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="h-4 w-4" />
            {plan.name}
            {plan.isDefault && (
              <span className="text-[10px] bg-slate-900/10 px-1.5 py-0.2 rounded font-mono font-semibold">
                Default
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Two Column Layout: Plan Rules Overview vs Live Compensation Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Plan Rules Card (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div>
              <div className="text-xs font-bold text-amber-600 uppercase tracking-wide">Active Plan Structure</div>
              <h2 className="text-lg font-black text-slate-900">{activePlan.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{activePlan.description}</p>
            </div>

            {/* Special Protections Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-semibold text-[10px] uppercase">Monthly Minimum Guarantee</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  ${activePlan.minimumPayGuarantee?.toLocaleString()} / mo
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">Guaranteed monthly floor</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-slate-400 font-semibold text-[10px] uppercase">Documentation Promptness Bonus</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  +${activePlan.documentationBonusAmount?.toFixed(2)} / note
                </div>
                <div className="text-[10px] text-indigo-600 font-medium">Signed within 24h of DOS</div>
              </div>
            </div>

            {/* Rules Breakdown */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Configured Compensation Rules</div>
              {activePlan.rules.map((rule, idx) => (
                <div key={rule.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      {rule.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                      Policy: {rule.timingPolicy.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-slate-500 text-[11px]">{rule.description}</p>

                  {/* Tier matrix if tiered */}
                  {rule.tiers && (
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                      {rule.tiers.map((t, tIdx) => (
                        <div key={tIdx} className="p-1.5 rounded-lg bg-white border border-slate-200 text-center">
                          <span className="text-slate-400 block">Sessions {t.fromCount}-{t.toCount || '∞'}</span>
                          <span className="font-bold text-indigo-600">{t.rateOrPercentage}% Split</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {rule.flatAmount && !rule.tiers && (
                    <div className="text-indigo-600 font-bold font-mono text-xs">
                      Rate: ${rule.flatAmount.toFixed(2)} per occurrence
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Compensation Simulator (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-xl space-y-4 border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-amber-400" />
                <h3 className="font-extrabold text-sm text-white">Live Compensation Calculator</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Interactive Sandbox
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Test how an encounter calculates clinician earnings and practice margin under the selected plan rules.
            </p>

            {/* Inputs Form */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Clinician</label>
                <select
                  value={simWorkerId}
                  onChange={(e) => setSimWorkerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.firstName} {w.lastName} ({w.credentials.licenseType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">CPT Code</label>
                  <select
                    value={simCpt}
                    onChange={(e) => setSimCpt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  >
                    <option value="90837">90837 (Indiv 60m)</option>
                    <option value="90834">90834 (Indiv 45m)</option>
                    <option value="90847">90847 (Couples)</option>
                    <option value="90791">90791 (Intake 90m)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Session Status</label>
                  <select
                    value={simStatus}
                    onChange={(e) => setSimStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  >
                    <option value="completed">Completed</option>
                    <option value="late_cancelled">Late Cancelled</option>
                    <option value="no_show">No-Show</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Cash Collected ($)</label>
                  <input
                    type="number"
                    value={simCollected}
                    onChange={(e) => setSimCollected(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Session # in Period</label>
                  <input
                    type="number"
                    value={simSessionIndex}
                    onChange={(e) => setSimSessionIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simNoteOnTime}
                  onChange={(e) => setSimNoteOnTime(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span className="text-slate-300 text-xs">Note Signed Within 24h (Promptness Bonus)</span>
              </label>
            </div>

            {/* Calculated Breakdown Display */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                Engine Calculation Output
              </div>

              {simResult.eligibleForAccrual && simResult.lineItem ? (
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="text-[10px] text-amber-300 font-semibold">Clinician Payable</div>
                      <div className="text-xl font-black text-amber-400">
                        ${simResult.lineItem.clinicianEarning.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="text-[10px] text-emerald-300 font-semibold">Practice Retained</div>
                      <div className="text-xl font-black text-emerald-400">
                        ${simResult.lineItem.practiceRetained.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                    <div className="text-amber-400 font-bold text-[10px] uppercase font-sans">
                      Auditable Mathematical Explanation:
                    </div>
                    <div className="leading-relaxed break-words">{simResult.lineItem.explanation}</div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {simResult.ineligibilityReason}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompensationView;
