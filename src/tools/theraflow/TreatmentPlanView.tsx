/**
 * Feature 10: Treatment Plan Builder
 * Structured treatment planning supporting Problem statement, Long-term goals,
 * Short-term objectives with target completion dates, Interventions, and evidence-based presets (GAD, MDD, PTSD).
 */

import React, { useState, useEffect } from 'react';
import {
  Target,
  Plus,
  Trash2,
  Save,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';
import {
  getTreatmentPlans,
  addTreatmentPlan,
  updateTreatmentPlan,
  getClients,
  subscribeToTheraFlowStore,
} from './data/theraflow-store';
import {
  TreatmentPlan,
  TreatmentPlanObjective,
  ClientRecord,
} from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface TreatmentPlanViewProps {
  initialClientId?: string;
}

const PRESET_PLANS = {
  gad: {
    code: 'F41.1',
    label: 'Generalized Anxiety Disorder',
    problem:
      'Client experiences excessive, pervasive worry and autonomic hyperarousal (muscle tension, sleep latency > 60m) across workplace and social domains, causing significant occupational distress.',
    goal:
      'Client will decrease GAD-7 assessment score from 16 (severe) to < 6 (mild/remission) within 6 months and restore restorative sleep patterns.',
    objectives: [
      {
        id: 'gad-1',
        description: 'Identify and log 3 cognitive distortions daily via thought record.',
        target_date: '2026-11-15',
        status: 'in_progress' as const,
      },
      {
        id: 'gad-2',
        description: 'Complete 15 minutes of progressive muscle relaxation nightly before sleep.',
        target_date: '2026-12-15',
        status: 'in_progress' as const,
      },
      {
        id: 'gad-3',
        description: 'Deliver quarterly team presentation at work without avoidance behavior.',
        target_date: '2027-01-30',
        status: 'pending' as const,
      },
    ],
    interventions:
      'Cognitive Behavioral Therapy (CBT), Socratic Dialogue, Relaxation Training, Interoceptive Exposure.',
  },
  mdd: {
    code: 'F33.0',
    label: 'Major Depressive Disorder, Recurrent, Mild',
    problem:
      'Client reports persistent dysphoria, loss of interest in pleasurable activities (anhedonia), fatigue, and psychomotor deceleration.',
    goal:
      'Client will achieve remission from depressive episodes (PHQ-9 score < 5) and re-engage in 4 weekly self-care and social activities within 180 days.',
    objectives: [
      {
        id: 'mdd-1',
        description: 'Maintain a daily behavioral activation log tracking mood vs activity.',
        target_date: '2026-11-01',
        status: 'in_progress' as const,
      },
      {
        id: 'mdd-2',
        description: 'Engage in 3 scheduled 30-minute outdoor walks weekly.',
        target_date: '2026-12-01',
        status: 'in_progress' as const,
      },
      {
        id: 'mdd-3',
        description: 'Identify and challenge negative automatic thoughts about self-worth.',
        target_date: '2027-01-15',
        status: 'pending' as const,
      },
    ],
    interventions:
      'Behavioral Activation Therapy, Cognitive Restructuring, Sleep Hygiene Education.',
  },
  ptsd: {
    code: 'F43.10',
    label: 'Post-Traumatic Stress Disorder',
    problem:
      'Client reports intrusive trauma memories, nightmares, hypervigilance, and emotional numbing following index traumatic event.',
    goal:
      'Client will process index traumatic memories with Subjective Units of Distress (SUD) decreasing from 8 to ≤ 2, and resolve trauma-related avoidance behavior within 180 days.',
    objectives: [
      {
        id: 'ptsd-1',
        description: 'Establish and practice 2 emotional grounding techniques (5-4-3-2-1 technique, container exercise).',
        target_date: '2026-11-01',
        status: 'in_progress' as const,
      },
      {
        id: 'ptsd-2',
        description: 'Complete Phase 3 & 4 EMDR reprocessing on primary target memory.',
        target_date: '2026-12-30',
        status: 'pending' as const,
      },
      {
        id: 'ptsd-3',
        description: 'Resume driving on interstate highways without panic responses.',
        target_date: '2027-02-15',
        status: 'pending' as const,
      },
    ],
    interventions:
      'Eye Movement Desensitization and Reprocessing (EMDR), Somatic Grounding, Trauma Psychoeducation.',
  },
};

export const TreatmentPlanView: React.FC<TreatmentPlanViewProps> = ({ initialClientId }) => {
  const { activePatient } = useClinicalContext();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || activePatient.id || ''
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // Form State
  const [diagnosisCode, setDiagnosisCode] = useState<string>('F41.1');
  const [diagnosisLabel, setDiagnosisLabel] = useState<string>('Generalized Anxiety Disorder');
  const [problemStatement, setProblemStatement] = useState<string>('');
  const [longTermGoals, setLongTermGoals] = useState<string>('');
  const [objectives, setObjectives] = useState<TreatmentPlanObjective[]>([]);
  const [interventions, setInterventions] = useState<string>('');
  const [targetCompletionDate, setTargetCompletionDate] = useState<string>('2027-04-15');
  const [reviewFrequency, setReviewFrequency] = useState<'30_days' | '90_days' | 'annual'>('90_days');
  const [status, setStatus] = useState<'active' | 'in_progress' | 'achieved' | 'discontinued'>('active');

  useEffect(() => {
    async function load() {
      const [allClients, allPlans] = await Promise.all([getClients(), getTreatmentPlans()]);
      setClients(allClients);
      setPlans(allPlans);

      const targetId = initialClientId || activePatient.id;
      const matched = allPlans.find((p) => p.client_id === targetId);
      if (matched) {
        loadPlanIntoForm(matched);
      } else if (allPlans.length > 0) {
        loadPlanIntoForm(allPlans[0]);
      } else {
        applyPreset('gad');
      }
    }
    load();

    const unsub = subscribeToTheraFlowStore(async () => {
      const allPlans = await getTreatmentPlans();
      setPlans(allPlans);
    });
    return unsub;
  }, [initialClientId, activePatient.id]);

  const loadPlanIntoForm = (plan: TreatmentPlan) => {
    setSelectedPlanId(plan.id);
    setSelectedClientId(plan.client_id);
    setDiagnosisCode(plan.diagnosis_code);
    setDiagnosisLabel(plan.diagnosis_label);
    setProblemStatement(plan.problem_statement);
    setLongTermGoals(plan.long_term_goals);
    setObjectives([...plan.objectives]);
    setInterventions(plan.interventions);
    setTargetCompletionDate(plan.target_completion_date);
    setReviewFrequency(plan.review_frequency);
    setStatus(plan.status);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const existing = plans.find((p) => p.client_id === clientId);
    if (existing) {
      loadPlanIntoForm(existing);
    } else {
      setSelectedPlanId('');
      const cli = clients.find((c) => c.id === clientId);
      if (cli) {
        setDiagnosisCode(cli.diagnosis_code);
        setDiagnosisLabel(cli.diagnosis_label);
      }
      applyPreset('gad');
    }
  };

  const applyPreset = (presetKey: 'gad' | 'mdd' | 'ptsd') => {
    const p = PRESET_PLANS[presetKey];
    setDiagnosisCode(p.code);
    setDiagnosisLabel(p.label);
    setProblemStatement(p.problem);
    setLongTermGoals(p.goal);
    setObjectives(
      p.objectives.map((o) => ({
        ...o,
        id: `obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      }))
    );
    setInterventions(p.interventions);
    toast.success(`Loaded ${p.label} evidence-based clinical preset!`);
  };

  const handleAddObjective = () => {
    const newObj: TreatmentPlanObjective = {
      id: `obj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description: 'New clinical milestone objective...',
      target_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      status: 'pending',
    };
    setObjectives([...objectives, newObj]);
  };

  const handleRemoveObjective = (id: string) => {
    setObjectives(objectives.filter((o) => o.id !== id));
  };

  const handleObjectiveChange = (
    id: string,
    field: keyof TreatmentPlanObjective,
    value: string
  ) => {
    setObjectives(
      objectives.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const cli = clients.find((c) => c.id === selectedClientId);
    const clientName = cli ? `${cli.first_name} ${cli.last_name}` : 'Client';

    if (selectedPlanId) {
      await updateTreatmentPlan(selectedPlanId, {
        diagnosis_code: diagnosisCode,
        diagnosis_label: diagnosisLabel,
        problem_statement: problemStatement,
        long_term_goals: longTermGoals,
        objectives,
        interventions,
        target_completion_date: targetCompletionDate,
        review_frequency: reviewFrequency,
        status,
      });
      toast.success('Treatment plan updated successfully!');
    } else {
      const created = await addTreatmentPlan({
        client_id: selectedClientId,
        client_name: clientName,
        diagnosis_code: diagnosisCode,
        diagnosis_label: diagnosisLabel,
        problem_statement: problemStatement,
        long_term_goals: longTermGoals,
        objectives,
        interventions,
        target_completion_date: targetCompletionDate,
        review_frequency: reviewFrequency,
        status,
        therapist_id: 'a0000000-0000-4000-8000-000000000001',
      });
      setSelectedPlanId(created.id);
      toast.success('Master treatment plan established!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              Treatment Plan Builder &amp; Milestones
            </h2>
            <p className="text-xs text-slate-500">
              Measurable clinical objectives, target completion dates, and evidence-based presets.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Presets:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('gad')}
            >
              GAD (F41.1)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('mdd')}
            >
              MDD (F33.0)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset('ptsd')}
            >
              PTSD (F43.10)
            </Button>
          </div>
        </div>

        {/* Client Selection Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs">
          <div>
            <Label>Patient Selection</Label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientSelect(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.mrn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Target Review Date</Label>
            <Input
              type="date"
              value={targetCompletionDate}
              onChange={(e) => setTargetCompletionDate(e.target.value)}
              className="h-8"
            />
          </div>

          <div>
            <Label>Review Frequency</Label>
            <select
              value={reviewFrequency}
              onChange={(e) => setReviewFrequency(e.target.value as any)}
              className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none"
            >
              <option value="30_days">30 Days (Acute Phase)</option>
              <option value="90_days">90 Days (Quarterly CMS Standard)</option>
              <option value="annual">Annual Comprehensive Evaluation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Plan Builder Form */}
      <form onSubmit={handleSavePlan} className="space-y-4">
        {/* Problem Statement */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <Label className="text-sm font-bold text-slate-900">
            Clinical Problem Statement &amp; Presenting Impairments
          </Label>
          <p className="text-[11px] text-slate-500">
            Describe the functional impairments, symptom triggers, and baseline diagnostic presentation.
          </p>
          <textarea
            rows={3}
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder="e.g. Client experiences pervasive worry, autonomic hyperarousal, and avoidance behaviors..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
            required
          />
        </div>

        {/* Long-Term Goals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <Label className="text-sm font-bold text-slate-900">
            Overarching Long-Term Goal
          </Label>
          <p className="text-[11px] text-slate-500">
            Primary measurable clinical outcome required for discharge or successful completion of treatment.
          </p>
          <textarea
            rows={3}
            value={longTermGoals}
            onChange={(e) => setLongTermGoals(e.target.value)}
            placeholder="e.g. Client will decrease GAD-7 score from 16 to < 6 and restore normal occupational functioning within 180 days..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
            required
          />
        </div>

        {/* Short-Term Objectives */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-bold text-slate-900">
                Short-Term Measurable Objectives
              </Label>
              <p className="text-[11px] text-slate-500">
                Actionable milestones with target completion dates and completion metrics.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddObjective}
              className="flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Milestone
            </Button>
          </div>

          <div className="space-y-2.5">
            {objectives.map((obj, index) => (
              <div
                key={obj.id || index}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-xs"
              >
                <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                  {index + 1}
                </span>

                <div className="flex-1 w-full sm:w-auto">
                  <Input
                    value={obj.description}
                    onChange={(e) =>
                      handleObjectiveChange(obj.id, 'description', e.target.value)
                    }
                    placeholder="Milestone description..."
                    className="h-8 text-xs"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <Input
                      type="date"
                      value={obj.target_date}
                      onChange={(e) =>
                        handleObjectiveChange(obj.id, 'target_date', e.target.value)
                      }
                      className="h-8 w-36 text-xs"
                      required
                    />
                  </div>

                  <select
                    value={obj.status}
                    onChange={(e) =>
                      handleObjectiveChange(obj.id, 'status', e.target.value)
                    }
                    className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="achieved">Achieved</option>
                    <option value="discontinued">Discontinued</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemoveObjective(obj.id)}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Interventions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <Label className="text-sm font-bold text-slate-900">
            Clinical Interventions &amp; Modalities
          </Label>
          <p className="text-[11px] text-slate-500">
            Specific therapeutic techniques, homework structures, and modalities used by the clinician.
          </p>
          <textarea
            rows={3}
            value={interventions}
            onChange={(e) => setInterventions(e.target.value)}
            placeholder="e.g. Cognitive Behavioral Therapy (CBT), Progressive Muscle Relaxation, Socratic Questioning..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
            required
          />
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end pt-2">
          <Button type="submit" className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Master Treatment Plan
          </Button>
        </div>
      </form>
    </div>
  );
};

export default TreatmentPlanView;
