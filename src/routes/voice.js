// routes/voice.js
import express from "express";
import OpenAI from "openai";

const router = express.Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * AI Parser for voice command
 */
router.post("/parse", async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "No command" });

    const prompt = `
      You are an AI inventory assistant. 
      Extract structured product details from the text command.

      ⚠ Important rules:
      - Always return **valid JSON only**
      - If multiple products are mentioned, return them in a "products" array
      - Each product must include: name, quantity, unit, price, currency, category
      - Include the currency exactly as spoken (e.g., "rupees", "dollars", "euro")
      - Do not convert currencies
      - If the user does NOT mention category, **infer the most likely category from the product name**
        (Examples: Mango → Fruits, Potato → Vegetables, Laptop → Electronics, AA Battery → Batteries, Soap → Grocery)

      Example 1:
      Command: "Add 5 kg mango for 120 rupees"
      Response: {
        "products":[
          {"name":"Mango","quantity":5,"unit":"kg","price":120,"currency":"rupees","category":"Fruits"}
        ]
      }

      Example 2:
      Command: "Add 10 laptop for 500 dollars each"
      Response: {
        "products":[
          {"name":"Laptop","quantity":10,"unit":"pcs","price":500,"currency":"dollars","category":"Electronics"}
        ]
      }

      Example 3:
      Command: "Add 4 soap for 40 rupees"
      Response: {
        "products":[
          {"name":"Soap","quantity":4,"unit":"pcs","price":40,"currency":"rupees","category":"Grocery"}
        ]
      }

      Now parse:
      Command: "${command}"
      Response:
    `;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    });

    let parsed = {};
    try {
      const content = completion.choices[0].message.content.trim();
      parsed = JSON.parse(content);
    } catch (err) {
      console.error("Parse error:", err);
      return res.status(400).json({ error: "AI parsing failed" });
    }

    return res.json(parsed);
  } catch (err) {
    console.error("AI parse error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
