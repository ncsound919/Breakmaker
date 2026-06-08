import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
  const totalSteps = params.bars * 16;
  const prompt = `You are a world-class beatmaker and session producer.
Generate a ${params.bars}-bar structured groove (total ${totalSteps} steps).

Parameters:
Era: ${params.era}
Drummer Style: ${params.drummer}
Kit: ${params.kit}
Feel: ${params.feel}
Song Part: ${params.songPart}

CRITICAL RULES:
1. THE BACKBEAT: Strong Snare (velocity 0.9 to 1.0) on beats 2 and 4. Anchor beat 1 with a Kick.
2. GROOVE STRUCTURE: Repeat your core rhythms.
3. THE GROOVE: Make the hi-hats breathe (velocities 0.2 to 1.0). Use ghost notes (velocity 0.1 to 0.4) strictly for funk rolls.
4. NEW MELODIC ELEMENTS: Write a P-bass line (velocities in 'bass', note strings in 'bassNotes' e.g. "C2"). Write a polysynth part (velocities in 'synth', arrays of notes in 'synthNotes' e.g. ["C3", "E3"]). Tie them to the pocket.
5. NEW SAMPLER: Sequence 'sampler' velocities and 'samplerChops' indices (0, 1, 2) acting like MPC chop slicing.

Return a JSON object conforming exactly to the tools output constraint, with arrays exactly ${totalSteps} numbers long. Use '' for rest notes or empty arrays [] for rest chords.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          tempo: { type: Type.NUMBER },
          notes: { type: Type.STRING },
          pattern: {
            type: Type.OBJECT,
            properties: {
              kick: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              snare: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              hihat: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              openHat: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              ghostSnare: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              bass: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              bassNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
              synth: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              synthNotes: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } },
              sampler: { type: Type.ARRAY, items: { type: Type.NUMBER } },
              samplerChops: { type: Type.ARRAY, items: { type: Type.NUMBER } }
            },
            required: ["kick", "snare", "hihat", "openHat", "ghostSnare"]
          }
        },
        required: ["name", "tempo", "notes", "pattern"]
      }
    }
  });
  
  return JSON.parse(response.text || "{}");
}
