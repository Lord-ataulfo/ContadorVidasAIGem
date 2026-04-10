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
      genAI = new GoogleGenAI(apiKey);
    }
    return genAI;
  };

  // API Route for card name extraction
  app.post("/api/extract-card-name", async (req, res) => {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const aiInstance = getAI();
    if (!aiInstance) {
      return res.status(500).json({ error: "AI service not configured on server" });
    }

    try {
      const model = aiInstance.getGenerativeModel({ model: "gemini-1.5-flash" });
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

      const result = await model.generateContent([
        "Extract the name of this Magic: The Gathering card. The name is located in the top left corner. Return ONLY the name of the card, nothing else.",
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64,
          },
        },
      ]);

      const text = result.response.text();
      res.json({ name: text ? text.trim() : null });
    } catch (error) {
      console.error("Error extracting card name on server:", error);
      res.status(500).json({ error: "Failed to extract card name" });
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
