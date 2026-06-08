export interface BreakParams {
  era: string;
  drummer: string;
  kit: string;
  feel: string;
  songPart: string;
  bars: number;
}

export interface BreakPattern {
  name: string;
  tempo: number;
  notes: string;
  pattern: {
    kick: number[];
    snare: number[];
    hihat: number[];
    openHat: number[];
    ghostSnare: number[];
    bass?: number[];
    bassNotes?: string[];
    synth?: number[];
    synthNotes?: string[][];
    sampler?: number[];
    samplerChops?: number[];
  };
}

export async function generateBreakPattern(params: BreakParams): Promise<BreakPattern> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Error: ${response.status}`);
  }
  
  return response.json();
}
