export interface SynthPatch {
  type: string;
  filterCutoff: number;
  filterRes: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SamplerPad {
  sliceIndex: number;
  pitch: number;
  reverse: boolean;
  gain: number;
}

export class BreakmakerEngine {
  ctx: AudioContext | OfflineAudioContext;
  masterGain: GainNode;
  compressor: DynamicsCompressorNode;
  distortion: WaveShaperNode;
  hpf: BiquadFilterNode;
  lpf: BiquadFilterNode;
  tapeEQ: BiquadFilterNode;
  tapeLow: BiquadFilterNode;
  hatBuffer: AudioBuffer;

  drumBus: GainNode;
  bassBus: GainNode;
  synthBus: GainNode;
  samplerBus: GainNode;

  kitProfile: string = 'Vintage Ludwig';
  customSamples: Record<string, AudioBuffer | null> = {
    kick: null, snare: null, hihat: null, openHat: null, ghostSnare: null
  };
  userLoopBuffer: AudioBuffer | null = null;
  currentSlices: number[] = [];
  padBank: SamplerPad[] = Array.from({ length: 16 }, (_, i) => ({
    sliceIndex: i,
    pitch: 0,
    reverse: false,
    gain: 1.0
  }));

  synthPatch: SynthPatch = {
    type: 'sawtooth',
    filterCutoff: 1500,
    filterRes: 1,
    attack: 0.1,
    decay: 0.3,
    sustain: 0.5,
    release: 0.8
  };

  bassPatch: SynthPatch = {
    type: 'triangle',
    filterCutoff: 800,
    filterRes: 2,
    attack: 0.05,
    decay: 0.4,
    sustain: 0.2,
    release: 0.4
  };

  
  constructor(context?: AudioContext | OfflineAudioContext) {
    this.ctx = context || new (window.AudioContext || (window as any).webkitAudioContext)();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8; // Headroom
    
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -15;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.1;

    this.distortion = this.ctx.createWaveShaper();
    
    this.hpf = this.ctx.createBiquadFilter();
    this.hpf.type = 'highpass';
    this.hpf.frequency.value = 20;

    this.lpf = this.ctx.createBiquadFilter();
    this.lpf.type = 'lowpass';
    this.lpf.frequency.value = 20000;

    this.tapeEQ = this.ctx.createBiquadFilter();
    this.tapeEQ.type = 'peaking';
    this.tapeEQ.frequency.value = 1500;
    this.tapeEQ.Q.value = 0.8;
    this.tapeEQ.gain.value = 1.5;

    this.tapeLow = this.ctx.createBiquadFilter();
    this.tapeLow.type = 'lowshelf';
    this.tapeLow.frequency.value = 80;
    this.tapeLow.gain.value = 2.5;

    // Mixer Buses
    this.drumBus = this.ctx.createGain();
    this.bassBus = this.ctx.createGain();
    this.synthBus = this.ctx.createGain();
    this.samplerBus = this.ctx.createGain();

    // Routing
    // Drums get dirty, Sampler goes to filters, Bass/Synth straight to TapeEQ
    this.drumBus.connect(this.distortion);
    this.samplerBus.connect(this.hpf);
    
    this.distortion.connect(this.hpf);
    this.hpf.connect(this.lpf);
    this.lpf.connect(this.tapeEQ);

    this.bassBus.connect(this.tapeEQ);
    this.synthBus.connect(this.tapeEQ);

    this.tapeEQ.connect(this.tapeLow);
    this.tapeLow.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Create hi-hat/snare noise buffer
    const hatSize = this.ctx.sampleRate * 1.0;
    this.hatBuffer = this.ctx.createBuffer(1, hatSize, this.ctx.sampleRate);
    const hatData = this.hatBuffer.getChannelData(0);
    for (let i = 0; i < hatSize; i++) {
        hatData[i] = Math.random() * 2 - 1;
    }
    
    this.setDirt(0);
  }

  setKitProfile(kit: string) {
    this.kitProfile = kit;
  }

  async loadSample(instrument: string, arrayBuffer: ArrayBuffer) {
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.customSamples[instrument] = audioBuffer;
  }
  
  playSample(buffer: AudioBuffer, time: number, velocity: number) {
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    source.connect(gain);
    gain.connect(this.drumBus);
    gain.gain.setValueAtTime(velocity, time);
    source.start(time);
  }

  setDirt(amount: number) {
    const k = amount * 2;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.distortion.curve = curve;
    this.distortion.oversample = '4x';
  }

  setHPF(freq: number) {
    this.hpf.frequency.value = freq;
  }

  setLPF(freq: number) {
    this.lpf.frequency.value = freq;
  }

