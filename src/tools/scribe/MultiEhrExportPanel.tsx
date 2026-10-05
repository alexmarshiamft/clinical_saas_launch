import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  Database,
  ShieldAlert,
  FileText,
  Code2,
} from 'lucide-react';
import { EhrExportFormat, EhrExportData } from './types';
import {
  formatEpicSmartText,
  formatEpicFhirDocument,
  formatCernerPowerChart,
  formatAthenaEncounter,
  formatMarkdownUniversal,
} from './utils/ehrExportAdapters';
import { useClinicalContext } from '@/lib/clinical-context';

export interface MultiEhrExportPanelProps {
  onSendToEhr?: (text: string) => void;
  onSendToPhiScrubber?: (text: string) => void;
}

export const MultiEhrExportPanel: React.FC<MultiEhrExportPanelProps> = ({
  onSendToEhr,
  onSendToPhiScrubber,
}) => {
  const { activePatient, activeEncounterNotes, insertToEhr, sendToPhiScrubber } =
    useClinicalContext();

  const [selectedFormat, setSelectedFormat] = useState<EhrExportFormat>('epic-smarttext');
  const [copied, setCopied] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const exportData: EhrExportData = {
    patient: {
      name: activePatient.name,
      mrn: activePatient.mrn,
      dob: activePatient.dob,
      id: activePatient.id,
      cptCode: activePatient.cptCode,
    },
    clinician: {
      name: 'Dr. Sarah Chen, MD',
      npi: '1982730192',
      specialty: 'Behavioral Health & Psychiatry',
    },
    notes: {
      subjective: activeEncounterNotes.subjective,
      objective: activeEncounterNotes.objective,
      assessment: activeEncounterNotes.assessment,
      plan: activeEncounterNotes.plan,
      rawTranscript: activeEncounterNotes.rawTranscript,
    },
    primaryIcd: 'F41.1 (Generalized Anxiety Disorder)',
  };

  const getFormattedContent = (): string => {
    switch (selectedFormat) {
      case 'epic-smarttext':
        return formatEpicSmartText(exportData);
      case 'epic-fhir':
        return formatEpicFhirDocument(exportData);
      case 'cerner-powerchart':
        return formatCernerPowerChart(exportData);
      case 'athena-xml':
        return formatAthenaEncounter(exportData);
      case 'universal-markdown':
      default:
        return formatMarkdownUniversal(exportData);
    }
  };

  const formattedContent = getFormattedContent();

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(formattedContent).catch(() => {});
    }
    setCopied(true);
    setFeedback('✓ Export syntax copied to clipboard with exact health-system formatting.');
    setTimeout(() => {
      setCopied(false);
      setFeedback(null);
    }, 3000);
  };

  const handleDownload = () => {
    const ext =
      selectedFormat === 'epic-fhir'
        ? 'json'
        : selectedFormat === 'athena-xml'
        ? 'xml'
        : selectedFormat === 'universal-markdown'
        ? 'md'
        : 'txt';

    const blob = new Blob([formattedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Clinical_Note_${activePatient.mrn}_${selectedFormat}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePushEhr = () => {
    if (onSendToEhr) {
      onSendToEhr(formattedContent);
    } else {
      insertToEhr(formattedContent);
    }
    setFeedback(`✓ Committed export into TheraFlow EHR chart for ${activePatient.name}`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handlePushScrubber = () => {
    if (onSendToPhiScrubber) {
      onSendToPhiScrubber(formattedContent);
    } else {
      sendToPhiScrubber(formattedContent);
    }
    setFeedback(`✓ Dispatched export into HIPAA PHI Scrubber for Safe Harbor redaction.`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const formats: Array<{ id: EhrExportFormat; name: string; standard: string; icon: any }> = [
    {
      id: 'epic-smarttext',
      name: 'Epic Systems',
      standard: 'Dot-Phrase SmartText (.MARSHI_NOTE)',
      icon: FileText,
    },
    {
      id: 'epic-fhir',
      name: 'HL7 FHIR R4',
      standard: 'DocumentReference JSON (LOINC 11506-3)',
      icon: Code2,
    },
    {
      id: 'cerner-powerchart',
      name: 'Oracle / Cerner',
      standard: 'PowerChart Millennium Tagged Text',
      icon: Database,
    },
    {
      id: 'athena-xml',
      name: 'Athenahealth',
      standard: 'AthenaNet Clinical Encounter XML',
      icon: Share2,
    },
    {
      id: 'universal-markdown',
      name: 'Universal Markdown',
      standard: 'Clean Formatted Rich Text / Buffer',
      icon: FileText,
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-6 shadow-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Share2 className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100">
              Scribe Multi-EHR Export Adapters
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Export standardized clinical encounter notes formatted for major Enterprise EHR systems and statutory FHIR R4 interfaces.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="scribe-btn bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm shadow-purple-900/30 transition-all cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Formatted for EHR'}</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="scribe-btn bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-400" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-700 text-purple-200 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Format Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {formats.map((fmt) => {
          const isSelected = selectedFormat === fmt.id;
          const Icon = fmt.icon;
          return (
            <button
              key={fmt.id}
              type="button"
              onClick={() => setSelectedFormat(fmt.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-purple-950/60 border-purple-500 text-purple-100 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5 mb-1 text-purple-400 font-bold text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  <span>{fmt.name}</span>
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-2">{fmt.standard}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Formatted Output Viewer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Formatted EHR Payload:</span>
          <span className="font-mono text-[11px] text-slate-500">
            {formattedContent.length} characters
          </span>
        </div>
        <textarea
          readOnly
          value={formattedContent}
          rows={14}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none selection:bg-purple-600 selection:text-white"
        />
      </div>

      {/* Cross-Tool Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
        <div className="text-xs text-slate-400">
          Push directly into connected clinical workspaces:
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePushScrubber}
            className="scribe-btn bg-cyan-900/40 hover:bg-cyan-900/70 border border-cyan-700 text-cyan-200 font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
            <span>Send to PHI Scrubber</span>
          </button>
          <button
            type="button"
            onClick={handlePushEhr}
            className="scribe-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Database className="h-3.5 w-3.5" />
            <span>Push to TheraFlow EHR</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiEhrExportPanel;
