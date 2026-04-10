import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // AI Logic - Server Side
  let genAI: any = null;
  const getAI = () => {
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is not set in the server environment.");
        return null;
      }
      genAI = new GoogleGenAI({ apiKey });
    }
    return genAI;
  };

  // API Route for card name extraction
  // CRITICAL: This must be defined BEFORE Vite middleware
  app.post("/api/extract-card-name", async (req, res) => {
    console.log("Received extraction request on server");
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const aiInstance = getAI();
    if (!aiInstance) {
      return res.status(500).json({ error: "AI service not configured on server. Check GEMINI_API_KEY." });
    }

    try {
      // Use the correct model name from the skill
      const modelName = "gemini-3-flash-preview";
      
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

      const result = await aiInstance.models.generateContent({
        model: modelName,
        contents: [
          {
            parts: [
              {
                text: "Extract the name of this Magic: The Gathering card. The name is located in the top left corner. Return ONLY the name of the card, nothing else.",
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
      });

      const text = result.text;
      console.log("Extraction successful:", text);
      res.json({ name: text ? text.trim() : null });
    } catch (error: any) {
      console.error("Error extracting card name on server:", error);
      res.status(500).json({ error: error.message || "Failed to extract card name" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