  playKick(time: number, velocity: number) {
    if (velocity <= 0) return;
    if (this.customSamples.kick) {
      this.playSample(this.customSamples.kick, time, velocity);
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.drumBus);

    const is808 = this.kitProfile.includes('808') || this.kitProfile.includes('MPC');
    const isHeavy = this.kitProfile.includes('Vistalite') || this.kitProfile.includes('Gretsch');

    if (is808) {
       osc.frequency.setValueAtTime(150, time);
       osc.frequency.exponentialRampToValueAtTime(30, time + 0.5);
       gain.gain.setValueAtTime(velocity * 1.5, time);
       gain.gain.exponentialRampToValueAtTime(0.01, time + 0.6);
       osc.start(time);
       osc.stop(time + 0.6);
    } else if (isHeavy) {
       // Boomy loud acoustic
       osc.frequency.setValueAtTime(120, time);
       osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);
       osc.frequency.exponentialRampToValueAtTime(25, time + 0.2);
       gain.gain.setValueAtTime(velocity * 1.8, time);
       gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
       osc.start(time);
       osc.stop(time + 0.25);
    } else {
       // 70s Dry Ludwig Kick
       osc.frequency.setValueAtTime(120, time);
       osc.frequency.exponentialRampToValueAtTime(50, time + 0.04);
       osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
       gain.gain.setValueAtTime(velocity * 1.5, time);
       gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

       const click = this.ctx.createOscillator();
       const clickGain = this.ctx.createGain();
       click.type = 'square';
       click.connect(clickGain);
       
       const clickFilter = this.ctx.createBiquadFilter();
       clickFilter.type = 'bandpass';
       clickFilter.frequency.value = 2500;
       clickFilter.Q.value = 1.0;
       
       clickGain.connect(clickFilter);
       clickFilter.connect(this.distortion);
       
       click.frequency.setValueAtTime(800, time);
       click.frequency.exponentialRampToValueAtTime(100, time + 0.02);
       
       clickGain.gain.setValueAtTime(velocity * 0.4, time);
       clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.02);

