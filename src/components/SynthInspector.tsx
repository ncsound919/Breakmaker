import React, { useState, useEffect } from 'react';
import { Knob } from './Knob';

export function SynthInspector({ track, engine }: { track: 'synth' | 'bass', engine: any }) {
  const patch = track === 'synth' ? engine?.synthPatch : engine?.bassPatch;
  
  const [, setTick] = useState(0); // force re-render when changing patch

  if (!patch) return null;

  const updatePatch = (key: string, value: string | number) => {
    if (patch) {
      (patch as any)[key] = value;
      setTick(t => t + 1);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-5 mt-4">
      <h2 className="text-xs font-mono text-purple-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="bg-purple-500/20 text-purple-500 px-1.5 py-0.5 rounded text-[10px]">INSP</span>
        {track.toUpperCase()} MODULE
      </h2>
      
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1 flex justify-between">
            <span>Oscillator Shape</span>
          </label>
          <select 
            value={patch.type}
            onChange={e => updatePatch('type', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm focus:border-amber-500 outline-none"
          >
            <option value="sawtooth">Sawtooth</option>
            <option value="square">Square</option>
            <option value="triangle">Triangle</option>
            <option value="sine">Sine</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-8">
        <Knob label="Cutoff" value={patch.filterCutoff} onChange={v => updatePatch('filterCutoff', v)} min={100} max={8000} formatValue={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}Hz`} />
        <Knob label="Resonance" value={patch.filterRes} onChange={v => updatePatch('filterRes', v)} min={0} max={20} />
        
        <Knob label="Attack" value={Math.round(patch.attack * 1000)} onChange={v => updatePatch('attack', v / 1000)} min={5} max={1000} formatValue={v => `${v}ms`} />
        <Knob label="Decay" value={Math.round(patch.decay * 1000)} onChange={v => updatePatch('decay', v / 1000)} min={50} max={2000} formatValue={v => `${v}ms`} />
        
        <Knob label="Sustain" value={Math.round(patch.sustain * 100)} onChange={v => updatePatch('sustain', v / 100)} min={0} max={100} formatValue={v => `${v}%`} />
        <Knob label="Release" value={Math.round(patch.release * 1000)} onChange={v => updatePatch('release', v / 1000)} min={10} max={3000} formatValue={v => `${v}ms`} />
      </div>
    </div>
  );
}

