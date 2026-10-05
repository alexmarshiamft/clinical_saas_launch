/**
 * Feature 12: Statutory HIPAA Immutable Audit Log Viewer (45 CFR §164.312(b))
 * Cryptographically sealed tamper-evident audit trail with SHA-256 chain verification,
 * action filters, patient search, and CSV/JSON export.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileCode,
  Lock,
  Calendar,
  CheckCircle2,
  AlertOctagon,
  Eye,
  X,
  ExternalLink,
} from 'lucide-react';
import { getAuditLogs, subscribeToTheraFlowStore } from './data/theraflow-store';
import { AuditLogEntry, AuditAction } from './types';
import { verifyAuditChain } from '@/lib/audit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadLogs = async () => {
    const list = await getAuditLogs();
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
    const unsub = subscribeToTheraFlowStore(() => {
      loadLogs();
    });
    return unsub;
  }, []);

  // Verify cryptographic integrity of the entire chain
  const isChainVerified = useMemo(() => {
    return verifyAuditChain(logs);
  }, [logs]);

  // Compute Compliance Summary Metrics
  const metrics = useMemo(() => {
    const uniquePatients = new Set(
      logs.filter((l) => l.patientMrn && l.patientMrn !== 'SYSTEM').map((l) => l.patientMrn)
    ).size;
    const telehealthCount = logs.filter((l) => l.action === 'TELEHEALTH_SESSION').length;
    const superbillCount = logs.filter((l) => l.action === 'EXPORT_SUPERBILL').length;

    return {
      totalEvents: logs.length,
      uniquePatients,
      telehealthCount,
      superbillCount,
    };
  }, [logs]);

  // Filter logs based on search and action
  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      const matchesAction = selectedAction === 'ALL' || entry.action === selectedAction;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        entry.actor.toLowerCase().includes(q) ||
        entry.patientMrn.toLowerCase().includes(q) ||
        (entry.patientName && entry.patientName.toLowerCase().includes(q)) ||
        entry.action.toLowerCase().includes(q) ||
        entry.ipAddress.includes(q) ||
        entry.hash.toLowerCase().includes(q);

      return matchesAction && matchesSearch;
    });
  }, [logs, selectedAction, searchQuery]);

  const handleExportCsv = () => {
    const headers = [
      'ID',
      'Timestamp (UTC)',
      'Actor Email',
      'Actor Name',
      'Action',
      'Patient MRN',
      'Patient Name',
      'Resource Type',
      'IP Address',
      'SHA-256 Hash',
      'Previous Hash',
    ];

    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      l.actor,
      `"${l.actorName}"`,
      l.action,
      l.patientMrn,
      `"${l.patientName || 'N/A'}"`,
      l.resourceType,
      l.ipAddress,
      l.hash,
      l.prevHash,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hipaa_audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('HIPAA Audit Log exported as CSV.');
  };

  const handleExportJson = () => {
    const manifest = {
      complianceStandard: '45 CFR §164.312(b)',
      cryptographicHash: 'SHA-256',
      chainIntegrityVerified: isChainVerified,
      generatedAt: new Date().toISOString(),
      recordCount: filteredLogs.length,
      logs: filteredLogs,
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hipaa_audit_manifest_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('HIPAA Audit Log Manifest exported as JSON.');
  };

  const getActionBadgeColor = (action: AuditAction) => {
    switch (action) {
      case 'VIEW_EHR':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'UPDATE_NOTE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'TELEHEALTH_SESSION':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'EXPORT_SUPERBILL':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CREATE_CLIENT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'SCRUB_PHI':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'LOGIN':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Verification Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                HIPAA Immutable Audit Trail
              </h2>
              {isChainVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ✓ 100% Cryptographically Verified (SHA-256 Chain)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                  <AlertOctagon className="h-3.5 w-3.5 text-red-600" />
                  Chain Integrity Compromised
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Tamper-evident record of all ePHI access, modifications, telehealth encounters, and superbill exports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJson}
              className="flex items-center gap-1.5"
            >
              <FileCode className="h-3.5 w-3.5 text-indigo-600" />
              Export JSON
            </Button>
          </div>
        </div>

        {/* 4 Metric Summary Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Total Logged Events
            </span>
            <div className="text-xl font-extrabold text-slate-900">{metrics.totalEvents}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Patients (ePHI Access)
            </span>
            <div className="text-xl font-extrabold text-indigo-700">{metrics.uniquePatients}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Telehealth Encounters
            </span>
            <div className="text-xl font-extrabold text-purple-700">{metrics.telehealthCount}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Superbill Claims Exported
            </span>
            <div className="text-xl font-extrabold text-amber-700">{metrics.superbillCount}</div>
          </div>
        </div>

        {/* Regulatory Statutory Notice */}
        <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] text-slate-600 leading-relaxed">
          <strong>Notice:</strong> In accordance with HIPAA Security Rule 45 CFR §164.312(b), audit logs are
          cryptographically sealed, immutable, and retained for 6 years. Records cannot be edited, altered, or deleted.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by MRN (#MC-...), actor, patient name, or IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Action:
          </span>
          {[
            'ALL',
            'VIEW_EHR',
            'UPDATE_NOTE',
            'TELEHEALTH_SESSION',
            'EXPORT_SUPERBILL',
            'CREATE_CLIENT',
            'LOGIN',
          ].map((act) => (
            <button
              key={act}
              onClick={() => setSelectedAction(act)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedAction === act
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {act.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Patient MRN</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">SHA-256 Hash</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No audit records match your query.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-700 text-[11px]">
                      {log.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.actorName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.actor}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-slate-800">{log.patientMrn}</div>
                      {log.patientName && (
                        <div className="text-[10px] text-slate-500">{log.patientName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {log.ipAddress}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {log.hash.slice(0, 12)}...
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setSelectedEntry(log);
                          setIsDetailOpen(true);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entry Inspection Modal */}
      {selectedEntry && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-indigo-600" />
                Audit Trail Record Inspection
              </DialogTitle>
              <DialogDescription>
                Cryptographic forensic verification record for event ID: {selectedEntry.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs my-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 font-mono">
                <div>
                  <span className="text-slate-400">Timestamp:</span> {selectedEntry.timestamp}
                </div>
                <div>
                  <span className="text-slate-400">Actor:</span> {selectedEntry.actor} (
                  {selectedEntry.actorName})
                </div>
                <div>
                  <span className="text-slate-400">Action:</span> {selectedEntry.action}
                </div>
                <div>
                  <span className="text-slate-400">Target MRN:</span> {selectedEntry.patientMrn}
                </div>
                <div>
                  <span className="text-slate-400">Resource:</span> {selectedEntry.resourceType} (
                  {selectedEntry.resourceId || 'N/A'})
                </div>
                <div>
                  <span className="text-slate-400">IP Address:</span> {selectedEntry.ipAddress}
                </div>
              </div>

              <div>
                <Label>Record Hash Chain:</Label>
                <div className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[10px] break-all space-y-1">
                  <div>
                    <span className="text-slate-400">Previous Hash:</span>
                    <br />
                    {selectedEntry.prevHash}
                  </div>
                  <div className="pt-1 border-t border-slate-800">
                    <span className="text-emerald-400">Current Record Hash:</span>
                    <br />
                    {selectedEntry.hash}
                  </div>
                </div>
              </div>

              <div>
                <Label>Raw Metadata Payload:</Label>
                <pre className="p-2.5 bg-slate-100 rounded-lg font-mono text-[11px] text-slate-800 overflow-x-auto border border-slate-200">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AuditLogsView;
