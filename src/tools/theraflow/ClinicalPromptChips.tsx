/**
 * Feature 10: Clinical Prompt Chips
 * Quick insertion chips categorized by Mental Status, Interventions, Risk Assessment, and Plan.
 */

import React from 'react';
import { Sparkles, Plus } from 'lucide-react';

export interface ClinicalChipCategory {
  category: string;
  targetField: 'd_text' | 'a_text' | 'p_text';
  chips: string[];
}

export const CLINICAL_CHIPS: ClinicalChipCategory[] = [
  {
    category: 'Mental Status & Presentation',
    targetField: 'd_text',
    chips: [
      'Alert & oriented x4',
      'Affect congruent with mood',
      'Euthymic mood reported',
      'Anxious & tense presentation',
      'Depressed & dysphoric mood',
      'Psychomotor agitation noted',
      'Tearful during processing',
      'Eye contact normal',
      'Speech normal in rate & rhythm',
      'Cooperative & engaged',
    ],
  },
  {
    category: 'Therapeutic Interventions',
    targetField: 'd_text',
    chips: [
      'CBT Cognitive Restructuring',
      'Behavioral Activation Scheduling',
      'Progressive Muscle Relaxation (PMR)',
      'DBT Distress Tolerance Skills',
      'EMDR Phase 4 Target Processing',
      'Socratic Questioning on Catastrophizing',
      'Diaphragmatic Breathing Training',
      'Psychoeducation on Panic Cycle',
      'Exposure Hierarchy Review',
      'Assertive Communication Role-Play',
    ],
  },
  {
    category: 'Risk Assessment & Clinical Assessment',
    targetField: 'a_text',
    chips: [
      'Denies SI / HI (low acute risk)',
      'No self-harm ideation or intent',
      'Safety plan intact & accessible',
      'Symptom severity: Mild',
      'Symptom severity: Moderate',
      'Significant goal progress noted',
      'Moderate goal progress noted',
      'Insight into distortions intact',
      'Judgment fair to good',
      'GAD-7 score trending downward',
    ],
  },
  {
    category: 'Treatment Plan & Follow-Up',
    targetField: 'p_text',
    chips: [
      'Continue weekly 60m psychotherapy',
      'Continue bi-weekly psychotherapy',
      'Daily thought record log assigned',
      'Practice PMR 15m daily before sleep',
      'Graduated exposure step 2 assigned',
      'Coordinate with primary care physician',
      'Review sleep restriction schedule',
      'Next session scheduled for next week',
    ],
  },
];

interface ClinicalPromptChipsProps {
  onSelectChip: (text: string, targetField: 'd_text' | 'a_text' | 'p_text') => void;
}

export const ClinicalPromptChips: React.FC<ClinicalPromptChipsProps> = ({ onSelectChip }) => {
  return (
    <div className="space-y-2.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
          Quick Clinical Terminology Chips (Click to append)
        </span>
      </div>

      <div className="space-y-2">
        {CLINICAL_CHIPS.map((cat) => (
          <div key={cat.category} className="space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">
              {cat.category} → [{cat.targetField.replace('_text', '').toUpperCase()}]:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {cat.chips.map((chip) => (
                <button
                  type="button"
                  key={chip}
                  onClick={() => onSelectChip(chip, cat.targetField)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-900 border border-slate-200 text-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  <Plus className="h-2.5 w-2.5 text-slate-400" />
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClinicalPromptChips;
