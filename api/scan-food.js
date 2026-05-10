import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const { imageBase64 } = JSON.parse(req.body);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Analyze this food. Return ONLY JSON with name, calories, protein, carbs, fat, description.";

    const image = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg"
      }
    };

    const result = await model.generateContent([prompt, image]);
    const text = result.response.text();

    const json = JSON.parse(text.replace(/```json|```/g, ""));

    res.status(200).json(json);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Food scan failed" });
  }
}
