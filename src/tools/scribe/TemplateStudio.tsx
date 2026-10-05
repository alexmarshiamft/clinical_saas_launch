import React, { useState } from 'react';
import {
  Wand2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  Sparkles,
  FileCode,
  Tag,
  CheckCircle,
} from 'lucide-react';
import { ClinicalTemplate, TemplateSection, ClinicalVariableContext } from './types';
import { SUPPORTED_VARIABLES, interpolateTemplateVariables } from './variable-interpolator';
import { getStoredTemplates, saveTemplate, resetToFactoryPresets } from './data/templateStore';

export interface TemplateStudioProps {
  onTemplateSaved?: (template: ClinicalTemplate) => void;
  activeContext?: Partial<ClinicalVariableContext>;
}

export const TemplateStudio: React.FC<TemplateStudioProps> = ({
  onTemplateSaved,
  activeContext = {
    patient_name: 'Jane Doe',
    mrn: '#MC-88219',
    dob: '04/12/1988',
    cpt_code: '90837',
    chief_complaint: 'Generalized Anxiety Disorder follow-up',
    clinician_name: 'Dr. Sarah Chen, MD',
    allergies: 'NKDA (No Known Drug Allergies)',
    medications: 'Escitalopram 10mg PO QD, Metformin 500mg PO BID',
    vital_signs: 'BP: 120/80 mmHg, HR: 72 bpm, SpO2: 98%',
    session_duration: '53 minutes',
    referring_provider: 'Dr. Michael Vance, MD',
  },
}) => {
  const [templates, setTemplates] = useState<ClinicalTemplate[]>(() => getStoredTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || 'soap');
  const [currentTemplate, setCurrentTemplate] = useState<ClinicalTemplate>(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [activeFocusedSectionId, setActiveFocusedSectionId] = useState<string | null>(null);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const found = templates.find((t) => t.id === id);
    if (found) {
      setCurrentTemplate(JSON.parse(JSON.stringify(found)));
    }
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...currentTemplate.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Re-index order property
    newSections.forEach((s, idx) => {
      s.order = idx;
    });

    setCurrentTemplate({
      ...currentTemplate,
      sections: newSections,
    });
  };

  const handleAddSection = () => {
    const newSection: TemplateSection = {
      id: `custom_sec_${Date.now()}`,
      title: 'New Clinical Section',
      promptInstruction: 'Clinical documentation and synthesis for {{patient_name}}.',
      placeholder: 'Enter section guidance...',
      order: currentTemplate.sections.length,
    };
    setCurrentTemplate({
      ...currentTemplate,
      sections: [...currentTemplate.sections, newSection],
    });
  };

  const handleDeleteSection = (index: number) => {
    if (currentTemplate.sections.length <= 1) return;
    const newSections = currentTemplate.sections.filter((_, idx) => idx !== index);
    newSections.forEach((s, idx) => {
      s.order = idx;
    });
    setCurrentTemplate({
      ...currentTemplate,
      sections: newSections,
    });
  };

  const handleUpdateSection = (index: number, field: keyof TemplateSection, value: any) => {
    const newSections = [...currentTemplate.sections];
    newSections[index] = {
      ...newSections[index],
      [field]: value,
    };
    setCurrentTemplate({
      ...currentTemplate,
      sections: newSections,
    });
  };

  const handleInsertToken = (token: string, sectionIndex?: number) => {
    if (typeof sectionIndex === 'number' && sectionIndex >= 0) {
      const sec = currentTemplate.sections[sectionIndex];
      const updatedPrompt = `${sec.promptInstruction} ${token}`;
      handleUpdateSection(sectionIndex, 'promptInstruction', updatedPrompt);
    } else {
      // Append to global prompt
      const updatedGlobal = `${currentTemplate.globalPrompt || ''} ${token}`.trim();
      setCurrentTemplate({
        ...currentTemplate,
        globalPrompt: updatedGlobal,
      });
    }
  };

  const handleSave = () => {
    const updated = saveTemplate(currentTemplate);
    setTemplates(updated);
    if (onTemplateSaved) onTemplateSaved(currentTemplate);
    setNotification(`✓ Template "${currentTemplate.name}" successfully saved to local store.`);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleReset = () => {
    if (confirm('Reset all templates to pristine factory defaults? Any custom templates will be overwritten.')) {
      const defaults = resetToFactoryPresets();
      setTemplates(defaults);
      setSelectedTemplateId(defaults[0].id);
      setCurrentTemplate(JSON.parse(JSON.stringify(defaults[0])));
      setNotification('✓ Restored all templates to pristine clinical factory presets.');
      setTimeout(() => setNotification(null), 3500);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-6 shadow-md">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wand2 className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100">
              Scribe Template Studio &amp; Prompt Engineering
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Customize section order, prompt instructions, and clinical variable tokens (saved to versioned storage: clinical_saas_scribe_templates_v2).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="scribe-btn bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset to pristine factory templates"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span>Factory Presets</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="scribe-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Template</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Template Picker Pills */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">Select Template to Engineer:</label>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTemplate(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                t.id === selectedTemplateId
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Template Metadata Editor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Template Name:</label>
          <input
            type="text"
            value={currentTemplate.name}
            onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
            className="scribe-input w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-400 block mb-1">Clinical Specialty:</label>
          <input
            type="text"
            value={currentTemplate.specialty}
            onChange={(e) => setCurrentTemplate({ ...currentTemplate, specialty: e.target.value })}
            className="scribe-input w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-400 block mb-1">Global AI Prompt:</label>
          <textarea
            value={currentTemplate.globalPrompt || ''}
            onChange={(e) => setCurrentTemplate({ ...currentTemplate, globalPrompt: e.target.value })}
            rows={2}
            className="scribe-textarea w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
          />
        </div>
      </div>

      {/* Variable Token Chips */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Tag className="h-3.5 w-3.5 text-amber-400" />
          <span>Clinical Variable Token Chips (Click to insert):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUPPORTED_VARIABLES.map((v) => (
            <button
              key={v.token}
              type="button"
              onClick={() => {
                const idx = currentTemplate.sections.findIndex((s) => s.id === activeFocusedSectionId);
                handleInsertToken(v.token, idx >= 0 ? idx : undefined);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-mono text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title={`Inserts ${v.token} (e.g. ${v.example})`}
            >
              <span>{v.token}</span>
              <span className="text-[10px] text-slate-400 font-sans">({v.label})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Sections Management & Re-ordering */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">
            Template Sections ({currentTemplate.sections.length})
          </h3>
          <button
            type="button"
            onClick={handleAddSection}
            className="scribe-btn bg-purple-900/40 hover:bg-purple-900/70 border border-purple-700 text-purple-200 font-semibold text-xs px-3 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Section</span>
          </button>
        </div>

        <div className="space-y-3">
          {currentTemplate.sections.map((section, idx) => (
            <div
              key={section.id}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 transition-colors hover:border-slate-700"
            >
              {/* Section Header Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-purple-400 font-bold px-2 py-0.5 rounded bg-purple-950 border border-purple-800">
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => handleUpdateSection(idx, 'title', e.target.value)}
                    className="font-bold text-xs bg-slate-900 border border-slate-700 text-slate-100 rounded px-2.5 py-1 w-64 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {/* Move Up */}
                  <button
                    type="button"
                    onClick={() => handleMoveSection(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Move section up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  {/* Move Down */}
                  <button
                    type="button"
                    onClick={() => handleMoveSection(idx, 'down')}
                    disabled={idx === currentTemplate.sections.length - 1}
                    className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Move section down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {/* Delete Section */}
                  <button
                    type="button"
                    onClick={() => handleDeleteSection(idx)}
                    disabled={currentTemplate.sections.length <= 1}
                    className="p-1 rounded text-rose-400 hover:bg-rose-950/50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer ml-1"
                    title="Delete section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Prompt Instruction */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  AI Guidance / Prompt Instruction:
                </label>
                <textarea
                  value={section.promptInstruction}
                  onFocus={() => setActiveFocusedSectionId(section.id)}
                  onChange={(e) => handleUpdateSection(idx, 'promptInstruction', e.target.value)}
                  rows={2}
                  className="scribe-textarea w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100"
                />
              </div>

              {/* Live Preview of Variable Resolution */}
              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-purple-300 font-semibold">Live Resolved Preview: </span>
                <span className="italic">
                  {interpolateTemplateVariables(section.promptInstruction, activeContext)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TemplateStudio;
