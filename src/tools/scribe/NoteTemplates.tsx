import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  Send,
  Database,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { ClinicalTemplate, GeneratedNoteResult, ClinicalVariableContext } from './types';
import { getStoredTemplates } from './data/templateStore';
import { generateClinicalNote } from './ai-template-generator';

export interface NoteTemplatesProps {
  transcript: string;
  context: ClinicalVariableContext;
  onSendToEhr?: (noteMarkdown: string) => void;
  onSendToPhiScrubber?: (noteMarkdown: string) => void;
  activePatientCptCode?: string;
}

export const NoteTemplates: React.FC<NoteTemplatesProps> = ({
  transcript,
  context,
  onSendToEhr,
  onSendToPhiScrubber,
  activePatientCptCode = '90837',
}) => {
  const [templates, setTemplates] = useState<ClinicalTemplate[]>(() => getStoredTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('soap');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [noteResult, setNoteResult] = useState<GeneratedNoteResult | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await generateClinicalNote({
        template: activeTemplate,
        transcript,
        context,
      });
      setNoteResult(res);
    } catch (err) {
      console.error('[NoteTemplates] Generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate initial note on template selection
  useEffect(() => {
    handleGenerate();
  }, [selectedTemplateId, transcript]);

  const toggleSection = (secId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  const handleCopyNote = () => {
    if (!noteResult) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(noteResult.fullMarkdown).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePushToEhr = () => {
    if (!noteResult) return;
    if (onSendToEhr) {
      onSendToEhr(noteResult.fullMarkdown);
    }
    setToastMessage(`✓ Committed ${activeTemplate.name} to TheraFlow EHR chart for ${context.patient_name}`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePushToScrubber = () => {
    if (!noteResult) return;
    if (onSendToPhiScrubber) {
      onSendToPhiScrubber(noteResult.fullMarkdown);
    }
    setToastMessage(`✓ Dispatched note into HIPAA PHI Scrubber workspace for de-identification.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-6 shadow-md">
      {/* Template Selection Pills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">
            Select Clinical Note Template:
          </label>
          <span className="text-[11px] font-mono text-purple-400">
            Active Billing Level: CPT {activePatientCptCode}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {templates.map((tpl) => {
            const isSelected = tpl.id === activeTemplate.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-950/60 border-purple-500 text-purple-100 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 line-clamp-1">
                  {tpl.category}
                </div>
                <div className="text-xs font-bold line-clamp-2">{tpl.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action / Pipeline Dispatch Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-200">
            {activeTemplate.name}
          </span>
          {noteResult && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              Engine: {noteResult.engineUsed}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Copy CTA */}
          <button
            type="button"
            onClick={handleCopyNote}
            className="scribe-btn bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied Note' : 'Copy Formatted Note'}</span>
          </button>

          {/* Send to PHI Scrubber Button */}
          <button
            type="button"
            onClick={handlePushToScrubber}
            className="scribe-btn bg-cyan-900/40 hover:bg-cyan-900/70 border border-cyan-700 text-cyan-200 font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            title="Dispatch clinical note to HIPAA PHI Scrubber"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-cyan-400" />
            <span>Send to PHI Scrubber</span>
          </button>

          {/* Commit to TheraFlow EHR Chart Button */}
          <button
            type="button"
            onClick={handlePushToEhr}
            className="scribe-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm shadow-emerald-900/30 transition-all cursor-pointer"
            title="Commit note to TheraFlow EHR patient chart"
          >
            <Database className="h-3.5 w-3.5" />
            <span>Commit to EHR Chart</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-700 text-purple-200 text-xs flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Accordion Note Sections */}
      <div className="space-y-3">
        {activeTemplate.sections.map((section) => {
          const isCollapsed = Boolean(collapsedSections[section.id]);
          const content = noteResult?.sections[section.id] || 'Synthesizing clinical documentation...';

          return (
            <div
              key={section.id}
              className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full px-4 py-3 bg-slate-900/50 hover:bg-slate-900/80 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-purple-400" />
                  )}
                  <span className="font-bold text-xs text-slate-200 tracking-wide uppercase">
                    {section.title}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {isCollapsed ? 'Click to expand' : 'Click to collapse'}
                </span>
              </button>

              {!isCollapsed && (
                <div className="p-4 border-t border-slate-800 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans select-text bg-slate-950/40">
                  {content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NoteTemplates;
