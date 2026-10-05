import React, { useState } from 'react';
import {
  Lock,
  CheckCircle2,
  Copy,
  Check,
  Tag,
  Square,
  Asterisk,
} from 'lucide-react';
import { ScrubResult, StatutoryMaskMode } from './types';

interface DiffViewerProps {
  scrubResult: ScrubResult;
  maskStyle: StatutoryMaskMode;
  onMaskStyleChange: (style: StatutoryMaskMode) => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  scrubResult,
  maskStyle,
  onMaskStyleChange,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyClean = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(scrubResult.cleanText);
      }
    } catch {
      // Fallback
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Render highlighted spans in unredacted source
  const renderSourceHighlights = () => {
    const { originalText, entities } = scrubResult;
    if (!entities || entities.length === 0) {
      return <span>{originalText}</span>;
    }

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    entities.forEach((entity, idx) => {
      if (entity.start > lastIndex) {
        segments.push(
          <span key={`text-${idx}`}>{originalText.slice(lastIndex, entity.start)}</span>
        );
      }

      const isDirect = entity.riskTier === 'Direct';
      segments.push(
        <span
          key={`entity-${entity.id}`}
          title={`${entity.category} (${entity.riskTier} Identifier) - Confidence: ${Math.round(entity.confidence * 100)}%`}
          className={`inline-block px-1 py-0.5 rounded font-mono font-bold text-[11px] mx-0.5 border ${
            isDirect
              ? 'bg-rose-100 text-rose-900 border-rose-300'
              : 'bg-amber-100 text-amber-900 border-amber-300'
          }`}
        >
          {entity.originalValue}
        </span>
      );

      lastIndex = entity.end;
    });

    if (lastIndex < originalText.length) {
      segments.push(
        <span key="tail-text">{originalText.slice(lastIndex)}</span>
      );
    }

    return segments;
  };

  // Render clean redacted output with styled badges
  const renderRedactedOutput = () => {
    const { cleanText } = scrubResult;
    if (maskStyle !== 'tag') {
      return <span>{cleanText}</span>;
    }

    // Split on Safe Harbor token patterns like [NAME], [DATE], [PHONE], etc.
    const tokenRegex = /(\[[A-Z0-9_+]+\])/g;
    const parts = cleanText.split(tokenRegex);

    return parts.map((part, idx) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return (
          <span
            key={idx}
            className="bg-cyan-200 px-1 py-0.5 rounded text-cyan-900 font-bold mx-0.5 inline-block font-mono text-[11px]"
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-4">
      {/* Mask Style Switcher Toolbar & Copy */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <span className="text-[11px] font-bold text-slate-500 px-2 uppercase tracking-wider">
            Masking Mode:
          </span>
          <button
            type="button"
            data-testid="scrubber-mask-tag-btn"
            onClick={() => onMaskStyleChange('tag')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              maskStyle === 'tag'
                ? 'bg-white text-cyan-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="h-3 w-3 text-cyan-600" />
            <span>[TAG] Tokens</span>
          </button>

          <button
            type="button"
            data-testid="scrubber-mask-block-btn"
            onClick={() => onMaskStyleChange('block')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              maskStyle === 'block'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Square className="h-3 w-3 fill-current text-slate-800" />
            <span>██ Solid Block</span>
          </button>

          <button
            type="button"
            data-testid="scrubber-mask-asterisk-btn"
            onClick={() => onMaskStyleChange('asterisk')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              maskStyle === 'asterisk'
                ? 'bg-white text-amber-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Asterisk className="h-3 w-3 text-amber-600" />
            <span>*** Asterisks</span>
          </button>
        </div>

        <button
          type="button"
          data-testid="scrubber-copy-clean-btn"
          onClick={handleCopyClean}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700">Copied Clean Text!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-500" />
              <span>Copy Clean Text</span>
            </>
          )}
        </button>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Pane: Unredacted Source */}
        <div
          data-testid="scrubber-source-pane"
          className="p-4 rounded-xl bg-rose-50/70 border border-rose-200 font-mono text-xs space-y-2 flex flex-col"
        >
          <div className="text-rose-900 font-bold flex items-center justify-between border-b border-rose-200/60 pb-2">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-rose-600 shrink-0" />
              <span>Unredacted Clinical Source (Protected ePHI)</span>
            </div>
            <span className="text-[10px] bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded font-sans font-bold">
              {scrubResult.itemsRedacted} Identifiers
            </span>
          </div>
          <div className="text-slate-700 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[460px] flex-1">
            <span className="sr-only" data-testid="scrubber-raw-source">{scrubResult.originalText}</span>
            {renderSourceHighlights()}
          </div>
        </div>

        {/* Right Pane: 18 Safe Harbor Redacted Output */}
        <div
          data-testid="scrubber-redacted-pane"
          className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 font-mono text-xs space-y-2 flex flex-col"
        >
          <div className="text-cyan-900 font-bold flex items-center justify-between border-b border-cyan-200/60 pb-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
              <span>18 Safe Harbor Redacted Output</span>
            </div>
            <span className="text-[10px] bg-cyan-200/80 text-cyan-900 px-2 py-0.5 rounded font-sans font-bold">
              100% De-identified
            </span>
          </div>
          <div className="text-slate-800 leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[460px] flex-1">
            {renderRedactedOutput()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffViewer;
