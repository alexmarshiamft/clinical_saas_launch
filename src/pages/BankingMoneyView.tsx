import React, { useState } from 'react';
import {
  Landmark,
  ShieldCheck,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CreditCard,
  Building,
  CheckCircle2,
  DollarSign,
  PieChart,
  FileCheck2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { usePracticeOs } from '@/lib/practice-os-context';

export const BankingMoneyView: React.FC = () => {
  const {
    bankAccounts,
    bankTransactions,
    financialSummary,
    reconciliations,
    simulateInsuranceRemittance,
    simulatePrivatePayPayment,
    isProcessing,
  } = usePracticeOs();

  const [activeTab, setActiveTab] = useState<'overview' | 'reconciliation' | 'transactions'>('overview');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSimulateClaim = async () => {
    try {
      const claimId = `claim-${Math.floor(1000 + Math.random() * 9000)}`;
      await simulateInsuranceRemittance(claimId, 160.00, 160.00);
      setFeedback(`ERA Remittance received for ${claimId}. Matched to deposit, 55% clinician share credited to payroll, and 25% allocated to tax vault.`);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    }
  };

  const handleSimulatePrivatePay = async () => {
    try {
      await simulatePrivatePayPayment('Jane Doe', 200.00, '90837');
      setFeedback('Private-pay card charge settled ($200.00). $110.00 credited to therapist open payroll ledger, $90.00 retained by practice.');
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    }
  };

  const operatingAccount = bankAccounts.find((a) => a.accountType === 'operating_checking') || bankAccounts[0];
  const taxAccount = bankAccounts.find((a) => a.accountType === 'tax_reserve');
  const escrowAccount = bankAccounts.find((a) => a.accountType === 'payroll_escrow');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">TheraFlow Money</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
              Module 4: Embedded Business Banking &amp; Financials
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            FDIC-insured business checking, automatic tax set-asides, claim-to-bank deposit matching, and practice unit economics.
          </p>
        </div>

        {/* Demo Action Trigger Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateClaim}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 shadow-xs transition-all cursor-pointer"
          >
            <ArrowDownLeft className="h-4 w-4 text-indigo-600" />
            Simulate ERA Remittance ($160)
          </button>

          <button
            onClick={handleSimulatePrivatePay}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <CreditCard className="h-4 w-4" />
            Simulate Private Pay ($200)
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-teal-700 hover:text-teal-900 font-bold ml-4 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Operating Checking */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white shadow-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-teal-400" />
                <span className="font-bold text-xs text-slate-200">Operating Checking</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-400/20 text-teal-300 border border-teal-400/30">
                FDIC Insured
              </span>
            </div>

            <div className="text-3xl font-black tracking-tight text-white font-mono my-2">
              ${operatingAccount?.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400">
              Available to spend: <strong className="text-slate-200">${operatingAccount?.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Acct {operatingAccount?.accountNumberMasked}</span>
            <span>Routing {operatingAccount?.routingNumberMasked}</span>
          </div>
        </div>

        {/* Automated Tax Vault */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-xs text-slate-800">Automated Tax Vault</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                25% Auto Set-Aside
              </span>
            </div>

            <div className="text-3xl font-black tracking-tight text-slate-900 font-mono my-2">
              ${taxAccount?.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500">
              Estimated Q4 tax liability: <strong className="text-slate-700">$18,400.00</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Automated Federal &amp; State Reserve</span>
            <span className="text-emerald-600 font-bold">100% Funded</span>
          </div>
        </div>

        {/* Payroll Escrow */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-500" />
                <span className="font-bold text-xs text-slate-800">Payroll Escrow</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Next: Oct 20
              </span>
            </div>

            <div className="text-3xl font-black tracking-tight text-slate-900 font-mono my-2">
              ${escrowAccount?.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500">
              Accrued clinician liability: <strong className="text-slate-700">${financialSummary.accruedPayrollLiability.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Direct Deposit Pre-Funding</span>
            <span className="text-emerald-600 font-bold">Solvent (1.7x Coverage)</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Practice Unit Economics
        </button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'reconciliation'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          Claim-to-Bank Reconciliation ({reconciliations.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Bank Transactions Feed ({bankTransactions.length})
        </button>
      </div>

      {/* Tab 1: Practice Unit Economics */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Breakdown */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Monthly Revenue Sources
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block">Insurance Collections</span>
                  <span className="text-[11px] text-slate-400">Aetna, Blue Shield, Cigna, Medicare</span>
                </div>
                <span className="font-black text-slate-900 font-mono text-sm">
                  ${financialSummary.monthlyRevenueInsurance.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="font-bold text-slate-800 block">Private Pay (Card on File)</span>
                  <span className="text-[11px] text-slate-400">Cash-pay therapy &amp; client copays</span>
                </div>
                <span className="font-black text-slate-900 font-mono text-sm">
                  ${financialSummary.monthlyRevenuePrivatePay.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="font-black text-emerald-900 text-xs">Total Monthly Gross Revenue</span>
                <span className="font-black text-emerald-700 font-mono text-base">
                  ${financialSummary.monthlyTotalRevenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Practice Profit & Loss Waterfall */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-indigo-600" />
              Practice Unit Economics Waterfall
            </h3>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50">
                <span className="font-sans font-semibold text-slate-700">Gross Collections Received</span>
                <span className="font-black text-slate-900">${financialSummary.monthlyTotalRevenue.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 text-amber-900">
                <span className="font-sans font-semibold">(-) Clinician Compensation (Cost of Clinical Care)</span>
                <span className="font-bold">-${financialSummary.monthlyClinicianCompensation.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-950 font-bold">
                <span className="font-sans font-extrabold">(=) Gross Practice Margin ({financialSummary.monthlyGrossMarginPercentage}% Margin)</span>
                <span className="font-black text-base text-indigo-700">${financialSummary.monthlyGrossPracticeMargin.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 text-slate-600">
                <span className="font-sans font-semibold">(-) Practice Overhead &amp; Operating Expenses (Rent, Software)</span>
                <span className="font-bold">-${financialSummary.monthlyOperatingExpenses.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-black text-sm">
                <span className="font-sans">(=) Net Operating Cash Flow (Practice Net Income)</span>
                <span className="text-emerald-700 text-lg">+${financialSummary.monthlyNetCashFlow.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Claim-to-Bank Reconciliation */}
      {activeTab === 'reconciliation' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Claim-to-Bank Auto-Reconciliation</h3>
              <p className="text-xs text-slate-500">Every insurance and card payment matched directly to deposit and split to clinician payroll.</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              Duplicate Protection: Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Claim / Charge</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Payer / Source</th>
                  <th className="py-3 px-3">CPT</th>
                  <th className="py-3 px-4 text-right">Payment</th>
                  <th className="py-3 px-4 text-right">Clinician Share</th>
                  <th className="py-3 px-4 text-right">Practice Retained</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {reconciliations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{rec.claimId}</td>
                    <td className="py-3 px-3 font-semibold">{rec.clientName}</td>
                    <td className="py-3 px-3 text-slate-600">{rec.payerName}</td>
                    <td className="py-3 px-3 font-mono text-indigo-600 font-bold">{rec.cptCode}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ${(rec.payerPayment + rec.patientResponsibility).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                      +${rec.clinicianShare.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                      +${rec.practiceShare.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Deposit Matched
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Bank Transactions Feed */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-3">
          <h3 className="font-extrabold text-sm text-slate-900">Operating Checking Activity</h3>
          <div className="space-y-2 text-xs font-mono">
            {bankTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold ${
                      tx.amount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : '–'}
                  </div>
                  <div>
                    <div className="font-sans font-bold text-slate-900">{tx.description}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(tx.timestamp).toLocaleString()} • Ref: {tx.referenceId}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-black text-sm ${
                      tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                  </div>
                  <div className="text-[10px] text-slate-400">Bal: ${tx.runningBalance.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BankingMoneyView;
