import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Maximize2,
  Mic,
  Square,
  Database,
  ShieldCheck,
  Volume2,
  GripHorizontal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClinicalContext } from '@/lib/clinical-context';
import { AuraVisualizer } from './AuraVisualizer';
import { AuraFloatingOrbProps } from './types';

export const AuraFloatingOrb: React.FC<AuraFloatingOrbProps> = ({
  initialOpen = false,
  onNavigateToStudio,
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isRecording, setIsRecording] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [formattedSoap, setFormattedSoap] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const [insertedFeedback, setInsertedFeedback] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const { activePatient, insertToEhr, sendToPhiScrubber } = useClinicalContext();
  const navigate = useNavigate();

  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelPosStart = useRef({ x: 0, y: 0 });

  // Alt + A shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Drag listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      const newX = Math.max(16, Math.min(window.innerWidth - 400, panelPosStart.current.x + dx));
      const newY = Math.max(16, Math.min(window.innerHeight - 500, panelPosStart.current.y + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect();
    if (rect) {
      panelPosStart.current = { x: rect.left, y: rect.top };
    }
  };

  const handleToggleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
    } else {
      setIsRecording(true);
      // Simulate speech input
      setTimeout(() => {
        setNoteText((prev) =>
          prev
            ? `${prev} Patient notes stable sleep onset.`
            : `Patient ${activePatient.name} reports anxiety reduction with daily breathing exercises.`
        );
        setIsRecording(false);
      }, 1800);
    }
  };

  const handleFormatSoap = () => {
    setIsFormatting(true);
    setTimeout(() => {
      setFormattedSoap(
        `SUBJECTIVE: ${noteText || 'Patient presents for ongoing psychotherapy follow-up.'}\n\n` +
        `OBJECTIVE: Alert, cooperative, euthymic affect. Speech normal.\n\n` +
        `ASSESSMENT: Generalized anxiety (ICD-10 F41.1), responding well to CBT.\n\n` +
        `PLAN: Continue individual therapy (CPT ${activePatient.cptCode}), review thought record.`
      );
      setIsFormatting(false);
    }, 400);
  };

  const handleInsertEhr = () => {
    const textToInsert = formattedSoap || noteText;
    if (!textToInsert) return;
    insertToEhr(textToInsert);
    setInsertedFeedback(true);
    setTimeout(() => setInsertedFeedback(false), 2000);
  };

  const handleSendScrubber = () => {
    const textToScrub = formattedSoap || noteText;
    if (!textToScrub) return;
    sendToPhiScrubber(textToScrub);
    try {
      navigate('/dashboard/phi-scrubber');
    } catch {
      // Safe fallback in test contexts
    }
  };

  const handleNavigateFullscreen = () => {
    if (onNavigateToStudio) {
      onNavigateToStudio();
    } else {
      navigate('/dashboard/aura');
    }
    setIsOpen(false);
  };

  return (
    <div id="aura-extension-root" className="aura-container">
      {/* Expanded Draggable Floating Panel */}
      {isOpen && (
        <div
          data-testid="aura-floating-panel"
          className="aura-panel"
          style={
            position
              ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' }
              : undefined
          }
        >
          {/* Draggable Header */}
          <div
            className="aura-panel-header"
            onMouseDown={handleHeaderMouseDown}
            title="Drag to reposition"
          >
            <div className="aura-panel-title">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Aura Copilot</span>
              <span className="aura-badge">Active</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {activePatient.name} ({activePatient.cptCode})
              </span>
              <button
                type="button"
                onClick={handleNavigateFullscreen}
                className="aura-btn-icon"
                title="Open Fullscreen Studio"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="aura-btn-icon"
                title="Minimize Aura (Alt + A)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Panel Content */}
          <div className="aura-panel-body">
            {/* Visualizer */}
            <AuraVisualizer isRecording={isRecording} height={40} />

            {/* Dictation / Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isRecording ? <Square className="h-3 w-3 fill-current" /> : <Mic className="h-3 w-3" />}
                  <span>{isRecording ? 'Stop' : 'Dictate'}</span>
                </button>
                <span className="text-[10px] text-slate-400">Alt + A to toggle</span>
              </div>

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Dictate or type clinical encounter notes..."
                rows={3}
                className="w-full text-xs rounded-lg border border-slate-200 p-2 bg-white/80 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
              />
            </div>

            {/* Quick Snippets */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setNoteText((p) => `${p} Denies SI/HI. Low acute risk.`.trim())}
                className="aura-chip"
              >
                + No SI/HI
              </button>
              <button
                type="button"
                onClick={() => setNoteText((p) => `${p} Alert & oriented x4, euthymic affect.`.trim())}
                className="aura-chip"
              >
                + MSE WNL
              </button>
              <button
                type="button"
                onClick={() => setNoteText((p) => `${p} CBT thought record assigned for homework.`.trim())}
                className="aura-chip"
              >
                + CBT Homework
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={handleFormatSoap}
                className="aura-btn-primary flex-1 text-xs py-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isFormatting ? 'Formatting...' : 'Format SOAP'}</span>
              </button>
              <button
                type="button"
                onClick={handleInsertEhr}
                className="aura-btn-secondary text-xs py-1.5"
                title="Insert into TheraFlow active chart"
              >
                <Database className="h-3.5 w-3.5 text-emerald-600" />
                <span>{insertedFeedback ? 'Inserted! ✓' : 'Insert EHR'}</span>
              </button>
              <button
                type="button"
                onClick={handleSendScrubber}
                className="aura-btn-secondary text-xs py-1.5"
                title="Scrub PHI in Scrubber workspace"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-600" />
                <span>Scrub</span>
              </button>
            </div>

            {/* Formatted Output if present */}
            {formattedSoap && (
              <div className="text-[11px] font-mono bg-slate-900 text-slate-100 p-2.5 rounded-lg whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed border border-slate-800">
                {formattedSoap}
              </div>
            )}
          </div>
        </div>
      )}

      {/* The 56px Floating Action Orb */}
      <button
        type="button"
        data-testid="aura-floating-orb"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`aura-orb ${isRecording ? 'recording' : ''}`}
        aria-label="Toggle Aura Clinical Copilot"
        title="Aura Clinical Copilot (Alt + A)"
      >
        <Sparkles className="aura-orb-icon" />
      </button>
    </div>
  );
};

export default AuraFloatingOrb;
