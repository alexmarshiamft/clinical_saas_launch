import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  Users,
  Award,
  Stethoscope,
  CreditCard,
  Banknote,
  Landmark,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { usePracticeOs } from '@/lib/practice-os-context';

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { addWorker, addCompensationPlan } = usePracticeOs();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [practiceType, setPracticeType] = useState<'solo' | 'group'>('group');
  const [practiceName, setPracticeName] = useState('Golden Gate Behavioral Health');
  const [practiceState, setPracticeState] = useState('CA');
  const [primaryCity, setPrimaryCity] = useState('San Francisco');

  const [providerType, setProviderType] = useState<string>('sandbox');
  const [bankingEnabled, setBankingEnabled] = useState<boolean>(true);
  const [aiScribeEnabled, setAiScribeEnabled] = useState<boolean>(true);
  const [phiScrubberEnabled, setPhiScrubberEnabled] = useState<boolean>(true);

  const steps = [
    { number: 1, title: 'Practice', icon: Building2 },
    { number: 2, title: 'Team', icon: Users },
    { number: 3, title: 'Compensation', icon: Award },
    { number: 4, title: 'Services', icon: Stethoscope },
    { number: 5, title: 'Billing', icon: CreditCard },
    { number: 6, title: 'Payroll', icon: Banknote },
    { number: 7, title: 'Banking', icon: Landmark },
    { number: 8, title: 'Telehealth & AI', icon: Sparkles },
  ];

  const handleFinish = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6 sm:p-10">
      {/* Top Brand Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-base shadow-md">
            TF
          </div>
          <div>
            <h1 className="font-black text-base tracking-tight text-white">TheraFlow OS</h1>
            <div className="text-[10px] text-teal-400 font-semibold">Start-A-Practice Onboarding Wizard</div>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          Skip to Dashboard
        </button>
      </div>

      {/* Main Wizard Card */}
      <div className="max-w-3xl mx-auto w-full my-8 bg-slate-950/80 rounded-3xl border border-slate-800 p-8 shadow-2xl space-y-6 backdrop-blur-md">
        {/* Step Indicator Progress Bar */}
        <div className="grid grid-cols-8 gap-2 border-b border-slate-800 pb-5">
          {steps.map((s) => {
            const Icon = s.icon;
            const isCompleted = s.number < currentStep;
            const isCurrent = s.number === currentStep;

            return (
              <div key={s.number} className="text-center space-y-1">
                <div
                  className={`h-8 w-8 mx-auto rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-teal-500 text-slate-950'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="text-[9px] font-semibold text-slate-400 hidden sm:block truncate">
                  {s.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step 1: Practice Profile */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="text-xl font-black text-white">Step 1 — Your Practice</h2>
              <p className="text-xs text-slate-400 mt-1">Configure practice structure, legal name, and primary service location.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setPracticeType('solo')}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                  practiceType === 'solo'
                    ? 'border-teal-400 bg-teal-500/10 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}
              >
                <div className="font-extrabold text-sm text-white mb-1">Solo Private Practice</div>
                <div className="text-xs text-slate-400">Independent practitioner, self-employed solo clinician</div>
              </button>

              <button
                type="button"
                onClick={() => setPracticeType('group')}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                  practiceType === 'group'
                    ? 'border-indigo-400 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}
              >
                <div className="font-extrabold text-sm text-white mb-1">Group Practice</div>
                <div className="text-xs text-slate-400">Multiple therapists, supervisors, associates, shared payroll</div>
              </button>
            </div>

            <div className="space-y-3 text-xs pt-2">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Legal / Practice Name</label>
                <input
                  type="text"
                  value={practiceName}
                  onChange={(e) => setPracticeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">City</label>
                  <input
                    type="text"
                    value={primaryCity}
                    onChange={(e) => setPrimaryCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">State</label>
                  <input
                    type="text"
                    value={practiceState}
                    onChange={(e) => setPracticeState(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Team */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="text-xl font-black text-white">Step 2 — Your Team</h2>
              <p className="text-xs text-slate-400 mt-1">TheraFlow unifies provider credentials, NPI, and supervisory relationships in one roster.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
              <div className="font-bold text-white flex items-center justify-between">
                <span>Default Practice Providers Enrolled:</span>
                <span className="text-teal-400 font-mono">4 Clinicians</span>
              </div>
              <div className="space-y-2 text-slate-300 font-mono text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>Dr. Sarah Chen, MD (Practice Owner &amp; Psychiatrist)</span>
                  <span className="text-teal-400 font-bold">W-2</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>Marcus Vance, LCSW (Licensed Clinical Social Worker)</span>
                  <span className="text-teal-400 font-bold">W-2</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>Elena Rostova, AMFT (Associate MFT • Supervised by Dr. Chen)</span>
                  <span className="text-amber-400 font-bold">W-2</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span>Dr. Trupti Patel, PsyD (Supervising Psychologist)</span>
                  <span className="text-indigo-400 font-bold">1099</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Compensation */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="text-xl font-black text-white">Step 3 — How Clinicians Are Paid</h2>
              <p className="text-xs text-slate-400 mt-1">Select your group practice compensation model. TheraFlow derives earnings automatically from completed visits.</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-slate-900 border border-teal-500/40 text-xs space-y-1">
                <span className="font-bold text-teal-400 block text-sm">Tiered Percentage Split (Recommended)</span>
                <p className="text-slate-300">50% base split, increasing to 55% after 20 sessions, and 60% after 30 sessions in a pay period. Plus $10 documentation promptness bonus.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                <span className="font-bold text-white block text-sm">CPT-Specific Fixed Rate</span>
                <p className="text-slate-400">$85 for 60m (90837), $70 for 45m (90834), $95 for couples (90847). Simple and predictable.</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Clinical Services */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="text-xl font-black text-white">Step 4 — Clinical Services &amp; CPT Codes</h2>
              <p className="text-xs text-slate-400 mt-1">TheraFlow pre-configures behavioral health CPT codes and psychiatric templates.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>CPT 90837 (Indiv 60m)</span>
                <Check className="h-4 w-4 text-teal-400" />
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>CPT 90834 (Indiv 45m)</span>
                <Check className="h-4 w-4 text-teal-400" />
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>CPT 90847 (Couples/Family)</span>
                <Check className="h-4 w-4 text-teal-400" />
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span>CPT 90791 (Intake Eval)</span>
                <Check className="h-4 w-4 text-teal-400" />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Billing */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="text-xl font-black text-white">Step 5 — Billing Model</h2>
              <p className="text-xs text-slate-400 mt-1">TheraFlow handles both insurance claims (CMS-1500 / 837P) and private-pay card charges.</p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 text-xs space-y-2">
              <span className="font-extrabold text-indigo-300 block text-sm">Hybrid Insurance &amp; Cash Practice Enabled</span>
              <p className="text-slate-300 leading-relaxed">
                TheraFlow auto-populates CMS-1500 claims from signed clinical notes and processes patient card payments on file.
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Payroll */}
        {currentStep === 6 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="text-xl font-black text-white">Step 6 — Payroll Provider Orchestration</h2>
              <p className="text-xs text-slate-400 mt-1">Connect your regulated payroll provider. TheraFlow calculates healthcare earnings and orchestrates direct deposits.</p>
            </div>

            <div className="space-y-3 text-xs">
              <label
                onClick={() => setProviderType('sandbox')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  providerType === 'sandbox'
                    ? 'border-teal-400 bg-teal-500/10 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <div>
                  <span className="font-bold text-white block">TheraFlow Embedded Payroll Sandbox (Simulator)</span>
                  <span className="text-[11px] text-slate-400">Zero-credential evaluation mode with synthetic direct deposits</span>
                </div>
                {providerType === 'sandbox' && <Check className="h-4 w-4 text-teal-400" />}
              </label>

              <label
                onClick={() => setProviderType('gusto')}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  providerType === 'gusto'
                    ? 'border-indigo-400 bg-indigo-500/10 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <div>
                  <span className="font-bold text-white block">Gusto Embedded Payroll (API v2)</span>
                  <span className="text-[11px] text-slate-400">Automated payroll tax filing, direct deposit, and W-2/1099</span>
                </div>
                {providerType === 'gusto' && <Check className="h-4 w-4 text-indigo-400" />}
              </label>
            </div>
          </div>
        )}

        {/* Step 7: Business Banking */}
        {currentStep === 7 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h2 className="text-xl font-black text-white">Step 7 — Business Banking &amp; Tax Vault</h2>
              <p className="text-xs text-slate-400 mt-1">Your practice operating checking account lives directly in TheraFlow with 25% automated tax set-asides.</p>
            </div>

            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-teal-400" />
                <span className="font-bold text-teal-300">TheraFlow Treasury Checking Account</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                FDIC-insured business account enabled. Insurance reimbursements and card deposits match automatically to claims and clinician paychecks.
              </p>
            </div>
          </div>
        )}

        {/* Step 8: Final Summary */}
        {currentStep === 8 && (
          <div className="space-y-4 text-center py-4 animate-in fade-in">
            <div className="h-16 w-16 mx-auto rounded-3xl bg-gradient-to-tr from-teal-400 to-indigo-500 flex items-center justify-center text-slate-950 font-black shadow-2xl">
              <CheckCircle2 className="h-8 w-8 text-slate-950" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Your Practice Is Ready</h2>
              <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                You never need to assemble separate subscriptions for SimplePractice, Gusto, separate billing services, and spreadsheets again.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 text-left max-w-md mx-auto space-y-1">
              <div>✓ Practice: {practiceName} ({practiceState})</div>
              <div>✓ Team: 4 Clinicians enrolled with NPI &amp; Licenses</div>
              <div>✓ Compensation: Tiered Collections (50% - 60%)</div>
              <div>✓ Payroll: {providerType.toUpperCase()} Provider Connected</div>
              <div>✓ Banking: Operating Checking &amp; Tax Vault Ready</div>
            </div>

            <button
              onClick={handleFinish}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-300 hover:to-teal-400 text-slate-950 font-extrabold text-sm shadow-xl transition-all cursor-pointer inline-flex items-center gap-2"
            >
              Enter Practice Command Center
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        {currentStep < 8 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-5">
            <button
              type="button"
              disabled={currentStep === 1}
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                currentStep === 1
                  ? 'opacity-30 cursor-not-allowed text-slate-600'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(8, prev + 1))}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Continue to Step {currentStep + 1}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="text-center text-[10px] text-slate-500">
        TheraFlow OS • Practice Operating System Architecture • Evaluation Sandbox Mode
      </div>
    </div>
  );
};

export default OnboardingWizard;
