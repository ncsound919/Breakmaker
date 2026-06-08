import React from 'react';
import { Lock, Unlock } from 'lucide-react';

interface SequencerGridProps {
  pattern: any;
  currentStep: number;
  currentBarView: number;
  onToggleStep: (instrument: string, step: number) => void;
  lockedTracks: Set<string>;
  onToggleLock: (inst: string) => void;
  onRightClickStep?: (instrument: string, step: number, e: React.MouseEvent) => void;
  selectedTrack?: string;
  onSelectTrack: (inst: string) => void;
}

export function SequencerGrid({ pattern, currentStep, currentBarView, onToggleStep, lockedTracks, onToggleLock, onRightClickStep, selectedTrack, onSelectTrack }: SequencerGridProps) {
  const instruments = [
    { id: 'synth', label: 'SYN', bus: 'synth' },
    { id: 'bass', label: 'BASS', bus: 'bass' },
    { id: 'sampler', label: 'SMPL', bus: 'sampler' },
    { id: 'openHat', label: 'OH', bus: 'drums' },
    { id: 'hihat', label: 'CH', bus: 'drums' },
    { id: 'snare', label: 'SN', bus: 'drums' },
    { id: 'ghostSnare', label: 'GS', bus: 'drums' },
    { id: 'kick', label: 'BD', bus: 'drums' },
  ];

  const busStyles: Record<string, { bgDark: string, fill: string }> = {

    synth: { bgDark: 'border-purple-600/50 bg-purple-900/20', fill: 'bg-purple-500' },
    bass: { bgDark: 'border-indigo-600/50 bg-indigo-900/20', fill: 'bg-indigo-500' },
    sampler: { bgDark: 'border-amber-600/50 bg-amber-900/20', fill: 'bg-amber-500' },
    drums: { bgDark: 'border-zinc-500/50 bg-zinc-700/20', fill: 'bg-zinc-300' }
  };

  const offset = (currentBarView - 1) * 16;
  const visibleStep = currentStep >= offset && currentStep < offset + 16 ? currentStep - offset : -1;

  return (
    <div className="flex flex-col gap-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      {/* Step Indicators */}
      <div className="flex mb-2 ml-[60px]">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex-1 flex justify-center">
            <div className={`w-2 h-2 rounded-full ${visibleStep === i ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-zinc-800'}`} />
          </div>
        ))}
      </div>

      {/* Grid Rows */}
      {instruments.map(inst => {
        const style = busStyles[inst.bus];
        const isLocked = lockedTracks.has(inst.id);
        
        return (
          <div key={inst.id} className="flex items-center gap-2">
            <div className="w-[52px] flex items-center justify-between text-[10px] font-mono pr-2 border-r border-zinc-800 shrink-0">
              <button 
                onClick={() => onToggleLock(inst.id)}
                className={`transition-colors ${isLocked ? 'text-red-400 hover:text-red-300' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
              <button 
                onClick={() => onSelectTrack(inst.id)}
                className={`text-[9px] hover:text-white transition-colors ${selectedTrack === inst.id ? 'text-white underline font-bold px-1 bg-zinc-800 rounded' : style.fill.replace('bg-', 'text-')}`}
              >
                {inst.label}
              </button>
            </div>
            
            <div className="flex flex-1 gap-1">
              {Array.from({ length: 16 }).map((_, stepIndex) => {
                const absoluteStep = offset + stepIndex;
                const val = pattern[inst.id] ? pattern[inst.id][absoluteStep] || 0 : 0;
                
                let contextLabel = null;
                if (val > 0) {
                    if (inst.id === 'sampler') {
                        const chopVal = pattern.samplerChops ? pattern.samplerChops[absoluteStep] : null;
                        if (chopVal !== null && chopVal !== undefined) contextLabel = chopVal;
                    } else if (inst.id === 'bass') {
                        const note = pattern.bassNotes ? pattern.bassNotes[absoluteStep] : null;
                        if (note) contextLabel = note;
                    } else if (inst.id === 'synth') {
                        const notes = pattern.synthNotes ? pattern.synthNotes[absoluteStep] : null;
                        if (notes && notes.length > 0) contextLabel = notes[0];
                    }
                }
                
                return (
                  <button
                    key={absoluteStep}
                    onClick={() => onToggleStep(inst.id, absoluteStep)}
                    onContextMenu={(e) => {
                      if (onRightClickStep) onRightClickStep(inst.id, absoluteStep, e);
                    }}
                    className={`flex-1 aspect-square rounded-sm border transition-colors relative overflow-hidden flex items-end ${
                      val > 0 
                        ? style.bgDark
                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                    } ${stepIndex % 4 === 0 && stepIndex !== 0 ? 'ml-2' : ''}`}
                  >
                    {val > 0 && (
                      <>
                        <div 
                          className={`w-full ${style.fill} rounded-sm bottom-0 absolute transition-all duration-300 ${isLocked ? 'opacity-50' : ''}`}
                          style={{ 
                            height: `${Math.max(10, val * 100)}%`, 
                            opacity: isLocked ? Math.max(0.2, val - 0.2) : Math.max(0.4, val) 
                          }}
                        />
                        {contextLabel !== null && (
                            <div className="absolute top-0 right-0 p-[2px] z-10 pointer-events-none opacity-80">
                                <span className={`text-[6px] font-mono leading-none bg-zinc-900/60 px-[2px] rounded ${style.fill.replace('bg-', 'text-')}`}>
                                    {contextLabel}
                                </span>
                            </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
