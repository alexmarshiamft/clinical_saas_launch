import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Brain,
  Bot,
  Wand2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  Layers,
  CheckSquare,
  Square,
  BookOpen,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';
import {
  DSM5_DIAGNOSES,
  CLINICAL_SUGGESTION_CHIPS,
  getDiagnosisForPatient,
} from './data/dsm5-database';
import { AuraDictation } from './AuraDictation';
import { TypewriterSoap } from './TypewriterSoap';
import { ClinicalSpecialty } from './types';

export const AuraStudio: React.FC = () => {
  const { activePatient } = useClinicalContext();

  // Active diagnosis resolved from patient ID or fallback
  const activeDiagnosis = useMemo(() => {
    return getDiagnosisForPatient(activePatient.id);
  }, [activePatient.id]);

  // Checklist state for active criteria
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>({});
  const [specialty, setSpecialty] = useState<ClinicalSpecialty>('cbt');
  const [narrativeText, setNarrativeText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [soapSeed, setSoapSeed] = useState<string>('');

  // Re-initialize criteria checks when patient or diagnosis changes
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    activeDiagnosis.criteria.forEach((crit) => {
      initial[crit.id] = crit.defaultChecked ?? false;
    });
    setCheckedCriteria(initial);
  }, [activeDiagnosis]);

  const toggleCriterion = (id: string) => {
    setCheckedCriteria((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const metCount = Object.values(checkedCriteria).filter(Boolean).length;
  const totalCount = activeDiagnosis.criteria.length;
  const isThresholdMet = metCount >= activeDiagnosis.requiredCount;
  const percentage = Math.round((metCount / totalCount) * 100);

  const handleChipClick = (textToInsert: string) => {
    setNarrativeText((prev) => (prev ? `${prev}\n\n${textToInsert}` : textToInsert));
  };

  const handleFormatSoap = (text: string) => {
    setSoapSeed(text);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Aura Assistant Studio</h2>
              <p className="text-xs text-slate-500">In-Workflow Clinical Copilot &amp; Typewriter SOAP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value as ClinicalSpecialty)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="general">General Psychotherapy</option>
              <option value="cbt">Cognitive Behavioral (CBT)</option>
              <option value="trauma">Trauma / EMDR</option>
              <option value="couples">Couples &amp; Family</option>
              <option value="child">Child &amp; Adolescent</option>
            </select>
            <span
              data-testid="aura-copilot-standby-badge"
              className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200"
            >
              Copilot Standby
            </span>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Clinical decision support, instant DSM-5 differential criteria search, audio dictation capture, and streaming typewriter note synthesis.
        </p>

        {/* E2E Test Invariant Block: Diagnostic Differential Assistant */}
        <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-2">
              <Brain className="h-4 w-4" /> Diagnostic Differential Assistant: {activePatient.name}
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              CPT: {activePatient.cptCode}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Aura continuously monitors patient narratives for DSM-5 symptom markers and suggests clinical interventions, ICD-10 diagnostic codes, and tailored treatment modifications in real time.
          </p>
        </div>
      </div>

      {/* Main Studio Dual-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Diagnostic Decision Support & DSM-5 Engine (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Suggestion Chips */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-indigo-600" />
                Clinical Prompt Suggestions &amp; Screening
              </span>
              <span className="text-[11px] text-slate-400">Click to insert</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CLINICAL_SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleChipClick(chip.textToInsert)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-900 border border-indigo-200/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Real-Time DSM-5 Criteria Checklist Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono">
                    ICD-10: {activeDiagnosis.code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    {activeDiagnosis.name}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {activeDiagnosis.thresholdText}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    isThresholdMet
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {metCount} / {totalCount} Met ({percentage}%)
                </span>
              </div>
            </div>

            {/* Diagnostic Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isThresholdMet ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Criteria Checklist */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                DSM-5 Symptom Criteria Checklist:
              </span>
              <div className="space-y-2">
                {activeDiagnosis.criteria.map((crit) => {
                  const isChecked = !!checkedCriteria[crit.id];
                  return (
                    <div
                      key={crit.id}
                      onClick={() => toggleCriterion(crit.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-colors ${
                        isChecked
                          ? 'bg-indigo-50/50 border-indigo-200 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold text-slate-900 mr-1.5 font-mono text-[11px]">
                          [{crit.code}]
                        </span>
                        <span>{crit.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Evidence-Based Interventions List */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-teal-600" />
                Recommended Clinical Interventions (CBT &amp; Evidence-Based)
              </span>
              <ul className="space-y-1.5 text-xs text-slate-600">
                {activeDiagnosis.evidenceInterventions.map((intervention, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">•</span>
                    <span>{intervention}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Panel: Dictation Studio & Typewriter SOAP Note (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                Live Audio Dictation &amp; Note Capture
              </h3>
              <p className="text-[11px] text-slate-500">
                Capture voice narrative or load clinical scenarios
              </p>
            </div>

            <AuraDictation
              text={narrativeText}
              onTextChange={setNarrativeText}
              onFormatSoap={handleFormatSoap}
              isRecording={isRecording}
              onRecordingChange={setIsRecording}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <TypewriterSoap
              sourceNarrative={soapSeed || narrativeText}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuraStudio;
