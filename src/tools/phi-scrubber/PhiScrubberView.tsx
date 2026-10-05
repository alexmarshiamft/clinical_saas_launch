import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  FileSearch,
  Sparkles,
  Database,
  ArrowRight,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';
import { scrubText } from './engine';
import { DiffViewer } from './DiffViewer';
import { AuditTable } from './AuditTable';
import {
  getActivePatientSample,
  PRESET_FULL_18,
  PRESET_INTAKE_NOTE,
  PRESET_TELEHEALTH_TELEMETRY,
} from './sampleTexts';
import { StatutoryMaskMode } from './types';

export const PhiScrubberView: React.FC = () => {
  const { activePatient, scrubberInputText, clearScrubberInput, insertToEhr } = useClinicalContext();

  const [maskStyle, setMaskStyle] = useState<StatutoryMaskMode>('tag');
  const [selectedPreset, setSelectedPreset] = useState<string>('active_patient');
  const [activeTab, setActiveTab] = useState<'diff' | 'audit' | 'all'>('diff');
  const [insertedToEhr, setInsertedToEhr] = useState(false);

  // Initialize text: prefer scrubberInputText from clinical pipeline if present, else active patient sample
  const [currentText, setCurrentText] = useState<string>(() => {
    if (scrubberInputText && scrubberInputText.trim().length > 0) {
      return scrubberInputText;
    }
    return getActivePatientSample(activePatient);
  });

  // When activePatient changes or scrubberInputText arrives, update text
  useEffect(() => {
    if (scrubberInputText && scrubberInputText.trim().length > 0) {
      setCurrentText(scrubberInputText);
      setSelectedPreset('pipeline_import');
    } else {
      setCurrentText(getActivePatientSample(activePatient));
      setSelectedPreset('active_patient');
    }
  }, [activePatient, scrubberInputText]);

  const handleSelectPreset = (key: string) => {
    setSelectedPreset(key);
    switch (key) {
      case 'active_patient':
        setCurrentText(getActivePatientSample(activePatient));
        break;
      case 'full_18':
        setCurrentText(PRESET_FULL_18);
        break;
      case 'intake':
        setCurrentText(PRESET_INTAKE_NOTE);
        break;
      case 'telehealth':
        setCurrentText(PRESET_TELEHEALTH_TELEMETRY);
        break;
      default:
        break;
    }
  };

  const handleReset = () => {
    if (clearScrubberInput) clearScrubberInput();
    setCurrentText(getActivePatientSample(activePatient));
    setSelectedPreset('active_patient');
  };

  // Perform Safe Harbor De-identification
  const scrubResult = useMemo(() => {
    return scrubText(currentText, {
      maskStyle,
      customPatientContext: {
        name: activePatient.name,
        dob: activePatient.dob,
        mrn: activePatient.mrn,
        phone: '(415) 555-0199',
      },
    });
  }, [currentText, maskStyle, activePatient]);

  const handleExportToEhr = () => {
    insertToEhr(scrubResult.cleanText);
    setInsertedToEhr(true);
    setTimeout(() => setInsertedToEhr(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card Preserving Exact Invariant Strings */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">HIPAA PHI Scrubber</h2>
              <p className="text-xs text-slate-500">18 Safe Harbor Statutory De-identification Engine</p>
            </div>
          </div>
          <span
            data-testid="scrubber-active-badge"
            className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200"
          >
            18 Safe Harbor Active
          </span>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Strict HIPAA Safe Harbor redaction removing all 18 statutory identifiers before external sharing. Includes side-by-side redacted diff viewer and forensic redaction audit logging.
        </p>

        {/* Narrative Preset Switcher Bar */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-slate-700">Source Presets:</span>
            <button
              type="button"
              onClick={() => handleSelectPreset('active_patient')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedPreset === 'active_patient'
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Active Patient Encounter ({activePatient.name})
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('full_18')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedPreset === 'full_18'
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All 18 Safe Harbor Categories
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('intake')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedPreset === 'intake'
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Outpatient Psychiatric Intake
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('telehealth')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedPreset === 'telehealth'
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-900 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Telehealth RPM Telemetry
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportToEhr}
              data-testid="scrubber-commit-ehr-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all"
            >
              <Database className="h-3.5 w-3.5" />
              <span>{insertedToEhr ? 'Exported to EHR! ✓' : 'Commit Clean to EHR'}</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              title="Reset to active patient default"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Workspace Tabs: Diff Viewer vs Forensic Audit Trail */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('diff')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'diff'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Synchronized Diff Viewer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSearch className="h-4 w-4" />
          <span>Forensic Audit Dashboard</span>
          <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded-full">
            {scrubResult.itemsRedacted}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Combined Overview</span>
        </button>
      </div>

      {/* Tab Panels */}
      {(activeTab === 'diff' || activeTab === 'all') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <DiffViewer
            scrubResult={scrubResult}
            maskStyle={maskStyle}
            onMaskStyleChange={setMaskStyle}
          />
        </div>
      )}

      {(activeTab === 'audit' || activeTab === 'all') && (
        <div>
          <AuditTable scrubResult={scrubResult} />
        </div>
      )}
    </div>
  );
};

export default PhiScrubberView;
