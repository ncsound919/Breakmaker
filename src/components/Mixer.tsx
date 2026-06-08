import React, { useState, useEffect } from 'react';

interface MixerProps {
    engine: any;
}

export function Mixer({ engine }: MixerProps) {
    const [volumes, setVolumes] = useState({
        drums: 1.0,
        bass: 1.0,
        synth: 1.0,
        sampler: 1.0
    });

    const handleVolume = (track: 'drums' | 'bass' | 'synth' | 'sampler', val: number) => {
        setVolumes(prev => ({ ...prev, [track]: val }));
        if (!engine) return;
        const param = track === 'drums' ? engine.drumBus : 
                      track === 'bass' ? engine.bassBus :
                      track === 'synth' ? engine.synthBus : engine.samplerBus;
        
        if (param) {
            param.gain.value = val;
        }
    };

    return (
        <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-5 mt-4">
            <h2 className="text-xs font-mono text-amber-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[10px]">M</span>
                Console Mixer
            </h2>
            <div className="grid grid-cols-4 gap-2">
                {[
                    { id: 'drums', label: 'DRUMS', color: 'bg-zinc-300' },
                    { id: 'bass', label: 'BASS', color: 'bg-indigo-500' },
                    { id: 'synth', label: 'SYNTH', color: 'bg-purple-500' },
                    { id: 'sampler', label: 'SAMPLE', color: 'bg-amber-500' }
                ].map(({ id, label, color }) => (
                    <div key={id} className="flex flex-col items-center bg-zinc-950 border border-zinc-800/50 p-2 rounded">
                        <div className="h-24 flex items-end justify-center w-full relative mb-2">
                            <input 
                                type="range" 
                                min="0" max="1.5" step="0.01" 
                                value={volumes[id as keyof typeof volumes]}
                                onChange={(e) => handleVolume(id as 'drums' | 'bass' | 'synth' | 'sampler', parseFloat(e.target.value))}
                                className="absolute h-24 w-1 -rotate-90 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-200"
                                style={{
                                    transform: "rotate(-90deg)",
                                }}
                            />
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
