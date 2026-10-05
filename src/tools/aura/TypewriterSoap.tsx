import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Send,
  Database,
  FastForward,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';
import { useNavigate } from 'react-router-dom';

import { TypewriterSoapProps } from './types';

export function synthesizeSoapNote(narrative: string, patientName: string, cptCode: string): string {
  const cleanInput = narrative.trim();
  const summaryPart = cleanInput.length > 20
    ? cleanInput
    : `Patient ${patientName} presents for scheduled psychotherapy follow-up under CPT ${cptCode}. Reports moderate improvements in symptom management.`;

  return `SUBJECTIVE:
${summaryPart}

OBJECTIVE:
Mental Status Exam: Alert and oriented x4. Speech clear, normal volume and rhythm. Mood congruent with affect. Thought process linear and goal-directed. No signs of cognitive or perceptual impairment.

ASSESSMENT:
Active diagnostic profile: Generalized Anxiety Disorder (ICD-10: F41.1) with secondary stress responses. Demonstrating positive treatment responsiveness to structured CBT and behavioral activation protocols.

PLAN:
1. Continue individual psychotherapy session protocol (CPT ${cptCode}).
2. Reinforce daily thought record review and progressive muscle relaxation (PMR).
3. Follow-up scheduled for next recurring clinical encounter.`;
}

export const TypewriterSoap: React.FC<TypewriterSoapProps> = ({
  initialText,
  sourceNarrative = '',
  compact = false,
  onInsertToEhr,
  onSendToScrubber,
  onStreamingComplete,
}) => {
  const { activePatient, insertToEhr, sendToPhiScrubber } = useClinicalContext();
  const navigate = useNavigate();

  const [fullTargetText, setFullTargetText] = useState<string>(() => {
    if (initialText) return initialText;
    return synthesizeSoapNote(sourceNarrative, activePatient.name, activePatient.cptCode);
  });

  const [displayedText, setDisplayedText] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [inserted, setInserted] = useState<boolean>(false);
  const [sentToScrubber, setSentToScrubber] = useState<boolean>(false);

  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // When sourceNarrative or activePatient changes, re-generate
  useEffect(() => {
    const generated = initialText || synthesizeSoapNote(sourceNarrative, activePatient.name, activePatient.cptCode);
    setFullTargetText(generated);
    setDisplayedText('');
    setIsStreaming(true);
    setInserted(false);
    setSentToScrubber(false);
  }, [sourceNarrative, activePatient.name, activePatient.cptCode, initialText]);

  // Streaming effect
  useEffect(() => {
    if (!isStreaming) return;

    let index = 0;
    const words = fullTargetText.split(' ');

    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }

    streamIntervalRef.current = setInterval(() => {
      index += 2;
      if (index >= words.length) {
        setDisplayedText(fullTargetText);
        setIsStreaming(false);
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        if (onStreamingComplete) onStreamingComplete();
      } else {
        setDisplayedText(words.slice(0, index).join(' '));
      }
    }, 30);

    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, [fullTargetText, isStreaming, onStreamingComplete]);

  const handleFastForward = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }
    setDisplayedText(fullTargetText);
    setIsStreaming(false);
    if (onStreamingComplete) onStreamingComplete();
  };

  const handleRestart = () => {
    setDisplayedText('');
    setIsStreaming(true);
  };

  const handleCopy = async () => {
    const textToCopy = displayedText || fullTargetText;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      }
    } catch {
      // Fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertToEhr = () => {
    const noteText = displayedText || fullTargetText;
    insertToEhr(noteText);
    if (onInsertToEhr) onInsertToEhr(noteText);
    setInserted(true);
    setTimeout(() => setInserted(false), 2500);
  };

  const handleSendToScrubber = () => {
    const noteText = displayedText || fullTargetText;
    sendToPhiScrubber(noteText);
    if (onSendToScrubber) onSendToScrubber(noteText);
    setSentToScrubber(true);
    setTimeout(() => {
      setSentToScrubber(false);
      try {
        navigate('/dashboard/phi-scrubber');
      } catch {
        // Safe navigation fallback in non-router tests
      }
    }, 600);
  };

  return (
    <div className="space-y-3">
      {/* Typewriter Top Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold text-slate-800">
            Synthesized SOAP Progress Note
          </span>
          {isStreaming && (
            <span
              data-testid="aura-typewriter-streaming-badge"
              className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Streaming AI Note...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isStreaming ? (
            <button
              type="button"
              data-testid="aura-fast-forward-btn"
              onClick={handleFastForward}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              title="Skip animation"
            >
              <FastForward className="h-3 w-3" />
              <span>Fast-Forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRestart}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              title="Replay stream"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Replay</span>
            </button>
          )}

          <button
            type="button"
            data-testid="aura-copy-soap-btn"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Output Stream Terminal / Display */}
      <div
        data-testid="aura-typewriter-output"
        className="relative font-mono text-xs rounded-xl bg-slate-900 text-slate-100 p-4 leading-relaxed border border-slate-800 overflow-y-auto whitespace-pre-wrap selection:bg-indigo-500 selection:text-white"
        style={{ minHeight: compact ? '160px' : '220px', maxHeight: compact ? '240px' : '360px' }}
      >
        {displayedText}
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 bg-amber-400 ml-0.5 animate-pulse" />
        )}
      </div>

      {/* Cross-Tool Clinical Action Bar */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <button
          type="button"
          data-testid="aura-insert-to-ehr-btn"
          onClick={handleInsertToEhr}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-2xs ${
            inserted
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {inserted ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Inserted to EHR! ✓</span>
            </>
          ) : (
            <>
              <Database className="h-3.5 w-3.5" />
              <span>Insert to EHR Chart</span>
            </>
          )}
        </button>

        <button
          type="button"
          data-testid="aura-send-to-scrubber-btn"
          onClick={handleSendToScrubber}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-2xs ${
            sentToScrubber
              ? 'bg-cyan-700 text-white'
              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{sentToScrubber ? 'Redirecting...' : 'Send to PHI Scrubber'}</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};

export default TypewriterSoap;
