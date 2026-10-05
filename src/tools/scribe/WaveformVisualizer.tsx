import React, { useMemo } from 'react';

export interface WaveformVisualizerProps {
  isRecording: boolean;
  isPlaying?: boolean;
  frequencyData?: Uint8Array | number[];
  barCount?: number;
  height?: number;
  className?: string;
}

/**
 * Headless-resilient dynamic SVG audio visualizer.
 * Renders smooth animated SVG bars with zero canvas dependency, preventing JSDOM context crashes.
 */
export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isRecording,
  isPlaying = false,
  frequencyData,
  barCount = 32,
  height = 36,
  className = '',
}) => {
  const bars = useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      if (isRecording || isPlaying) {
        if (frequencyData && frequencyData.length > 0) {
          const val = frequencyData[i % frequencyData.length] || 0;
          return Math.max(4, Math.round((val / 255) * (height - 8)));
        }
        // Simulated harmonic oscillation when Web Audio is simulated
        const wave = Math.abs(Math.sin((i + 1) * 0.45));
        return Math.max(6, Math.round(wave * (height - 6)));
      }
      return 4; // Idle resting amplitude
    });
  }, [isRecording, isPlaying, frequencyData, barCount, height]);

  return (
    <svg
      role="img"
      aria-label="Audio Waveform Visualizer"
      viewBox={`0 0 ${barCount * 6} ${height}`}
      className={`waveform-visualizer ${className}`}
      style={{ display: 'block', width: '100%', height: `${height}px` }}
    >
      <defs>
        <linearGradient id="recordingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ffe17d" />
        </linearGradient>
        <linearGradient id="playbackGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      {bars.map((barHeight, idx) => {
        const x = idx * 6;
        const y = (height - barHeight) / 2;
        const fill = isRecording
          ? 'url(#recordingGradient)'
          : isPlaying
          ? 'url(#playbackGradient)'
          : '#4b5563';

        return (
          <rect
            key={idx}
            x={x}
            y={y}
            width={3.5}
            height={barHeight}
            rx={1.75}
            fill={fill}
            className={isRecording ? 'waveform-bar-active' : ''}
            data-testid="waveform-bar"
          />
        );
      })}
    </svg>
  );
};

export default WaveformVisualizer;
