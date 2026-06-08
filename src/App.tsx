import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Sparkles, Loader2, Settings2, Download } from 'lucide-react';
import { generateBreakPattern, BreakParams, BreakPattern } from './lib/gemini';
import { BreakmakerEngine } from './lib/audio';
import { SequencerGrid } from './components/SequencerGrid';
import { Knob } from './components/Knob';

import { Mixer } from './components/Mixer';
import { SamplerUI } from './components/SamplerUI';
import { noteToFreq } from './lib/audioUtils';

const createEmptyTrack = () => Array(64).fill(0);
const createEmptyStringTrack = () => Array(64).fill('');
const createEmptyArrayTrack = () => Array(64).fill([]);

const DEFAULT_PATTERN: any = {
  kick: createEmptyTrack().map((_, i) => (i % 16 === 0 || i % 16 === 6 || i % 16 === 9) ? 1 : 0),
  snare: createEmptyTrack().map((_, i) => (i % 16 === 4 || i % 16 === 12) ? 1 : 0),
  hihat: createEmptyTrack().map((_, i) => (i % 2 === 0) ? 1 : 0),
  openHat: createEmptyTrack().map((_, i) => (i % 16 === 14) ? 1 : 0),
  ghostSnare: createEmptyTrack().map((_, i) => (i % 16 === 7) ? 0.5 : 0),
  bass: createEmptyTrack(),
  bassNotes: createEmptyStringTrack(),
  synth: createEmptyTrack(),
  synthNotes: createEmptyArrayTrack(),
  sampler: createEmptyTrack(),
  samplerChops: createEmptyTrack()
};

const ERAS = ['60s Soul', '70s Funk', '80s Hip Hop', '90s Boom Bap', 'Modern Neo-Soul'];
const DRUMMER_PROFILES = [
  { name: 'Clyde Stubblefield', kit: 'Vintage Ludwig', feel: 'Light Swing' },
  { name: 'Bernard Purdie', kit: 'Gretsch Round Badge', feel: 'Purdie Shuffle' },
  { name: 'Steve Gadd', kit: '70s Studio Custom', feel: 'Straight' },
  { name: 'Questlove', kit: 'Roots Custom (Dry)', feel: 'Dilla Drunk' },
  { name: 'J Dilla (Programmer)', kit: 'MPC60 Vintage', feel: 'MPC 58%' },
  { name: 'John Bonham', kit: 'Vistalite Heavy', feel: 'Straight' },
  { name: 'Tony Allen', kit: 'Afrobeat Custom', feel: 'Light Swing' },
  { name: 'Zigaboo Modeliste', kit: 'New Orleans Funk', feel: 'Light Swing' },
  { name: 'Marley Marl (Programmer)', kit: 'TR-808', feel: 'Straight' },
  { name: 'Generic Session', kit: 'Vintage Ludwig', feel: 'Straight'}
];
const DRUMMERS = DRUMMER_PROFILES.map(p => p.name);
const KITS = ['Vintage Ludwig', 'Gretsch Round Badge', '70s Studio Custom', 'Roots Custom (Dry)', 'Vistalite Heavy', 'Afrobeat Custom', 'New Orleans Funk', 'TR-808', 'MPC60 Vintage', 'Dirty Break', 'Custom Upload'];
const FEELS = ['Straight', 'Light Swing', 'MPC 58%', 'Dilla Drunk', 'Purdie Shuffle'];
const PARTS = ['Intro', 'Main Groove', 'Fill', 'Breakdown'];

