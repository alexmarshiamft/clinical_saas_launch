import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, CheckCircle2, BookOpen, User, Tag } from 'lucide-react';
import { ClinicalEncounterSample, Utterance } from './types';

export const CLINICAL_ENCOUNTER_SAMPLES: ClinicalEncounterSample[] = [
  {
    id: 'sample-gad7',
    title: 'GAD-7 Anxiety Intake & CBT Progress',
    specialty: 'Psychiatry & Psychotherapy',
    patientName: 'Jane Doe',
    mrn: '#MC-88219',
    cptCode: '90837',
    durationSeconds: 320,
    summary: 'Assessment of sleep onset insomnia, stimulus control therapy, and progressive muscle relaxation.',
    transcript: [
      {
        id: 'u-gad-1',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '00:00',
        seconds: 0,
        text: 'Good morning Jane, how did the stimulus control exercises work this week?',
      },
      {
        id: 'u-gad-2',
        speakerId: 'patient',
        speakerName: 'Jane Doe',
        role: 'patient',
        timestamp: '00:08',
        seconds: 8,
        text: 'Dr. Chen, it really made a difference. I fell asleep in under 20 minutes on Tuesday and Thursday. The racing thoughts were much lower.',
      },
      {
        id: 'u-gad-3',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '00:22',
        seconds: 22,
        text: 'That is wonderful progress. Your GAD-7 score decreased from 14 to 9. Let us review diaphragmatic pacing and cognitive challenging for work stressors.',
      },
      {
        id: 'u-gad-4',
        speakerId: 'patient',
        speakerName: 'Jane Doe',
        role: 'patient',
        timestamp: '00:38',
        seconds: 38,
        text: 'Yes, when my manager requested an unplanned status update, I used the 4-7-8 breathing technique and avoided the panic surge.',
      },
      {
        id: 'u-gad-5',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '00:54',
        seconds: 54,
        text: 'Excellent application. We will maintain your weekly 60-minute individual CBT sessions under CPT 90837 and focus next on catastrophic decatastrophizing.',
      },
    ],
    soapPreview: {
      subjective: 'Patient reports reduced anxiety episodes, improved sleep onset, and compliance with daily mindfulness exercises.',
      objective: 'Alert and oriented x4. Affect congruent, mood euthymic. Speech normal in rate and rhythm. No psychomotor agitation.',
      assessment: 'Generalized Anxiety Disorder (F41.1) demonstrating moderate symptom remission under active CBT protocol. CPT 90837 verified.',
      plan: 'Continue weekly 60-minute individual CBT psychotherapy (CPT 90837). Practice progressive muscle relaxation twice daily.',
    },
  },
  {
    id: 'sample-mdd',
    title: 'Major Depression & Panic Follow-up',
    specialty: 'Adult Psychiatry',
    patientName: 'Marcus Vance',
    mrn: '#MV-99014',
    cptCode: '90834',
    durationSeconds: 280,
    summary: 'Evaluation of Escitalopram titration, low energy, anhedonia, and panic episodes.',
    transcript: [
      {
        id: 'u-mdd-1',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '00:00',
        seconds: 0,
        text: 'Hello Marcus, we increased Escitalopram to 15mg two weeks ago. How has your energy and mood responded?',
      },
      {
        id: 'u-mdd-2',
        speakerId: 'patient',
        speakerName: 'Marcus Vance',
        role: 'patient',
        timestamp: '00:10',
        seconds: 10,
        text: 'The heavy exhaustion in the morning has started to lift, Dr. Chen. I still struggle on weekends with lack of interest, but no panic attacks this week.',
      },
      {
        id: 'u-mdd-3',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '00:26',
        seconds: 26,
        text: 'That correlates with your PHQ-9 decreasing from 16 to 11. Any GI upset or sleep disturbance since the dose increase?',
      },
      {
        id: 'u-mdd-4',
        speakerId: 'patient',
        speakerName: 'Marcus Vance',
        role: 'patient',
        timestamp: '00:40',
        seconds: 40,
        text: 'No nausea at all. Sleeping about 7 hours consistently without waking in the night.',
      },
      {
        id: 'u-mdd-5',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '00:52',
        seconds: 52,
        text: 'Very encouraging. We will continue Escitalopram 15mg daily and schedule behavioral activation therapy targeting weekend social engagement under CPT 90834.',
      },
    ],
    soapPreview: {
      subjective: 'Marcus reports morning anergia is improving following Escitalopram titration to 15mg. Zero panic episodes in 14 days. Mild lingering anhedonia on weekends.',
      objective: 'Thought process logical and goal-directed. Eye contact sustained. Mood reported as "recovering", affect mildly restricted but reactive. No suicidal ideation.',
      assessment: 'Major Depressive Disorder, single episode, moderate (F32.1). Partial remission with good pharmacological tolerance and symptom trajectory.',
      plan: 'Maintain Escitalopram 15mg PO daily. Initiate behavioral activation scheduling. Follow-up in 3 weeks (CPT 90834).',
    },
  },
  {
    id: 'sample-ptsd',
    title: 'PTSD Trauma Session & Night Terrors',
    specialty: 'Trauma & Behavioral Health',
    patientName: 'David Kim',
    mrn: '#DK-44182',
    cptCode: '90837',
    durationSeconds: 360,
    summary: 'Prolonged exposure therapy, trauma triggers, hypervigilance, and somatic grounding.',
    transcript: [
      {
        id: 'u-ptsd-1',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '00:00',
        seconds: 0,
        text: 'David, today we plan to review the trauma hierarchy and process the hyperarousal you noted in crowded grocery aisles.',
      },
      {
        id: 'u-ptsd-2',
        speakerId: 'patient',
        speakerName: 'David Kim',
        role: 'patient',
        timestamp: '00:12',
        seconds: 12,
        text: 'Last Friday the noise triggered an intense flashback. I felt my chest lock up and had to leave immediately. The night terrors were back over the weekend.',
      },
      {
        id: 'u-ptsd-3',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '00:29',
        seconds: 29,
        text: 'Let us do somatic grounding right now. Notice both feet planted on the floor, identify 5 green objects in the room, and feel the coolness of the air.',
      },
      {
        id: 'u-ptsd-4',
        speakerId: 'patient',
        speakerName: 'David Kim',
        role: 'patient',
        timestamp: '00:48',
        seconds: 48,
        text: 'Okay... breathing slower now. The physical panic feeling is subsiding. I can stay present in the room.',
      },
      {
        id: 'u-ptsd-5',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '01:05',
        seconds: 65,
        text: 'Well done. We will dedicate the full 60-minute session (CPT 90837) to gradual in vivo exposure hierarchies and bilateral tapping techniques.',
      },
    ],
    soapPreview: {
      subjective: 'David describes acute sensory flashbacks in crowded retail spaces and recurring night terrors. Expresses fear of losing control during sensory overwhelm.',
      objective: 'Presented with visible muscle tension and rapid respirations. Grounding exercises returned autonomic tone to baseline. No psychotic features or self-harm intent.',
      assessment: 'Post-Traumatic Stress Disorder (F43.10) with persistent hypervigilance and intrusive recall. Requires extended 60-minute trauma processing.',
      plan: 'Individual prolonged exposure psychotherapy 60 min (CPT 90837). Practice bilateral tapping grounding protocol at onset of hyperarousal.',
    },
  },
  {
    id: 'sample-diabetes',
    title: 'Type 2 Diabetes & Somatic Review',
    specialty: 'Integrated Care & Somatic Medicine',
    patientName: 'Elena Rostova',
    mrn: '#ER-10293',
    cptCode: '99214',
    durationSeconds: 240,
    summary: 'Chronic illness management, HbA1c review, neuropathy screening, and lifestyle compliance.',
    transcript: [
      {
        id: 'u-dia-1',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '00:00',
        seconds: 0,
        text: 'Elena, welcome back. We have your recent lab panel. HbA1c came in at 7.9%, down from 8.6%. How are you managing the Metformin?',
      },
      {
        id: 'u-dia-2',
        speakerId: 'patient',
        speakerName: 'Elena Rostova',
        role: 'patient',
        timestamp: '00:14',
        seconds: 14,
        text: 'Taking 1000mg twice daily with meals. No GI problems anymore. But I noticed some mild tingling in both feet after standing for long periods.',
      },
      {
        id: 'u-dia-3',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '00:30',
        seconds: 30,
        text: 'Let us perform a monofilament sensory exam. Sensation is intact at 8 of 10 points. We should discuss adding an SGLT2 inhibitor to protect renal function.',
      },
      {
        id: 'u-dia-4',
        speakerId: 'patient',
        speakerName: 'Elena Rostova',
        role: 'patient',
        timestamp: '00:46',
        seconds: 46,
        text: 'I would like to try that if it helps prevent any nerve or kidney damage. I have been walking 30 minutes every evening.',
      },
      {
        id: 'u-dia-5',
        speakerId: 'clinician',
        speakerName: 'Dr. Sarah Chen, MD',
        role: 'clinician',
        timestamp: '01:02',
        seconds: 62,
        text: 'Wonderful commitment. I am prescribing Empagliflozin 10mg daily and ordering repeat metabolic panel in 8 weeks (CPT 99214 Level 4 E/M).',
      },
    ],
    soapPreview: {
      subjective: 'Elena presents for routine 3-month diabetes follow-up. Tolerating Metformin 1000mg BID. Reports intermittent bilateral distal lower extremity paresthesias.',
      objective: 'BP 128/78, HR 72, BMI 28.4. Monofilament sensory exam 8/10 bilaterally. Foot pulses 2+ dorsalis pedis. HbA1c 7.9%.',
      assessment: 'Type 2 Diabetes Mellitus without acute complications (E11.9) with emerging peripheral sensory neuropathy. Moderate MDM complexity (CPT 99214).',
      plan: 'Continue Metformin 1000mg BID. Initiate Empagliflozin 10mg daily. Podiatry referral. Repeat comprehensive metabolic panel in 8 weeks.',
    },
  },
];