       osc.start(time);
       osc.stop(time + 0.15);
       click.start(time);
       click.stop(time + 0.02);
    }
  }

  playSnare(time: number, velocity: number) {
    if (velocity <= 0) return;
    
    // For ghost snares, check custom sample fallback:
    if (velocity < 1 && this.customSamples.ghostSnare) {
        this.playSample(this.customSamples.ghostSnare, time, velocity);
        return;
    }
    if (this.customSamples.snare) {
      this.playSample(this.customSamples.snare, time, velocity);
      return;
    }

    const is808 = this.kitProfile.includes('808') || this.kitProfile.includes('MPC');
    const isHeavy = this.kitProfile.includes('Vistalite') || this.kitProfile.includes('Gretsch');

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    
    osc1.type = is808 ? 'triangle' : 'sine';
    osc2.type = 'sine';
    
    osc1.connect(bodyGain);
    osc2.connect(bodyGain);
    bodyGain.connect(this.distortion);

    const baseF = isHeavy ? 180 : 220;
    
    osc1.frequency.setValueAtTime(baseF, time);
    osc1.frequency.exponentialRampToValueAtTime(baseF - 50, time + 0.08);
    osc2.frequency.setValueAtTime(baseF * 1.5, time);
    osc2.frequency.exponentialRampToValueAtTime(baseF, time + 0.08);
    
    bodyGain.gain.setValueAtTime(velocity * 1.2, time);
    bodyGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
    
    // Snare wires (noise)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.hatBuffer; 
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = is808 ? 5000 : (isHeavy ? 2500 : 3500);
    noiseFilter.Q.value = is808 ? 0.8 : 1.2;
    
    const noiseHighpass = this.ctx.createBiquadFilter();
    noiseHighpass.type = 'highpass';
    noiseHighpass.frequency.value = is808 ? 2000 : 1500;
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseHighpass);
    
    const noiseGain = this.ctx.createGain();
    noiseHighpass.connect(noiseGain);
    noiseGain.connect(this.distortion);
    
    const noiseDecay = is808 ? 0.25 : (isHeavy ? 0.2 : 0.15);
    noiseGain.gain.setValueAtTime(velocity * (is808 ? 1.2 : 0.8), time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + noiseDecay);
    
    osc1.start(time);
    osc1.stop(time + 0.12);
    osc2.start(time);
    osc2.stop(time + 0.12);
    noise.start(time);
    noise.stop(time + noiseDecay);
  }

  playHihat(time: number, velocity: number, open: boolean = false) {
    if (velocity <= 0) return;
    if (open && this.customSamples.openHat) {
        this.playSample(this.customSamples.openHat, time, velocity);
        return;
    } else if (!open && this.customSamples.hihat) {
        this.playSample(this.customSamples.hihat, time, velocity);
        return;
    }

    const duration = open ? 0.4 : 0.06; 
    const is808 = this.kitProfile.includes('808') || this.kitProfile.includes('MPC');
    
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0, time);
    oscGain.gain.linearRampToValueAtTime(velocity * 0.4, time + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = is808 ? 7000 : 8500;
    bandpass.Q.value = 1.5;
    
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = is808 ? 5000 : 7000;
    
    oscGain.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(this.distortion);
    
    const ratios = is808 ? [2, 3, 4.16, 5.43, 6.77, 8.15] : [2.5, 3.2, 4.1, 5.8, 6.3, 7.1];
    const baseFreq = is808 ? 300 : 350;

    ratios.forEach(ratio => {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = baseFreq * ratio;
      osc.connect(oscGain);
      osc.start(time);
      osc.stop(time + duration);
    });
    
    // Filtered noise for sizzle and air
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.hatBuffer;
    const noiseGain = this.ctx.createGain();
    
    noiseGain.gain.setValueAtTime(velocity * (is808 ? 0.1 : 0.3), time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 9000;
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.drumBus);
    
    noise.start(time);
    noise.stop(time + duration);
  }

  loadUserLoop(buffer: AudioBuffer, slices: number[]) {
    this.userLoopBuffer = buffer;
    this.currentSlices = slices;
  }

  playPad(padIndex: number, time: number, velocity: number) {
    if (!this.userLoopBuffer || velocity <= 0 || padIndex === undefined || padIndex === null) return;
    const pad = this.padBank[padIndex];
    if (!pad) return;

    const sliceIdx = pad.sliceIndex;
    const slices = this.currentSlices;
    if (sliceIdx >= slices.length || sliceIdx < 0) return;

    const startTime = slices[sliceIdx];
    const endTime = sliceIdx < slices.length - 1 ? slices[sliceIdx + 1] : this.userLoopBuffer.duration;
    const duration = endTime - startTime;

    const source = this.ctx.createBufferSource();
    source.buffer = this.userLoopBuffer;
    const gain = this.ctx.createGain();

    if (pad.pitch !== 0) {
      source.playbackRate.value = Math.pow(2, pad.pitch / 12);
    }
    
    // Note: AudioBufferSourceNode reverse is tricky without copying buffer, 
    // but typically people just use a reversed buffer or apply it at slice time.
    // We'll skip true reverse for now or leave a comment, since it's hard to do in-place in WebAudio.
    // (A real implementation would pre-reverse the snippet audio buffer).

    source.connect(gain);
    gain.connect(this.samplerBus);

    gain.gain.setValueAtTime(velocity * pad.gain, time);
    gain.gain.setValueAtTime(velocity * pad.gain, time + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    source.start(time, startTime, duration);
  }

  playBass(noteFreq: number, time: number, velocity: number) {
    if (velocity <= 0 || noteFreq <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = this.bassPatch.type as OscillatorType;
    osc.frequency.value = noteFreq;

    filter.type = 'lowpass';
    filter.Q.value = this.bassPatch.filterRes;
    filter.frequency.setValueAtTime(this.bassPatch.filterCutoff * 2, time);
    filter.frequency.exponentialRampToValueAtTime(this.bassPatch.filterCutoff, time + this.bassPatch.decay);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bassBus);

    const atkTime = time + Math.max(0.005, this.bassPatch.attack);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity, atkTime);
    
    // Decay to sustain
    gain.gain.exponentialRampToValueAtTime(Math.max(0.01, velocity * this.bassPatch.sustain), atkTime + this.bassPatch.decay);

    // Release
    const releaseTime = atkTime + this.bassPatch.decay + this.bassPatch.release;
    gain.gain.setValueAtTime(Math.max(0.01, velocity * this.bassPatch.sustain), releaseTime - this.bassPatch.release);
    gain.gain.linearRampToValueAtTime(0, releaseTime);

    osc.start(time);
    osc.stop(releaseTime);
  }

  playSynth(freqs: number[], time: number, velocity: number, synthType?: string) {
    if (velocity <= 0 || !freqs.length) return;
    
    freqs.forEach(freq => {
        if (freq <= 0) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.synthBus);

        osc.type = this.synthPatch.type as OscillatorType;
        osc.frequency.value = freq;
        filter.type = 'lowpass';
        filter.Q.value = this.synthPatch.filterRes;
        
        // Envelope applied to filter
        filter.frequency.setValueAtTime(this.synthPatch.filterCutoff / 2, time);
        filter.frequency.linearRampToValueAtTime(this.synthPatch.filterCutoff, time + this.synthPatch.attack);
        filter.frequency.exponentialRampToValueAtTime(this.synthPatch.filterCutoff * 0.5, time + this.synthPatch.attack + this.synthPatch.decay);

        // Amplitude Envelope
        const atkTime = time + Math.max(0.005, this.synthPatch.attack);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(velocity * 0.5, atkTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, velocity * 0.5 * this.synthPatch.sustain), atkTime + this.synthPatch.decay);
        
        const releaseTime = atkTime + this.synthPatch.decay + this.synthPatch.release;
        gain.gain.setValueAtTime(Math.max(0.001, velocity * 0.5 * this.synthPatch.sustain), releaseTime - this.synthPatch.release);
        gain.gain.linearRampToValueAtTime(0, releaseTime);
        
        osc.start(time);
        osc.stop(releaseTime);
    });
  }
}
