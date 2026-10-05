import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  FileCheck,
  Tag,
  Shield,
  Layers,
} from 'lucide-react';
import { ICD10Code, CPTProcedureCode, CodeSuggestion } from './types';
import { STATUTORY_ICD10_DATABASE, STATUTORY_CPT_DATABASE } from './data/codingData';
import { matchDiagnosticCodes, recommendCptCode } from './utils/codeSuggestionEngine';
import { generateMedicalNecessityBlock } from './utils/medicalNecessityBuilder';
import { useClinicalContext } from '@/lib/clinical-context';

export interface BillingCodingAssistantProps {
  transcript?: string;
  onCodeAccepted?: (cptCode: string, icdCode: string) => void;
}

export const BillingCodingAssistant: React.FC<BillingCodingAssistantProps> = ({
  transcript = '',
  onCodeAccepted,
}) => {
  const { activePatient, activeEncounterNotes, setActivePatient, updateNoteField } =
    useClinicalContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIcd, setSelectedIcd] = useState<ICD10Code>(() => {
    return (
      STATUTORY_ICD10_DATABASE.find((c) => c.code === 'F41.1') ||
      STATUTORY_ICD10_DATABASE[0]
    );
  });
  const [selectedCpt, setSelectedCpt] = useState<CPTProcedureCode>(() => {
    return (
      STATUTORY_CPT_DATABASE.find((c) => c.code === activePatient.cptCode) ||
      STATUTORY_CPT_DATABASE.find((c) => c.code === '90837') ||
      STATUTORY_CPT_DATABASE[0]
    );
  });
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(60);
  const [syncedBanner, setSyncedBanner] = useState<string | null>(null);

  // Compute live diagnostic suggestions
  const suggestions: CodeSuggestion[] = matchDiagnosticCodes(
    transcript || activeEncounterNotes.rawTranscript,
    activeEncounterNotes.assessment,
    activeEncounterNotes.subjective
  );

  const filteredIcds = STATUTORY_ICD10_DATABASE.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.code.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term) ||
      c.keywords.some((k) => k.toLowerCase().includes(term))
    );
  });

  const handleAcceptAndSync = () => {
    // 1. Update active patient CPT code
    setActivePatient({
      ...activePatient,
      cptCode: selectedCpt.code,
      cptDesc: selectedCpt.type,
    });

    // 2. Generate and append medical necessity statement
    const justification = generateMedicalNecessityBlock({
      patientName: activePatient.name,
      patientMrn: activePatient.mrn,
      encounterDuration: sessionDurationMinutes,
      cptCode: selectedCpt,
      primaryIcd: selectedIcd,
      interventions: [
        'Cognitive Behavioral Therapy (CBT) restructuring',
        'Progressive muscle relaxation and autonomic grounding',
        'Relapse prevention and crisis safety planning',
      ],
      complexity: selectedCpt.mdmComplexity,
      clinicianName: 'Dr. Sarah Chen, MD',
    });

    updateNoteField('assessment', `${activeEncounterNotes.assessment}\n\n${justification}`);

    if (onCodeAccepted) {
      onCodeAccepted(selectedCpt.code, selectedIcd.code);
    }

    setSyncedBanner(
      `✓ Successfully synced CPT ${selectedCpt.code} (${selectedCpt.type}) and ICD-10 ${selectedIcd.code} with ${activePatient.name} (#MC-88219)`
    );
    setTimeout(() => setSyncedBanner(null), 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-6 shadow-md">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100">
              Scribe Billing &amp; Coding Assistant
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Reconcile clinical diagnoses with CPT psychotherapy and E/M procedure codes with audit-proof CMS justification.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAcceptAndSync}
          className="scribe-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm shadow-emerald-900/30 transition-all cursor-pointer"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Accept &amp; Sync to Billing Chart</span>
        </button>
      </div>

      {/* Sync Banner */}
      {syncedBanner && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2.5">
          <FileCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{syncedBanner}</span>
        </div>
      )}

      {/* Suggested Codes Carousel / High Confidence Picks */}
      {suggestions.length > 0 && (
        <div className="bg-purple-950/30 border border-purple-800/60 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>AI Real-Time Suggested Diagnoses (from live dialogue):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s.code.code}
                type="button"
                onClick={() => setSelectedIcd(s.code)}
                className={`p-2 rounded-lg border text-xs text-left transition-all cursor-pointer ${
                  selectedIcd.code === s.code.code
                    ? 'bg-purple-900 border-purple-400 text-white'
                    : 'bg-slate-950 border-purple-900/60 text-purple-200 hover:border-purple-600'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="font-mono text-amber-300">{s.code.code}</span>
                  <span className="text-[10px] px-1 rounded bg-purple-950 text-purple-300 font-mono">
                    {s.confidence}% match
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-1">{s.code.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dual Column Layout: ICD-10 Search on Left, CPT Procedure on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: ICD-10 Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-amber-400" />
              <span>Primary Diagnostic Codes (ICD-10-CM)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Selected: <strong className="text-amber-300">{selectedIcd.code}</strong>
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search diagnosis by keyword or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="scribe-input pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 w-full"
            />
          </div>

          {/* ICD-10 List */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
            {filteredIcds.map((icd) => {
              const isSelected = icd.code === selectedIcd.code;
              return (
                <div
                  key={icd.code}
                  onClick={() => setSelectedIcd(icd)}
                  className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-950/60 border-purple-500 text-purple-100'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-amber-400">{icd.code}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                      {icd.category}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-200">{icd.description}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <span>Keywords:</span>
                    <span className="text-slate-500 italic">
                      {icd.keywords.slice(0, 4).join(', ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: CPT Procedure Code Selection & Duration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span>CPT Procedure &amp; Service Level</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Active: <strong className="text-cyan-300">CPT {selectedCpt.code}</strong>
            </span>
          </div>

          {/* Duration Selector Slider */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Encounter Duration:</span>
              <span className="font-mono text-cyan-400 font-bold">
                {sessionDurationMinutes} Minutes
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={90}
              step={5}
              value={sessionDurationMinutes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setSessionDurationMinutes(val);
                const rec = recommendCptCode(val);
                setSelectedCpt(rec);
              }}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>15m (Brief)</span>
              <span>30m (90832)</span>
              <span>45m (90834)</span>
              <span>60m (90837)</span>
              <span>90m+ (Intake)</span>
            </div>
          </div>

          {/* CPT Codes List */}
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700">
            {STATUTORY_CPT_DATABASE.map((cpt) => {
              const isSelected = cpt.code === selectedCpt.code;
              return (
                <div
                  key={cpt.code}
                  onClick={() => setSelectedCpt(cpt)}
                  className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-950/60 border-purple-500 text-purple-100'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-cyan-400">CPT {cpt.code}</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      {cpt.reimbursementAvg}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-200">{cpt.type}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Standard: {cpt.timeRange}</span>
                    <span className="text-purple-300 font-semibold">MDM: {cpt.mdmComplexity}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingCodingAssistant;