export interface PreRecordedEncountersProps {
  activeSampleId?: string;
  onSelectSample: (sample: ClinicalEncounterSample) => void;
  onApplyToChart?: (sample: ClinicalEncounterSample) => void;
}

export const PreRecordedEncounters: React.FC<PreRecordedEncountersProps> = ({
  activeSampleId = 'sample-gad7',
  onSelectSample,
  onApplyToChart,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);

  const selectedSample =
    CLINICAL_ENCOUNTER_SAMPLES.find((s) => s.id === activeSampleId) ||
    CLINICAL_ENCOUNTER_SAMPLES[0];

  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      const intervalMs = Math.round(2500 / speed);
      timer = setInterval(() => {
        setCurrentTurnIndex((prev) => {
          if (prev >= selectedSample.transcript.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, speed, selectedSample]);

  const handleSelect = (sample: ClinicalEncounterSample) => {
    setIsPlaying(false);
    setCurrentTurnIndex(0);
    onSelectSample(sample);
  };

  const handleApply = () => {
    if (onApplyToChart) {
      onApplyToChart(selectedSample);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 space-y-4 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Clinical Encounter Library & Simulation
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          {CLINICAL_ENCOUNTER_SAMPLES.length} Verified Encounters
        </span>
      </div>

      {/* Encounter Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {CLINICAL_ENCOUNTER_SAMPLES.map((sample) => {
          const isSelected = sample.id === selectedSample.id;
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelect(sample)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-purple-950/40 border-purple-500 text-purple-100 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    {sample.specialty}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    CPT {sample.cptCode}
                  </span>
                </div>
                <div className="text-xs font-bold line-clamp-1">{sample.title}</div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                <User className="h-3 w-3 text-slate-400" />
                <span>{sample.patientName}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Encounter Simulation Controls */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="scribe-btn bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause Simulation' : 'Play Encounter'}</span>
          </button>

          {/* Speed Controls */}
          <div className="flex items-center gap-1 text-xs">
            <FastForward className="h-3 w-3 text-slate-400" />
            {[1, 1.25, 1.5, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  speed === s ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Apply to Chart CTA */}
        <button
          type="button"
          onClick={handleApply}
          className="scribe-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Apply to Active Chart ({selectedSample.patientName})</span>
        </button>
      </div>
    </div>
  );
};

export default PreRecordedEncounters;
