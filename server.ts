import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  app.post("/api/generate", async (req, res) => {
    try {
      const params = req.body;
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
        model: "gemini-2.5-pro-preview", // Updated model name as requested
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

      res.json(JSON.parse(response.text || "{}"));
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
