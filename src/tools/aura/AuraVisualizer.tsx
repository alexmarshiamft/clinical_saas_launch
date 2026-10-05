import React from 'react';
import { AuraVisualizerProps } from './types';

export const AuraVisualizer: React.FC<AuraVisualizerProps> = ({
  isRecording,
  barCount = 5,
  height = 48,
  className = '',
}) => {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div
      data-testid="aura-audio-visualizer"
      className={`aura-visualizer-box ${isRecording ? 'recording' : ''} ${className}`}
      style={{ height: `${height}px` }}
      aria-label={isRecording ? 'Audio visualizer active' : 'Audio visualizer standby'}
    >
      {bars.map((index) => {
        // Individualized heights for idle state
        const idleHeight = 6 + ((index * 3) % 8);
        return (
          <div
            key={index}
            className="aura-visualizer-bar"
            style={{
              height: isRecording ? undefined : `${idleHeight}px`,
              animationDelay: isRecording ? `${(index * 0.15) % 0.6}s` : undefined,
            }}
          />
        );
      })}
      {!isRecording && (
        <span className="text-[11px] text-slate-400 font-medium ml-2">
          Audio Standby
        </span>
      )}
    </div>
  );
};

export default AuraVisualizer;
