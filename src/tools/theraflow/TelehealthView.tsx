/**
 * Feature 12: Telehealth Encrypted WebRTC Room Simulation
 * Dual-stream clinical encounter room with remote patient tile, clinician self-view,
 * screen share stage, microphone/camera toggles, session timer with CPT markers (90832, 90834, 90837),
 * and live ClinicalContext binding.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorOff,
  PhoneOff,
  Shield,
  Activity,
  Clock,
  Sparkles,
  User,
  Radio,
  FileText,
  Volume2,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';
import { logAuditEvent } from './data/theraflow-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface TelehealthViewProps {
  clientId?: string;
  onLeave?: () => void;
  onOpenScribe?: () => void;
}

export const TelehealthView: React.FC<TelehealthViewProps> = ({
  clientId,
  onLeave,
  onOpenScribe,
}) => {
  const { activePatient } = useClinicalContext();

  // Media Controls
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  // Session Duration Timer (seconds)
  const [secondsElapsed, setSecondsElapsed] = useState(55 * 60 + 12); // Start at ~55 mins to display target CPT 90837
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Audio Waveform Simulation
  const [audioLevel, setAudioLevel] = useState(65);

  useEffect(() => {
    // Audit log emission on telehealth room entry
    logAuditEvent(
      'TELEHEALTH_SESSION',
      'telehealth_room',
      activePatient.encounterId || `enc-${Date.now()}`,
      {
        roomType: 'webrtc',
        cptCode: activePatient.cptCode,
        status: 'joined',
        encryption: '256-bit DTLS/SRTP',
      },
      activePatient.name,
      activePatient.mrn
    );
  }, [activePatient]);

  // Session timer increment
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Simulated audio pulse
  useEffect(() => {
    const audioInterval = setInterval(() => {
      setAudioLevel(Math.floor(40 + Math.random() * 50));
    }, 200);
    return () => clearInterval(audioInterval);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLeaveSession = async () => {
    setIsTimerRunning(false);
    await logAuditEvent(
      'TELEHEALTH_SESSION',
      'telehealth_room',
      activePatient.encounterId || 'enc-session-1',
      {
        status: 'ended',
        totalDurationSeconds: secondsElapsed,
        cptReconciled: '90837',
      },
      activePatient.name,
      activePatient.mrn
    );
    toast.info(`Telehealth encounter wrapped up (${formatTimer(secondsElapsed)}). Session logged.`);
    onLeave?.();
  };

  const minutesElapsed = Math.floor(secondsElapsed / 60);

  return (
    <div className="space-y-4">
      {/* Top Encounter Status Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-100">
                Encrypted WebRTC Room
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Live Encounter
              </span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Patient: <strong className="text-white">{activePatient.name}</strong> ({activePatient.mrn}) • CPT{' '}
              {activePatient.cptCode}
            </div>
          </div>
        </div>

        {/* Timer & CPT Milestone Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 font-mono text-sm font-bold text-white">
            <Clock className="h-4 w-4 text-emerald-400" />
            <span>{formatTimer(secondsElapsed)}</span>
          </div>

          {/* CPT Threshold Status */}
          <div className="flex items-center gap-1 text-[11px] font-semibold">
            <span
              className={`px-2 py-1 rounded-md border ${
                minutesElapsed >= 16 && minutesElapsed < 38
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'text-slate-500 border-slate-800'
              }`}
            >
              90832 (30m)
            </span>
            <span
              className={`px-2 py-1 rounded-md border ${
                minutesElapsed >= 38 && minutesElapsed < 53
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'text-slate-500 border-slate-800'
              }`}
            >
              90834 (45m)
            </span>
            <span
              className={`px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                minutesElapsed >= 53
                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm'
                  : 'text-slate-500 border-slate-800'
              }`}
            >
              {minutesElapsed >= 53 && <Sparkles className="h-3 w-3" />}
              CPT 90837 (60m Target)
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>256-bit DTLS • HIPAA BAA</span>
          </div>
        </div>
      </div>

      {/* Main Video Tile Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Remote Patient Video Tile */}
        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden aspect-video flex flex-col justify-between p-4 shadow-xl">
          {/* Top Overlay Badge */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-xs text-xs font-bold text-white border border-slate-700 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                {activePatient.name}
              </span>
              <span className="text-[10px] font-mono text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                {activePatient.mrn}
              </span>
            </div>

            <div className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900/80 text-emerald-400 border border-slate-700">
              WebRTC 1080p • 24ms • Loss: 0%
            </div>
          </div>

          {/* Central Simulated Patient Feed */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950/40 to-slate-900">
            <div className="relative">
              <div
                className="h-28 w-28 rounded-full bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center text-white text-3xl font-bold shadow-2xl transition-transform duration-150"
                style={{
                  transform: `scale(${1 + (audioLevel / 500)})`,
                }}
              >
                {activePatient.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-slate-950">
                <Volume2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 text-xs font-semibold text-slate-300">
              Audio stream actively engaged
            </div>
          </div>

          {/* Bottom Audio Visualizer Bar */}
          <div className="z-10 flex items-center justify-between">
            <div className="flex items-center gap-1 h-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full transition-all duration-100"
                  style={{
                    height: `${Math.max(4, (audioLevel * ((i % 4) + 1)) / 12)}px`,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-400">Microphone: Active</span>
          </div>
        </div>

        {/* Local Clinician Self-View Tile */}
        <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden aspect-video flex flex-col justify-between p-4 shadow-xl">
          {/* Top Overlay Badge */}
          <div className="flex items-center justify-between z-10">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-xs text-xs font-bold text-white border border-slate-700">
              Dr. Sarah Chen, MD (You)
            </span>

            <div className="flex items-center gap-1.5">
              {isMicMuted ? (
                <span className="p-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  <MicOff className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Mic className="h-3.5 w-3.5" />
                </span>
              )}
              {isVideoOff ? (
                <span className="p-1 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  <VideoOff className="h-3.5 w-3.5" />
                </span>
              ) : (
                <span className="p-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Video className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>

          {/* Central Clinician Simulation */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/30">
            {isVideoOff ? (
              <div className="text-center text-slate-500">
                <VideoOff className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                <span className="text-xs font-semibold">Camera is turned off</span>
              </div>
            ) : (
              <div className="relative">
                <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-2xl">
                  SC
                </div>
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-indigo-500 border-2 border-slate-950 flex items-center justify-center text-white">
                  <Shield className="h-3.5 w-3.5" />
                </div>
              </div>
            )}
            <div className="mt-4 text-xs font-semibold text-slate-400">
              Local Clinician Stream (HD)
            </div>
          </div>

          {/* Bottom Status */}
          <div className="z-10 flex items-center justify-between text-[10px] text-slate-400">
            <span>Audio Device: MacBook Pro Microphone</span>
            <span>Video Device: FaceTime HD Camera</span>
          </div>
        </div>
      </div>

      {/* Screen Share Stage (if active) */}
      {isSharingScreen && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm animate-in fade-in zoom-in-95 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <MonitorUp className="h-5 w-5 text-indigo-600" />
              <span className="font-bold text-sm text-slate-900">
                Broadcast Screen: DSM-5 Differential &amp; Clinical Progress Chart
              </span>
            </div>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setIsSharingScreen(false)}
            >
              Stop Sharing
            </Button>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-mono">
            <div>Patient: {activePatient.name} ({activePatient.mrn})</div>
            <div>Encounter CPT Target: 90837 (Individual Psychotherapy 60m)</div>
            <div>Working Diagnosis: Generalized Anxiety Disorder (F41.1)</div>
            <div>CBT Thought Record Review: 3 Distortions Logged • Mood Efficiency: 84%</div>
          </div>
        </div>
      )}

      {/* Floating Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-md flex items-center justify-between">
        {/* Media Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMicMuted(!isMicMuted)}
            className={`p-3 rounded-xl border font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              isMicMuted
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-emerald-600" />}
            {isMicMuted ? 'Muted' : 'Mic On'}
          </button>

          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-3 rounded-xl border font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              isVideoOff
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4 text-indigo-600" />}
            {isVideoOff ? 'Camera Off' : 'Cam On'}
          </button>

          <button
            onClick={() => setIsSharingScreen(!isSharingScreen)}
            className={`p-3 rounded-xl border font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              isSharingScreen
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {isSharingScreen ? <MonitorOff className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
            {isSharingScreen ? 'Stop Screen' : 'Share Screen'}
          </button>
        </div>

        {/* Clinical Integrations & Leave */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onOpenScribe}
            className="flex items-center gap-1.5"
          >
            <Activity className="h-4 w-4 text-purple-600" />
            Open Scribe Diarization
          </Button>

          <Button
            variant="destructive"
            onClick={handleLeaveSession}
            className="flex items-center gap-1.5"
          >
            <PhoneOff className="h-4 w-4" />
            End Session
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TelehealthView;
