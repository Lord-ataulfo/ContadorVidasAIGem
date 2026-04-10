import { GoogleGenAI } from "@google/genai";

let ai: any = null;

const getAI = () => {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. AI features will not work.");
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const extractCardName = async (base64Image: string): Promise<string | null> => {
  const genAI = getAI();
  if (!genAI) return null;

  try {
    // Remove data:image/...;base64, prefix if present
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
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

    const text = response.text;
    return text ? text.trim() : null;
  } catch (error) {
    console.error("Error extracting card name:", error);
    return null;
  }
};
