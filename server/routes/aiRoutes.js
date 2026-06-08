const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

function smartFallback(message) {
  const text = message.toLowerCase();

  let service = "Full Move";
  let time = "3–5 hours";
  let reason = "because packing, lifting, loading, transport, and unloading may be needed";

  if (text.includes("transport only") || text.includes("only transport")) {
    service = "Transport Only";
    time = "1–3 hours";
    reason = "because you mainly need vehicle transport";
  }

  if (text.includes("packing") && !text.includes("move")) {
    service = "Packing Help";
    time = "1–2 hours";
    reason = "because you mainly need help packing and lifting";
  }

  if (text.includes("2bhk") || text.includes("2 bhk")) {
    time = "3–5 hours";
  }

  if (text.includes("sofa") || text.includes("bed") || text.includes("fridge") || text.includes("washing machine")) {
    time = "4–6 hours";
  }

  return `For your request, ${service} is recommended ${reason}. Estimated time is ${time}. Final price depends on distance, inventory size, floor/lift access, and moving time.`;
}

router.post("/assistant", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const fallbackReply = smartFallback(message);

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "dummy_key") {
      return res.json({ reply: fallbackReply });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const prompt = `
You are VAN MAN's moving-service assistant.

Customer message: "${message}"

Reply like a helpful moving company assistant.
Use exactly 3 short bullet points:
1. Recommended service: Full Move / Transport Only / Packing Help
2. Estimated time with reason
3. Price note: depends on distance, inventory, stairs/lift, and time

Do not sound generic.
`;

    const modelsToTry = ["gemini-1.5-flash-latest", "gemini-pro"];

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const reply = result.response.text();
        return res.json({ reply });
      } catch (err) {
        console.log(`AI MODEL FAILED (${modelName}):`, err.message);
      }
    }

    res.json({ reply: fallbackReply });
  } catch (err) {
    console.log("AI ERROR:", err.message);
    res.json({ reply: smartFallback(req.body.message || "") });
  }
});

module.exports = router;