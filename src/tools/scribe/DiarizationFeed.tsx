import React, { useState } from 'react';
import { ArrowLeftRight, Edit2, Check, Search, Copy, UserCheck, Stethoscope, MessageSquare } from 'lucide-react';
import { Utterance, Speaker } from './types';

export interface DiarizationFeedProps {
  transcript: Utterance[];
  interimText?: string;
  isRecording?: boolean;
  onToggleSpeaker: (utteranceId: string) => void;
  onEditUtterance: (utteranceId: string, newText: string) => void;
  onCopyTranscript?: () => void;
  speakers?: Speaker[];
  activePatientName?: string;
}

export const DiarizationFeed: React.FC<DiarizationFeedProps> = ({
  transcript,
  interimText = '',
  isRecording = false,
  onToggleSpeaker,
  onEditUtterance,
  onCopyTranscript,
  activePatientName = 'Jane Doe',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredUtterances = transcript.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.text.toLowerCase().includes(term) ||
      u.speakerName.toLowerCase().includes(term) ||
      u.timestamp.includes(term)
    );
  });

  const handleStartEdit = (u: Utterance) => {
    setEditingId(u.id);
    setEditText(u.text);
  };

  const handleSaveEdit = (id: string) => {
    onEditUtterance(id, editText);
    setEditingId(null);
  };

  const handleCopy = () => {
    const raw = transcript
      .map((u) => `[${u.timestamp}] ${u.speakerName.includes('Chen') ? 'Dr. Chen:' : `${activePatientName}:`} ${u.text}`)
      .join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(raw).catch(() => {});
    }
    if (onCopyTranscript) onCopyTranscript();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 space-y-4 shadow-md flex flex-col h-full">
      {/* Header with Search and Copy Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-bold text-slate-100 tracking-wide">
            Live Acoustic Transcript ({activePatientName})
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            ({transcript.length} turns)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="scribe-input pl-8 pr-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 w-40 focus:w-52 transition-all focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Copy CTA */}
          <button
            type="button"
            onClick={handleCopy}
            className="scribe-btn bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copy full transcript to clipboard"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Utterances Stream */}
      <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 scrollbar-thin scrollbar-thumb-slate-700">
        {filteredUtterances.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            {searchTerm ? 'No dialogue matches search query.' : 'Awaiting acoustic speech turns...'}
          </div>
        ) : (
          filteredUtterances.map((u) => {
            const isClinician = u.role === 'clinician' || u.speakerId === 'clinician';
            const speakerDisplayName = isClinician ? 'Dr. Chen:' : `${activePatientName}:`;

            return (
              <div
                key={u.id}
                className={`utterance-card p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                  isClinician
                    ? 'utterance-card-clinician bg-slate-950/60 border-l-4 border-l-cyan-400 border-slate-800'
                    : 'utterance-card-patient bg-slate-950/60 border-l-4 border-l-amber-400 border-slate-800'
                }`}
              >
                {/* Speaker Header Row */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    {isClinician ? (
                      <span className="flex items-center gap-1 font-bold text-cyan-300">
                        <Stethoscope className="h-3 w-3 text-cyan-400" />
                        <span>{speakerDisplayName}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-bold text-amber-300">
                        <UserCheck className="h-3 w-3 text-amber-400" />
                        <span>{speakerDisplayName}</span>
                      </span>
                    )}
                    <span className="text-slate-500 font-mono text-[10px]">
                      [{u.timestamp}]
                    </span>
                  </div>

                  {/* Actions: Flip Speaker & Edit Text */}
                  <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onToggleSpeaker(u.id)}
                      className="p-1 rounded text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="1-Click Speaker Flip (Clinician ⇄ Patient)"
                      aria-label="Toggle speaker"
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                    </button>
                    {editingId === u.id ? (
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(u.id)}
                        className="p-1 rounded text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Save edit"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(u)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit utterance text"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Utterance Text / Edit Input */}
                {editingId === u.id ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSaveEdit(u.id);
                      }
                    }}
                    className="scribe-textarea w-full bg-slate-900 border border-purple-500/60 rounded p-1.5 text-xs text-slate-100 focus:outline-none"
                    rows={2}
                    autoFocus
                  />
                ) : (
                  <p className="text-slate-300 leading-relaxed font-sans select-text">
                    {u.text}
                  </p>
                )}
              </div>
            );
          })
        )}

        {/* Interim Speech Turn Bubble */}
        {isRecording && interimText && (
          <div className="p-3 rounded-xl border border-purple-800/60 bg-purple-950/30 text-xs space-y-1 recording-pulse">
            <div className="flex items-center gap-1.5 text-purple-300 font-semibold text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping" />
              <span>Capturing Live Speech...</span>
            </div>
            <p className="text-purple-200/80 italic font-mono">{interimText}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiarizationFeed;
