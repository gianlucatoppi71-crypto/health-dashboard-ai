export const config = {
  runtime: "nodejs"
};
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const { imageBase64 } = JSON.parse(req.body);

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Analyze this food image.
      Return ONLY a JSON object with EXACTLY these fields:
      {
        "name": "string",
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "description": "string"
      }
      No markdown, no explanation, no extra text.
    `;

    const image = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg"
      }
    };

    const result = await model.generateContent([prompt, image]);
    let text = result.response.text().trim();

    // Remove accidental markdown fences
    text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

    // Extract JSON safely
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1) {
      return res.status(200).json({
        name: "Unknown",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        description: "No description"
      });
    }

    const jsonText = text.slice(start, end + 1);
    const data = JSON.parse(jsonText);

    return res.status(200).json(data);

  } catch (error) {
    console.error("Backend error:", error);
    return res.status(500).json({
      name: "Unknown",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      description: "Scan failed"
    });
  }
}
