import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Download,
  Eye,
  EyeOff,
  Filter,
  FileCode,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { ScrubResult, PhiEntity } from './types';

interface AuditTableProps {
  scrubResult: ScrubResult;
}

export const AuditTable: React.FC<AuditTableProps> = ({ scrubResult }) => {
  const { metrics, entities } = scrubResult;
  const [filterRisk, setFilterRisk] = useState<'all' | 'Direct' | 'Indirect'>('all');
  const [revealValues, setRevealValues] = useState<Record<string, boolean>>({});

  const filteredEntities = entities.filter((ent) => {
    if (filterRisk === 'all') return true;
    return ent.riskTier === filterRisk;
  });

  const toggleReveal = (id: string) => {
    setRevealValues((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleExportJson = () => {
    const payload = {
      exportTimestamp: new Date().toISOString(),
      standard: 'HIPAA 45 CFR § 164.514(b)(2) Safe Harbor',
      metrics,
      entities,
      cleanText: scrubResult.cleanText,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phi-forensic-audit-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ['Index', 'RuleNumber', 'Category', 'Tag', 'DetectedValue', 'StartOffset', 'EndOffset', 'Confidence', 'RiskTier'];
    const rows = entities.map((ent, idx) => [
      idx + 1,
      ent.ruleNumber,
      `"${ent.category}"`,
      ent.tag,
      `"${ent.originalValue.replace(/"/g, '""')}"`,
      ent.start,
      ent.end,
      `${Math.round(ent.confidence * 100)}%`,
      ent.riskTier,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `phi-forensic-audit-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const categoriesRatio = `${metrics.categoriesTriggeredCount} / 18`;
  const categoriesPercent = Math.round((metrics.categoriesTriggeredCount / 18) * 100);

  return (
    <div className="space-y-6">
      {/* 4 Forensic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Entities */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total ePHI Detected</span>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {metrics.totalEntities}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics.directIdentifiersCount} Direct • {metrics.quasiIdentifiersCount} Indirect
          </p>
        </div>

        {/* Metric 2: Categories Triggered */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Safe Harbor Rules</span>
            <span className="text-xs font-mono font-bold text-indigo-600">{categoriesRatio}</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {metrics.categoriesTriggeredCount} <span className="text-xs text-slate-400 font-normal">of 18</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${categoriesPercent}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Risk Severity */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Risk Severity</span>
            {metrics.riskSeverity === 'CRITICAL' ? (
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                metrics.riskSeverity === 'CRITICAL'
                  ? 'bg-rose-100 text-rose-900 border border-rose-300'
                  : metrics.riskSeverity === 'HIGH'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              }`}
            >
              {metrics.riskSeverity}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {metrics.directIdentifiersCount > 0
              ? 'Direct personal identifiers detected'
              : 'Zero direct identifiers'}
          </p>
        </div>

        {/* Metric 4: Compliance Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Compliance Status</span>
            <CheckCircle className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="text-xs font-extrabold px-2 py-1 rounded-md bg-cyan-100 text-cyan-900 border border-cyan-200 inline-block">
            {metrics.complianceStatus}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Processed in {metrics.processingTimeMs} ms • Delta: {metrics.characterDelta} chars
          </p>
        </div>
      </div>

      {/* Forensic Entity Table & Exports */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        {/* Table Controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Filter Risk Tier:</span>
            <button
              type="button"
              onClick={() => setFilterRisk('all')}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                filterRisk === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 font-bold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              All ({entities.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterRisk('Direct')}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                filterRisk === 'Direct'
                  ? 'bg-rose-600 text-white border-rose-600 font-bold'
                  : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
              }`}
            >
              Direct ({metrics.directIdentifiersCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterRisk('Indirect')}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                filterRisk === 'Indirect'
                  ? 'bg-amber-600 text-white border-amber-600 font-bold'
                  : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
              }`}
            >
              Quasi/Indirect ({metrics.quasiIdentifiersCount})
            </button>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="scrubber-export-json-btn"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all"
            >
              <FileCode className="h-3.5 w-3.5 text-indigo-600" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              data-testid="scrubber-export-csv-btn"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-teal-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Entity Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table
            data-testid="scrubber-audit-table"
            className="w-full text-left text-xs border-collapse"
          >
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 font-bold">#</th>
                <th className="py-2.5 px-3 font-bold">Statutory Rule</th>
                <th className="py-2.5 px-3 font-bold">Tag</th>
                <th className="py-2.5 px-3 font-bold">Detected Sensitive Value</th>
                <th className="py-2.5 px-3 font-bold">Offsets</th>
                <th className="py-2.5 px-3 font-bold">Confidence</th>
                <th className="py-2.5 px-3 font-bold">Risk Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No matching PHI entities found.
                  </td>
                </tr>
              ) : (
                filteredEntities.map((ent, idx) => {
                  const isRevealed = !!revealValues[ent.id];
                  return (
                    <tr
                      key={ent.id}
                      className="hover:bg-slate-50/80 transition-colors font-mono"
                    >
                      <td className="py-2.5 px-3 font-sans font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="font-semibold text-slate-900">
                          Rule {ent.ruleNumber}: {ent.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-bold text-[11px] border border-cyan-200">
                          {ent.tag}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                            {isRevealed
                              ? ent.originalValue
                              : '•'.repeat(Math.min(ent.originalValue.length, 12))}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleReveal(ent.id)}
                            className="text-slate-400 hover:text-slate-600 p-0.5"
                            title={isRevealed ? 'Hide sensitive value' : 'Reveal sensitive value'}
                          >
                            {isRevealed ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        [{ent.start} – {ent.end}]
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span className="font-bold text-indigo-700">
                          {Math.round(ent.confidence * 100)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ent.riskTier === 'Direct'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {ent.riskTier}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditTable;
