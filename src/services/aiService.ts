import { GoogleGenAI } from "@google/genai";

export const extractCardName = async (base64Image: string): Promise<string | null> => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set.");
      return null;
    }
    const genAI = new GoogleGenAI({ apiKey });
    const model = genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: "Extract the name of this Magic: The Gathering card. Return ONLY the name." },
            { inlineData: { mimeType: "image/jpeg", data: base64Image.replace(/^data:image\/\w+;base64,/, "") } }
          ]
        }
      ]
    });
    const response = await model;
    return response.text?.trim() || null;
  } catch (error) {
    console.error("Error extracting card name:", error);
    return null;
  }
};
