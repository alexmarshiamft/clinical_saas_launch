import React, { useState, useEffect, useRef } from 'react';
import { Mic, Pause, Square, Trash2, Radio, Volume2, Activity, Settings2 } from 'lucide-react';
import { RecordingState, AudioMetrics } from './types';
import WaveformVisualizer from './WaveformVisualizer';

export interface AudioRecorderProps {
  recordingState: RecordingState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClear: () => void;
  durationSeconds: number;
  audioMetrics?: AudioMetrics;
  onDeviceChange?: (deviceId: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  recordingState,
  onStart,
  onPause,
  onResume,
  onStop,
  onClear,
  durationSeconds,
  audioMetrics = { rms: 42, isVoiceActive: true, pitch: 185 },
  onDeviceChange,
}) => {
  const [devices, setDevices] = useState<Array<{ deviceId: string; label: string }>>([
    { deviceId: 'default', label: 'Default System Microphone (Internal Studio Mic)' },
    { deviceId: 'headset-1', label: 'USB Clinical Noise-Canceling Headset' },
    { deviceId: 'virtual-loopback', label: 'Telehealth Virtual Audio Stream (Loopback)' },
  ]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');

  // Enumerate actual hardware devices when available
  useEffect(() => {
    let mounted = true;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((foundDevices) => {
          if (!mounted) return;
          const audioInputs = foundDevices
            .filter((d) => d.kind === 'audioinput')
            .map((d, i) => ({
              deviceId: d.deviceId || `device-${i}`,
              label: d.label || `Clinical Microphone ${i + 1}`,
            }));
          if (audioInputs.length > 0) {
            setDevices(audioInputs);
            setSelectedDevice(audioInputs[0].deviceId);
          }
        })
        .catch(() => {
          // Gracefully fallback to simulated devices in headless/sandbox environments
        });
    }
    return () => {
      mounted = false;
    };
  }, []);

  const formatDuration = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const isRecording = recordingState === 'recording';
  const isPaused = recordingState === 'paused';
  const isIdle = recordingState === 'idle';

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const devId = e.target.value;
    setSelectedDevice(devId);
    if (onDeviceChange) onDeviceChange(devId);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100 space-y-4 shadow-md">
      {/* Top Bar: Device Selector & Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-purple-400" />
          <label htmlFor="audio-input-select" className="text-xs font-semibold text-slate-300">
            Audio Input Device:
          </label>
          <select
            id="audio-input-select"
            value={selectedDevice}
            onChange={handleDeviceChange}
            className="scribe-select bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1 max-w-xs focus:ring-1 focus:ring-purple-500"
          >
            {devices.map((dev) => (
              <option key={dev.deviceId} value={dev.deviceId}>
                {dev.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* AI Diarization Ready badge */}
          <span className="scribe-badge px-2.5 py-1 rounded-full bg-purple-900/60 text-purple-200 border border-purple-700 flex items-center gap-1.5 font-bold">
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
            AI Diarization Ready
          </span>

          {/* Voice Activity Metric */}
          {isRecording && (
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400 font-mono">
                {audioMetrics.pitch} Hz (Vocal Pitch)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Middle: Waveform Visualization */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center gap-4">
        <div className="flex-1">
          <WaveformVisualizer isRecording={isRecording} isPlaying={false} height={34} barCount={36} />
        </div>

        {/* Live Elapsed Duration */}
        <div className="text-right font-mono pr-2">
          <div className="text-xl font-bold tracking-wider text-slate-100">
            {formatDuration(durationSeconds)}
          </div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest">
            {isRecording ? 'LIVE RECORDING' : isPaused ? 'PAUSED' : 'STANDBY'}
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {isIdle ? (
            <button
              type="button"
              onClick={onStart}
              className="scribe-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Mic className="h-4 w-4" />
              <span>Record Encounter</span>
            </button>
          ) : isRecording ? (
            <>
              <button
                type="button"
                onClick={onPause}
                className="scribe-btn bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </button>
              <button
                type="button"
                onClick={onStop}
                className="scribe-btn bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm shadow-rose-900/30 transition-all cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop & Synthesize</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onResume}
                className="scribe-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={onStop}
                className="scribe-btn bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Stop & Synthesize</span>
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClear}
          className="scribe-btn bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          title="Clear encounter transcript"
        >
          <Trash2 className="h-3.5 w-3.5 text-slate-400" />
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
};

export default AudioRecorder;
