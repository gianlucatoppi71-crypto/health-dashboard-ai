import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { imageBase64 } = JSON.parse(req.body);

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this food. Return ONLY JSON." },
            {
              type: "image_url",
              image_url: `data:image/jpeg;base64,${imageBase64}`
            }
          ]
        }
      ],
      max_tokens: 500
    });

    const raw = response.choices[0].message.content;

    // Safe JSON extraction
    const json = JSON.parse(raw.replace(/```json|```/g, ""));

    res.status(200).json(json);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Food scan failed" });
  }
}

