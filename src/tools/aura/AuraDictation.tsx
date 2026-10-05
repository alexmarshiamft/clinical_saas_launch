import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Sparkles, RefreshCw, Volume2 } from 'lucide-react';
import { AuraVisualizer } from './AuraVisualizer';
import { CLINICAL_PRESETS } from './data/dsm5-database';

interface AuraDictationProps {
  text: string;
  onTextChange: (text: string) => void;
  onFormatSoap?: (text: string) => void;
  isRecording?: boolean;
  onRecordingChange?: (isRecording: boolean) => void;
  compact?: boolean;
}

export const AuraDictation: React.FC<AuraDictationProps> = ({
  text,
  onTextChange,
  onFormatSoap,
  isRecording: externalIsRecording,
  onRecordingChange,
  compact = false,
}) => {
  const [internalRecording, setInternalRecording] = useState(false);
  const isRecording = externalIsRecording !== undefined ? externalIsRecording : internalRecording;
  const setRecording = (val: boolean) => {
    setInternalRecording(val);
    if (onRecordingChange) onRecordingChange(val);
  };

  const [selectedDevice, setSelectedDevice] = useState('Default Microphone (Built-in)');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  const audioDevices = [
    'Default Microphone (Built-in)',
    'Studio USB Condenser Mic',
    'Bluetooth Headset (Hands-Free)',
  ];

  const handleToggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setRecording(false);
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    } else {
      // Start recording
      setRecording(true);
      // Simulate live dictation chunks if empty or continuous streaming
      const sampleChunks = [
        ' Patient reports significant anxiety reduction after practicing PMR.',
        ' Occasional nighttime awakening persists when anticipating morning meetings.',
        ' Overall mood remains stable, affect congruent and thought process goal-directed.',
      ];
      let chunkIdx = 0;
      simulationTimerRef.current = setInterval(() => {
        if (chunkIdx < sampleChunks.length) {
          onTextChange(text ? `${text}${sampleChunks[chunkIdx]}` : sampleChunks[chunkIdx].trim());
          chunkIdx++;
        } else {
          if (simulationTimerRef.current) {
            clearInterval(simulationTimerRef.current);
            simulationTimerRef.current = null;
          }
          setRecording(false);
        }
      }, 1500);
    }
  };

  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = CLINICAL_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onTextChange(preset.dictationText);
    }
  };

  const handleClear = () => {
    onTextChange('');
    setSelectedPresetId('');
    if (isRecording) {
      setRecording(false);
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Visualizer & Device Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleRecording}
            data-testid="aura-record-button"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all shadow-2xs ${
              isRecording
                ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop Dictation</span>
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" />
                <span>Dictate Note</span>
              </>
            )}
          </button>

          <span
            data-testid="aura-dictation-status"
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
              isRecording
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {isRecording ? 'Listening...' : 'Ready'}
          </span>
        </div>

        {!compact && (
          <div className="flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {audioDevices.map((dev) => (
                <option key={dev} value={dev}>
                  {dev}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Visualizer Bar */}
      <AuraVisualizer isRecording={isRecording} height={compact ? 36 : 44} />

      {/* Preset Selector */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-medium text-[11px]">Presets:</span>
          {CLINICAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                selectedPresetId === preset.id
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {preset.title}
            </button>
          ))}
        </div>

        {text && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline"
          >
            Clear Text
          </button>
        )}
      </div>

      {/* Textarea Input */}
      <textarea
        data-testid="aura-dictation-input"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        rows={compact ? 3 : 5}
        placeholder="Speak or type clinical narrative here... (Click 'Dictate Note' or select a preset above)"
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed"
      />

      {/* Format Trigger Button */}
      {onFormatSoap && (
        <div className="flex justify-end">
          <button
            type="button"
            data-testid="aura-format-soap-button"
            onClick={() => onFormatSoap(text)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs shadow-2xs transition-all"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Format SOAP Note</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AuraDictation;
