import React, { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Calendar,
  Download,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building,
  DollarSign,
  ArrowUpRight,
  FileSpreadsheet,
} from 'lucide-react';
import { usePracticeOs } from '@/lib/practice-os-context';
import { ClinicianPayrollSummary } from '@/types/practice-os';

export const PayrollView: React.FC = () => {
  const {
    currentPayPeriod,
    clinicianPayrollSummaries,
    payrollRuns,
    selectedPayrollProvider,
    setSelectedPayrollProvider,
    approveAndSubmitPayroll,
    isProcessing,
  } = usePracticeOs();

  const [expandedClinicianId, setExpandedClinicianId] = useState<string | null>(null);
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  const totalGrossPay = clinicianPayrollSummaries.reduce((acc, curr) => acc + curr.grossPay, 0);
  const totalCollections = clinicianPayrollSummaries.reduce((acc, curr) => acc + curr.attributableCollections, 0);
  const employerTaxesEstimate = Math.round(totalGrossPay * 0.0985 * 100) / 100;
  const totalFundingRequired = totalGrossPay + employerTaxesEstimate;

  const handleApprovePayroll = async () => {
    try {
      const result = await approveAndSubmitPayroll(currentPayPeriod.id);
      if (result.success) {
        setSubmissionFeedback(`Payroll approved and submitted! External Batch ID: ${result.batchId}. ACH direct deposit funding initiated.`);
      }
    } catch (err: any) {
      alert(`Payroll submission error: ${err.message}`);
    }
  };

  const handleExportCsv = () => {
    const headers = 'Clinician,Role,Individual_Sessions,Couples,Intakes,Collections_Attributable,Gross_Pay\n';
    const rows = clinicianPayrollSummaries
      .map(
        (c) =>
          `"${c.workerName}","${c.role}",${c.individualSessionsCount},${c.couplesSessionsCount},${c.intakesCount},${c.attributableCollections},${c.grossPay}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theraflow_payroll_${currentPayPeriod.startDate}_to_${currentPayPeriod.endDate}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">TheraFlow Payroll</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Module 3: Healthcare-Specific Payroll Orchestration
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review session-derived clinician earnings, inspect auditable line items, and submit gross payroll to regulated providers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Submission Success Alert */}
      {submissionFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{submissionFeedback}</span>
          </div>
          <button
            onClick={() => setSubmissionFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pay Period Status Banner Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
              {currentPayPeriod.status === 'funded' ? 'Pay Period Closed & Funded' : 'Current Active Pay Period'}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Pay Period: {currentPayPeriod.startDate} — {currentPayPeriod.endDate}
          </h2>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              Direct Deposit Date: <strong className="text-slate-700">{currentPayPeriod.payDate}</strong>
            </span>
            <span>•</span>
            <span>{clinicianPayrollSummaries.length} Clinicians On Payroll</span>
          </div>
        </div>

        {/* Totals & Submit Action */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-right pr-4 border-r border-slate-200 hidden sm:block">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Gross Earnings</div>
            <div className="text-2xl font-black text-slate-900">${totalGrossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-slate-500">From ${totalCollections.toLocaleString()} practice collections</div>
          </div>

          <div className="text-right pr-4 border-r border-slate-200 hidden md:block">
            <div className="text-[10px] text-slate-400 font-bold uppercase">Estimated Employer Taxes</div>
            <div className="text-base font-extrabold text-slate-700">+${employerTaxesEstimate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-[10px] text-slate-400">FICA, FUTA, SUTA (~9.85%)</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold">Provider:</span>
              <select
                value={selectedPayrollProvider}
                onChange={(e) => setSelectedPayrollProvider(e.target.value)}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="sandbox">TheraFlow Embedded Sandbox</option>
                <option value="gusto">Gusto Embedded (API v2)</option>
                <option value="adp">ADP Run Marketplace</option>
                <option value="rippling">Rippling Payroll</option>
                <option value="quickbooks">QuickBooks Payroll</option>
              </select>
            </div>

            <button
              onClick={handleApprovePayroll}
              disabled={isProcessing || currentPayPeriod.status === 'funded'}
              className={`w-full py-2.5 px-5 rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                currentPayPeriod.status === 'funded'
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              {isProcessing
                ? 'Orchestrating Payroll...'
                : currentPayPeriod.status === 'funded'
                ? 'Payroll Already Funded'
                : `Approve & Fund Payroll ($${totalFundingRequired.toFixed(2)})`}
            </button>
          </div>
        </div>
      </div>

      {/* Clinician Payroll Detail Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">Clinician Payroll Review</h3>
            <p className="text-xs text-slate-500">Every dollar derived directly from completed clinical activity.</p>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Click clinician row to inspect auditable line items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Clinician</th>
                <th className="py-3 px-3">Role / Type</th>
                <th className="py-3 px-3 text-center">90837/90834</th>
                <th className="py-3 px-3 text-center">Couples</th>
                <th className="py-3 px-3 text-center">Intakes</th>
                <th className="py-3 px-3 text-center">Late Cancels</th>
                <th className="py-3 px-4 text-right">Collections</th>
                <th className="py-3 px-4 text-right">Gross Pay</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {clinicianPayrollSummaries.map((summary) => {
                const isExpanded = expandedClinicianId === summary.workerId;
                return (
                  <React.Fragment key={summary.workerId}>
                    <tr
                      onClick={() => setExpandedClinicianId(isExpanded ? null : summary.workerId)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isExpanded ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-extrabold text-slate-900 flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-indigo-600" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                        {summary.workerName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
                          {summary.employmentType === 'w2_employee' ? 'W-2' : '1099'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono">{summary.individualSessionsCount}</td>
                      <td className="py-3 px-3 text-center font-mono">{summary.couplesSessionsCount}</td>
                      <td className="py-3 px-3 text-center font-mono">{summary.intakesCount}</td>
                      <td className="py-3 px-3 text-center font-mono">{summary.lateCancellationsCount}</td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600">
                        ${summary.attributableCollections.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-indigo-700 text-sm">
                        ${summary.grossPay.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold text-indigo-600 hover:underline">
                          {isExpanded ? 'Hide Items' : 'Inspect'}
                        </span>
                      </td>
                    </tr>

                    {/* Drill-down of auditable line items */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="p-4 bg-slate-50/70 border-y border-slate-200">
                          <div className="space-y-2">
                            <div className="font-extrabold text-xs text-slate-800 flex items-center justify-between">
                              <span>Encounter Line Items for {summary.workerName}</span>
                              <span className="text-[11px] font-normal text-slate-500">
                                {summary.lineItems.length} billable events in pay period
                              </span>
                            </div>

                            {summary.lineItems.length > 0 ? (
                              <div className="space-y-1.5 font-mono text-[11px]">
                                {summary.lineItems.map((item) => (
                                  <div
                                    key={item.id}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-900">{item.clientName}</span>
                                      <span className="text-slate-400 mx-2">•</span>
                                      <span className="text-indigo-600 font-semibold">{item.cptCode}</span>
                                      <span className="text-slate-400 mx-2">•</span>
                                      <span className="text-slate-500 text-[10px]">{item.explanation}</span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-black text-emerald-600">+${item.clinicianEarning.toFixed(2)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-slate-400 text-xs italic">No line items accrued yet in this period.</div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Payroll Runs */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900">Historical Settled Payroll Runs</h3>
        <div className="space-y-2 text-xs">
          {payrollRuns.map((run) => (
            <div
              key={run.id}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <div className="font-extrabold text-slate-900">{run.payPeriodLabel}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Batch: {run.externalBatchId || run.externalPayrollBatchId || 'sandbox-batch'} • Provider: {run.provider.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-black text-slate-900 text-sm font-mono">${run.totalGrossPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ACH Settled
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PayrollView;
