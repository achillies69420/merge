import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));

// Lazy initializer for Gemini
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(customApiKey?: string): GoogleGenAI | null {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient || customApiKey) {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", offlineReady: true, timestamp: new Date().toISOString() });
});

// AI Spatial Program Generator
app.post("/api/ai/program-brief", async (req, res) => {
  try {
    const { prompt, typology, siteAreaM2, targetOccupancy, customApiKey } = req.body;
    const ai = getGeminiClient(customApiKey);

    if (!ai) {
      return res.status(400).json({
        error: "Gemini API key is not configured. You can use the offline CAD rules engine or provide an API key.",
      });
    }

    const systemPrompt = `You are a licensed Senior Architect and Master Spatial Planner. 
Given a project brief, typology, site area, and target occupancy, generate a realistic, standard architectural spatial brief and room program.
Return ONLY valid JSON matching this schema:
{
  "projectName": string,
  "typology": string,
  "levels": [
    {
      "name": string (e.g. "Level 0 - Ground Floor", "Level 1 - Upper Floor"),
      "elevationM": number,
      "maxFootprintM2": number,
      "rooms": [
        {
          "name": string,
          "category": "public" | "private" | "service" | "circulation" | "outdoor",
          "targetAreaM2": number,
          "daylightReq": "direct_south" | "diffuse_north" | "any" | "none",
          "acousticLevel": "quiet" | "moderate" | "loud",
          "notes": string
        }
      ]
    }
  ],
  "zoningAdvice": string,
  "circulationMultiplier": number
}`;

    const userContent = `Typology: ${typology || "Mixed-Use Cultural & Residential"}
Site Area: ${siteAreaM2 || 650} m²
Target Occupancy: ${targetOccupancy || 45} people
User Prompt: ${prompt || "Modern sustainable community center with exhibition gallery, cafe, workshop studios, and admin."}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error("AI Program Brief Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate architectural brief" });
  }
});

// AI Spatial Critique Endpoint
app.post("/api/ai/critique", async (req, res) => {
  try {
    const { canvasState, customApiKey } = req.body;
    const ai = getGeminiClient(customApiKey);

    if (!ai) {
      return res.status(400).json({
        error: "Gemini API key is not configured. Switch to Offline CAD Rules mode for deterministic checking.",
      });
    }

    const systemPrompt = `You are a renowned Architecture Critic, Studio Professor, and Building Code Juror.
Analyze the provided architectural canvas data (levels, rooms, areas, adjacencies, orientation, metrics like GFA, CES footprint coverage, COS floor area ratio).
Provide a constructive, high-caliber jury critique with:
1. Spatial Organization & Hierarchy (Circulation, flow, clustering)
2. Bioclimatic & Orientation Performance (Daylight orientation, solar exposure, thermal zoning)
3. Acoustic & Functional Conflicts (e.g., loud workshop next to quiet library)
4. Program & Zoning Compliance (GFA, ground coverage efficiency)
5. 3 specific, actionable recommendations to improve the scheme.

Format response as clean JSON:
{
  "overallScore": number (1 to 100),
  "verdict": string,
  "strengths": string[],
  "warnings": string[],
  "bioclimaticNotes": string,
  "recommendations": string[]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `Architectural Project Data:\n${JSON.stringify(canvasState, null, 2)}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error("AI Critique Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate critique" });
  }
});

// AI Adjacency Suggestions
app.post("/api/ai/adjacencies", async (req, res) => {
  try {
    const { rooms, typology, customApiKey } = req.body;
    const ai = getGeminiClient(customApiKey);

    if (!ai) {
      return res.status(400).json({
        error: "Gemini API key not configured.",
      });
    }

    const systemPrompt = `You are an architectural spatial programmer.
Given a list of rooms and typology, calculate optimal adjacency links between them.
Categories of links: 'direct_access' (needs immediate physical connection/door), 'visual_link' (glazing/line of sight), 'acoustic_buffer' (needs sound separation/hallway buffer).
Return JSON:
{
  "connections": [
    {
      "sourceRoom": string,
      "targetRoom": string,
      "type": "direct_access" | "visual_link" | "acoustic_buffer",
      "rationale": string
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `Typology: ${typology}\nRooms:\n${JSON.stringify(rooms)}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (error: any) {
    console.error("AI Adjacencies Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate adjacencies" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ArchiCanvas Studio Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
