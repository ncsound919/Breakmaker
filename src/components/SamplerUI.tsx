import React, { useRef, useEffect, useState } from 'react';
import { getSlices, drawWaveform } from '../lib/audioUtils';

interface SamplerUIProps {
  engine: any;
}

export function SamplerUI({ engine }: SamplerUIProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [threshold, setThreshold] = useState(0.1);
  const [slices, setSlices] = useState<number[]>([]);
  const [hasBuffer, setHasBuffer] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (engine.ctx.state === 'suspended') {
      await engine.ctx.resume();
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await engine.ctx.decodeAudioData(arrayBuffer);
    
    // Auto slice
    const newSlices = getSlices(audioBuffer, threshold);
    engine.loadUserLoop(audioBuffer, newSlices);
    
    setSlices(newSlices);
    setHasBuffer(true);
    redraw(audioBuffer, newSlices);
  };

  const reChop = (t: number) => {
      setThreshold(t);
      if (engine.userLoopBuffer) {
          const newSlices = getSlices(engine.userLoopBuffer, t);
          engine.loadUserLoop(engine.userLoopBuffer, newSlices);
          setSlices(newSlices);
          redraw(engine.userLoopBuffer, newSlices);
      }
  };

  const redraw = (buffer: AudioBuffer, currentSlices: number[]) => {
      if (canvasRef.current) {
          drawWaveform(canvasRef.current, buffer, currentSlices, {
              wave: 'rgba(245, 158, 11, 0.4)',
              slice: 'rgba(239, 68, 68, 0.8)',
              text: 'rgba(255, 255, 255, 0.7)'
          });
      }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-5 mt-4">
      <h2 className="text-xs font-mono text-amber-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[10px]">4</span>
        Loop Sampler & Chopper
      </h2>

      <div className="space-y-4">
        <div className="flex justify-between items-center bg-zinc-950 border border-zinc-800/50 p-2 rounded">
          <span className="text-xs text-zinc-400 font-mono">Upload Loop</span>
          <input 
            type="file" 
            accept="audio/*" 
            onChange={handleUpload}
            className="text-[10px] text-zinc-500 w-full ml-2 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer" 
          />
        </div>

        <div className="bg-zinc-950 rounded border border-zinc-800 h-24 relative overflow-hidden flex items-center justify-center">
            {!hasBuffer && <span className="text-zinc-700 font-mono text-xs">No sample loaded</span>}
            <canvas 
                ref={canvasRef} 
                width={800} 
                height={96} 
                className="absolute inset-0 w-full h-full object-fill pointer-events-none" 
            />
        </div>

        <div className="flex items-center gap-4">
            <div className="flex-1">
                <label className="flex justify-between text-xs text-zinc-400 mb-2">
                    <span>Auto-Chop Sensitivity</span>
                    <span className="font-mono text-zinc-500">{threshold.toFixed(2)}</span>
                </label>
                <input 
                    type="range" 
                    min="0.01" 
                    max="0.5" 
                    step="0.01" 
                    value={threshold}
                    onChange={(e) => reChop(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                />
            </div>
            <div className="text-right flex-shrink-0">
                <span className="text-xs text-zinc-500 font-mono block">SLICES</span>
                <span className="text-lg text-amber-500 font-mono">{slices.length}</span>
            </div>
        </div>
      </div>
    </div>
  );
}
