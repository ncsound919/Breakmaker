import React from 'react';

interface SequencerGridProps {
  pattern: any;
  currentStep: number;
  currentBarView: number;
  onToggleStep: (instrument: string, step: number) => void;
}

export function SequencerGrid({ pattern, currentStep, currentBarView, onToggleStep }: SequencerGridProps) {
  const instruments = [
    { id: 'synth', label: 'SYN' },
    { id: 'bass', label: 'BASS' },
    { id: 'sampler', label: 'SMPL' },
    { id: 'openHat', label: 'OH' },
    { id: 'hihat', label: 'CH' },
    { id: 'snare', label: 'SN' },
    { id: 'ghostSnare', label: 'GS' },
    { id: 'kick', label: 'BD' },
  ];

  const offset = (currentBarView - 1) * 16;
  const visibleStep = currentStep >= offset && currentStep < offset + 16 ? currentStep - offset : -1;

  return (
    <div className="flex flex-col gap-1 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      {/* Step Indicators */}
      <div className="flex mb-2 ml-12">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex-1 flex justify-center">
            <div className={`w-2 h-2 rounded-full ${visibleStep === i ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]' : 'bg-zinc-800'}`} />
          </div>
        ))}
      </div>

      {/* Grid Rows */}
      {instruments.map(inst => (
        <div key={inst.id} className="flex items-center gap-2">
          <div className="w-10 text-xs font-mono text-zinc-500 text-right pr-2 border-r border-zinc-800">
            {inst.label}
          </div>
          <div className="flex flex-1 gap-1">
            {Array.from({ length: 16 }).map((_, stepIndex) => {
              const absoluteStep = offset + stepIndex;
              const val = pattern[inst.id as keyof typeof pattern][absoluteStep] || 0;
              return (
                <button
                  key={absoluteStep}
                  onClick={() => onToggleStep(inst.id, absoluteStep)}
                  className={`flex-1 aspect-square rounded-sm border transition-colors relative overflow-hidden flex items-end ${
                    val > 0 
                      ? 'border-amber-600/50 bg-amber-900/20'
                      : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                  } ${stepIndex % 4 === 0 && stepIndex !== 0 ? 'ml-2' : ''}`}
                >
                  {val > 0 && (
                    <div 
                      className="w-full bg-amber-500 rounded-sm bottom-0 absolute transition-all duration-300"
                      style={{ 
                        height: `${Math.max(10, val * 100)}%`, 
                        opacity: Math.max(0.4, val) 
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