export default function App() {
  const [params, setParams] = useState<BreakParams>({
    era: ERAS[1], // 70s Funk
    drummer: DRUMMERS[0], // Clyde Stubblefield
    kit: KITS[0], // Vintage Ludwig
    feel: FEELS[1], // Light Swing
    songPart: PARTS[1],
    bars: 1,
  });

  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [tempo, setTempo] = useState(95);
  const [swing, setSwing] = useState(54); // 50 = straight, >50 = swing
  const [dirt, setDirt] = useState(30);
  const [looseness, setLooseness] = useState(25); // 0 to 100 for humanization
  const [hpf, setHpf] = useState(40);
  const [lpf, setLpf] = useState(14000);
  
  const [currentBarView, setCurrentBarView] = useState(1);
  const [breakName, setBreakName] = useState('The Funky Drummer');
  const [notes, setNotes] = useState('A classic tight funk groove. Keep the hi-hats crisp and the ghost notes subtle.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const engineRef = useRef<BreakmakerEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const patternRef = useRef(pattern);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setDirt(dirt);
      engineRef.current.setHPF(hpf);
      engineRef.current.setLPF(lpf);
      engineRef.current.setKitProfile(params.kit);
    }
  }, [dirt, hpf, lpf, params.kit]);

  const scheduleNote = useCallback((stepNumber: number, time: number) => {
    if (!engineRef.current) return;
    
    // Looseness factor for micro-timing
    const loosenessFactor = looseness / 100;
    // Add micro-timing jitter (up to 12ms early or late)
    let playTime = time + (Math.random() * 0.024 - 0.012) * loosenessFactor;

    if (stepNumber % 2 !== 0) {
      const swingAmount = (swing - 50) / 100; 
      const stepDuration = (60 / tempo) / 4;
      playTime += swingAmount * stepDuration;
    }

    const p = patternRef.current;
    
    // Velocity humanization (up to +/- 15% variation)
    const humanizeVelocity = (vel: number) => {
        if (vel <= 0) return 0;
        const variation = (Math.random() * 0.3 - 0.15) * loosenessFactor;
        return Math.max(0.01, Math.min(1.0, vel + vel * variation));
    };

    if (p.kick[stepNumber] > 0) engineRef.current.playKick(playTime, humanizeVelocity(p.kick[stepNumber]));
    if (p.snare[stepNumber] > 0) engineRef.current.playSnare(playTime, humanizeVelocity(p.snare[stepNumber]));
    if (p.hihat[stepNumber] > 0) engineRef.current.playHihat(playTime, humanizeVelocity(p.hihat[stepNumber]), false);
    if (p.openHat[stepNumber] > 0) engineRef.current.playHihat(playTime, humanizeVelocity(p.openHat[stepNumber]), true);
    if (p.ghostSnare[stepNumber] > 0) engineRef.current.playSnare(playTime, humanizeVelocity(p.ghostSnare[stepNumber]) * 0.5);
    
    if (p.bass && p.bass[stepNumber] > 0 && p.bassNotes[stepNumber]) {
       engineRef.current.playBass(noteToFreq(p.bassNotes[stepNumber]), playTime, humanizeVelocity(p.bass[stepNumber]));
    }
    if (p.synth && p.synth[stepNumber] > 0 && p.synthNotes[stepNumber] && p.synthNotes[stepNumber].length > 0) {
       const freqs = p.synthNotes[stepNumber].map((n: string) => noteToFreq(n));
       engineRef.current.playSynth(freqs, playTime, p.synth[stepNumber], 'String Pad');
    }
    if (p.sampler && p.sampler[stepNumber] > 0 && p.samplerChops) {
       engineRef.current.playSlice(p.samplerChops[stepNumber], playTime, p.sampler[stepNumber]);
    }

    const timeToPlay = playTime - engineRef.current.ctx.currentTime;
    setTimeout(() => {
      setCurrentStep(stepNumber);
    }, Math.max(0, timeToPlay * 1000));
  }, [swing, tempo, looseness]);

  const scheduler = useCallback(() => {
    if (!engineRef.current) return;
    const lookahead = 0.1; 
    const scheduleAheadTime = 0.1; 
    const totalSteps = params.bars * 16;
    
    while (nextNoteTimeRef.current < engineRef.current.ctx.currentTime + scheduleAheadTime) {
      scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
      
      const secondsPerBeat = 60.0 / tempo;
      nextNoteTimeRef.current += 0.25 * secondsPerBeat; 
      currentStepRef.current = (currentStepRef.current + 1) % totalSteps;
    }
    
    timerIDRef.current = window.setTimeout(scheduler, lookahead * 1000);
  }, [tempo, scheduleNote, params.bars]);

  const getEngine = () => {
    if (!engineRef.current) {
      engineRef.current = new BreakmakerEngine();
      engineRef.current.setDirt(dirt);
      engineRef.current.setHPF(hpf);
      engineRef.current.setLPF(lpf);
      engineRef.current.setKitProfile(params.kit);
    }
    return engineRef.current;
  };

  const exportPattern = () => {
    const projectData = { name: breakName, tempo, swing, looseness, dirt, hpf, lpf, pattern, params };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${breakName.replace(/\s+/g, '_').toLowerCase()}_breakmaker.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleFileUpload = async (instrument: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const engine = getEngine();
    if (engine.ctx.state === 'suspended') {
        engine.ctx.resume();
    }
    const arrayBuffer = await file.arrayBuffer();
    await engine.loadSample(instrument, arrayBuffer);
    setParams(prev => ({...prev, kit: 'Custom Upload'}));

    const buffer = engine.customSamples[instrument];
    if (buffer) {
        engine.playSample(buffer, engine.ctx.currentTime, 1.0);
    }
  };

  const togglePlay = () => {
    const engine = getEngine();

    if (isPlaying) {
      setIsPlaying(false);
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
      setCurrentStep(0);
    } else {
      if (engine.ctx.state === 'suspended') {
        engine.ctx.resume();
      }
      setIsPlaying(true);
      currentStepRef.current = 0;
      nextNoteTimeRef.current = engine.ctx.currentTime + 0.05;
      scheduler();
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorDetails(null);
    try {
      const result = await generateBreakPattern(params);
      
      const padTrack = (track: number[]) => {
        const padded = createEmptyTrack();
        for (let i = 0; i < Math.min(track?.length || 0, 64); i++) padded[i] = track[i];
        return padded;
      };
      
      const padStringTrack = (track: string[]) => {
        const padded = createEmptyStringTrack();
        for (let i = 0; i < Math.min(track?.length || 0, 64); i++) padded[i] = track[i] || '';
        return padded;
      };
      
      const padArrayTrack = (track: string[][]) => {
        const padded = createEmptyArrayTrack();
        for (let i = 0; i < Math.min(track?.length || 0, 64); i++) padded[i] = track[i] || [];
        return padded;
      };

      if (result.pattern) {
        setPattern({
          kick: padTrack(result.pattern.kick || []),
          snare: padTrack(result.pattern.snare || []),
          hihat: padTrack(result.pattern.hihat || []),
          openHat: padTrack(result.pattern.openHat || []),
          ghostSnare: padTrack(result.pattern.ghostSnare || []),
          bass: padTrack(result.pattern.bass || []),
          bassNotes: padStringTrack(result.pattern.bassNotes || []),
          synth: padTrack(result.pattern.synth || []),
          synthNotes: padArrayTrack(result.pattern.synthNotes || []),
          sampler: padTrack(result.pattern.sampler || []),
          samplerChops: padTrack(result.pattern.samplerChops || []),
        });
      }
      if (result.tempo) setTempo(result.tempo);
      if (result.name) setBreakName(result.name);
      if (result.notes) setNotes(result.notes);
      
      // Auto-adjust swing based on feel
      if (params.feel.includes('Swing') || params.feel.includes('MPC')) setSwing(60);
      else if (params.feel.includes('Drunk')) setSwing(65);
      else setSwing(50);

      // Auto-adjust dirt based on era/kit
      if (params.era.includes('60s') || params.era.includes('70s') || params.kit.includes('Dirty')) {
        setDirt(60);
      } else {
        setDirt(20);
      }

    } catch (error: any) {
      console.error("Failed to generate break:", error);
      setErrorDetails(error?.message || "Generation failed. Please try again or check your quota.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleStep = (instrument: string, step: number) => {
    setPattern(prev => {
      const newPattern: any = { ...prev };
      const currentVal = newPattern[instrument][step];
      // Cycle: 0 -> 1 -> 0.5 -> 0
      let newVal = 0;
      if (currentVal === 0) {
          newVal = 1;
          if (instrument === 'bass') newPattern.bassNotes[step] = 'C2';
          if (instrument === 'synth') newPattern.synthNotes[step] = ['C3', 'E3', 'G3'];
          if (instrument === 'sampler') newPattern.samplerChops[step] = 0;
      }
      else if (currentVal === 1) newVal = 0.5;
      
      newPattern[instrument] = [...newPattern[instrument]];
      newPattern[instrument][step] = newVal;
      return newPattern;
    });
  };

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-100 font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-[#1a1a1a] p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
            <Settings2 className="w-5 h-5 text-zinc-900" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">BREAKMAKER</h1>
          <span className="text-xs font-mono text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded ml-2">v2.0</span>
        </div>
        
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 px-4 py-2 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {isGenerating ? 'DESIGNING...' : 'GENERATE BREAK'}
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Panel: Generation Workflow */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-5">
            <h2 className="text-xs font-mono text-amber-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[10px]">1</span>
              The Architect
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Length (Bars)</label>
                <select 
                  value={params.bars}
                  onChange={e => {
                    const newBars = parseInt(e.target.value);
                    const oldBars = params.bars;
                    setParams({...params, bars: newBars});
                    if (currentBarView > newBars) setCurrentBarView(newBars);

                    if (newBars > oldBars) {
                      setPattern(prev => {
                        const next = { ...prev };
                        ['kick', 'snare', 'hihat', 'openHat', 'ghostSnare'].forEach(inst => {
                           const track = next[inst as keyof typeof next] as number[];
                           const sourceBar = track.slice(0, 16);
                           for (let b = oldBars; b < newBars; b++) {
                               for (let i = 0; i < 16; i++) {
                                   track[b * 16 + i] = sourceBar[i] || 0;
                               }
                           }
                        });
                        return next;
                      });
                    }
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm focus:border-amber-500 outline-none"
                >
                  {[1, 2, 3, 4].map(b => <option key={b} value={b}>{b} Bar{b > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Era</label>
                <select 
                  value={params.era}
                  onChange={e => setParams({...params, era: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm focus:border-amber-500 outline-none"
                >
                  {ERAS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Drummer Profile</label>
                <select 
                  value={params.drummer}
                  onChange={e => {
                    const newDrummer = e.target.value;
                    const profile = DRUMMER_PROFILES.find(p => p.name === newDrummer);
                    setParams(prev => ({
                        ...prev, 
                        drummer: newDrummer,
                        kit: profile ? profile.kit : prev.kit,
                        feel: profile ? profile.feel : prev.feel
                    }));
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm focus:border-amber-500 outline-none"
                >
                  {DRUMMERS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Song Part</label>
                <select 
                  value={params.songPart}
                  onChange={e => setParams({...params, songPart: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm focus:border-amber-500 outline-none"
                >
                  {PARTS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-900 shadow-[0_0_15px_rgba(245,158,11,0.2)] px-4 py-3 rounded-md font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGenerating ? 'DESIGNING GROOVE...' : 'GENERATE GROOVE'}
            </button>
            
            {errorDetails && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs text-center">
                {errorDetails}
              </div>
            )}
          </div>

          {/* Producer Notes */}
          <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-5 h-full min-h-[150px]">
             <h2 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3">AI Producer Notes</h2>
             <p className="text-sm text-zinc-300 leading-relaxed italic opacity-80">
               "{notes}"
             </p>
          </div>
        </div>

        {/* Center Panel: Sequencer & Transport */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-6 shadow-xl">
            
            {/* Transport & Info */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button 
                  onClick={togglePlay}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isPlaying 
                      ? 'bg-amber-500 text-zinc-900 shadow-[0_0_20px_rgba(245,158,11,0.5)]' 
                      : 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700'
                  }`}
                >
                  {isPlaying ? <Square className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                </button>
                
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">{breakName}</h2>
                  <div className="text-xs font-mono text-zinc-500 flex gap-3 mt-1">
                    <span>{tempo} BPM</span>
                    <span>•</span>
                    <span>{params.bars * 16} STEPS</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border border-zinc-700/50 p-1 rounded-md bg-zinc-900/50">
                <button 
                  onClick={exportPattern}
                  className="px-3 py-1.5 flex items-center gap-2 hover:bg-zinc-800 rounded text-xs font-medium text-zinc-300 transition-colors"
                  title="Export Version"
                >
                  <Download className="w-3.5 h-3.5" /> Export Preset
                </button>
              </div>
            </div>

            {/* Bar Selector */}
            {params.bars > 1 && (
              <div className="flex gap-2 mb-4">
                {Array.from({ length: params.bars }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentBarView(i + 1)}
                    className={`px-3 py-1 text-xs font-mono rounded ${currentBarView === i + 1 ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                    BAR {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Sequencer Grid */}
            <SequencerGrid 
              pattern={pattern} 
              currentStep={currentStep} 
              currentBarView={currentBarView}
              onToggleStep={toggleStep} 
            />
            
            <div className="mt-4 flex justify-between text-[10px] text-zinc-500 font-mono uppercase">
              <span>Bar height = Drum Velocity (Human Dynamics)</span>
              <span>{params.bars} Bar Loop</span>
            </div>
          </div>

          <SamplerUI engine={getEngine()} />
        </div>

        {/* Right Panel: Audio Tweaks */}
        <div className="lg:col-span-3 space-y-4">

          <Mixer engine={getEngine()} />
          
          {/* Groove Profile */}
          <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-5">
            <h2 className="text-xs font-mono text-amber-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[10px]">2</span>
              Groove & Timing
            </h2>
            
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1 flex justify-between">
                  <span>Feel / Base Syncopation</span>
                  <span className="text-zinc-600 font-mono">Profile</span>
                </label>
                <select 
                  value={params.feel}
                  onChange={e => setParams({...params, feel: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm focus:border-amber-500 outline-none"
                >
                  {FEELS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-8">
              <Knob label="Tempo" value={tempo} onChange={setTempo} min={60} max={140} />
              <Knob label="Swing" value={swing} onChange={setSwing} min={50} max={75} />
              <Knob label="Looseness" value={looseness} onChange={setLooseness} min={0} max={100} />
            </div>
          </div>

          {/* Sound Profile */}
          <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-5 mt-4">
            <h2 className="text-xs font-mono text-amber-500/80 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[10px]">3</span>
              Texture & Mix
            </h2>
            
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1 flex justify-between">
                   <span>Kit Router</span>
                   <span className="text-zinc-600 font-mono">Routing</span>
                </label>
                <select 
                  value={params.kit}
                  onChange={e => setParams({...params, kit: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm focus:border-amber-500 outline-none"
                >
                  {KITS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>

              {params.kit === 'Custom Upload' && (
                <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/80 animate-in fade-in zoom-in duration-200">
                  <h3 className="text-[10px] font-mono text-zinc-500 uppercase mb-2">User Stems</h3>
                  <div className="space-y-2">
                     {['kick', 'snare', 'hihat', 'openHat', 'ghostSnare'].map((inst) => (
                       <div key={inst} className="flex justify-between items-center bg-zinc-950 border border-zinc-800/50 p-1.5 rounded">
                          <span className="text-[10px] text-zinc-400 font-mono w-16">{inst}</span>
                          <input type="file" accept="audio/*" className="text-[9px] text-zinc-500 w-full ml-1 file:mr-2 file:py-0.5 file:px-1.5 file:rounded file:border-0 file:text-[9px] file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer" onChange={(e) => handleFileUpload(inst, e)} />
                       </div>
                     ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-y-8">
              <Knob label="Tape / Dirt" value={dirt} onChange={setDirt} min={0} max={100} />
              <Knob label="HPF" value={hpf} onChange={setHpf} min={20} max={2000} formatValue={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}Hz`} />
              <Knob label="LPF" value={lpf} onChange={setLpf} min={500} max={20000} formatValue={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}Hz`} />
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
