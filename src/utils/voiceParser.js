// // Simple parser for commands like: "add 5 mango", "5 mango", "dozen eggs", "add one shampoo"

const numberWords = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, dozen: 12,
  // Urdu basics
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, che: 6, chay: 6, saat: 7, aath: 8, nau: 9, das: 10
};

const unitWords = ['kg','kilo','kilogram','g','gram','l','liter','litre','ml','pack','packs','pcs','piece','pieces','dozen','dz'];

export function parseVoiceCommand(raw) {
  if (!raw) return null;
  let text = raw.toLowerCase().replace(/\s+/g, ' ').trim();

  // convert number words to digits (basic)
  for (const [w, n] of Object.entries(numberWords)) {
    text = text.replace(new RegExp(`\\b${w}\\b`, 'g'), String(n));
  }

  // extract number (first occurrence)
  const numMatch = text.match(/(?:(?:^|\s))(\d+(?:\.\d+)?)/);
  let quantity = numMatch ? parseFloat(numMatch[1]) : 1;

  // dozen special handling
  if (/\b(dozen|dz)\b/.test(text) && !numMatch) {
    quantity = 12;
  }

  // remove helper words
  let name = text
    .replace(/\b(add|please|plz|karo|kara|kar|inventory|me|main|mein)\b/g, '')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '') // remove numbers
    .replace(new RegExp(`\\b(${unitWords.join('|')})\\b`, 'g'), '') // remove units
    .replace(/\s+/g, ' ')
    .trim();

  // If still empty, fallback to raw text
  if (!name) name = raw.trim();

  // unit extraction
  const unitMatch = text.match(new RegExp(`\\b(${unitWords.join('|')})\\b`));
  const unit = unitMatch ? unitMatch[1] : 'pcs';

  return { name, quantity, unit };
}


// import OpenAI from "openai";
// import dotenv from "dotenv";
// dotenv.config();


// // Rule-based fallback parser
// const numberWords = {
//   zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
//   six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
//   eleven: 11, twelve: 12, dozen: 12,
//   ek: 1, do: 2, teen: 3, char: 4, chaar: 4,
//   paanch: 5, che: 6, chay: 6, saat: 7, aath: 8, nau: 9, das: 10
// };

// const unitWords = ['kg','kilo','kilogram','g','gram','l','liter','litre','ml','pack','packs','pcs','piece','pieces','dozen','dz'];

// function fallbackParser(raw) {
//   if (!raw) return null;
//   let text = raw.toLowerCase().replace(/\s+/g, ' ').trim();

//   // convert number words
//   for (const [w, n] of Object.entries(numberWords)) {
//     text = text.replace(new RegExp(`\\b${w}\\b`, 'g'), String(n));
//   }

//   // extract number
//   const numMatch = text.match(/(?:(?:^|\s))(\d+(?:\.\d+)?)/);
//   let quantity = numMatch ? parseFloat(numMatch[1]) : 1;

//   // dozen special
//   if (/\b(dozen|dz)\b/.test(text) && !numMatch) {
//     quantity = 12;
//   }

//   // clean up name
//   let name = text
//     .replace(/\b(add|please|plz|karo|kara|kar|inventory|me|main|mein)\b/g, '')
//     .replace(/\b(\d+(?:\.\d+)?)\b/g, '')
//     .replace(new RegExp(`\\b(${unitWords.join('|')})\\b`, 'g'), '')
//     .replace(/\s+/g, ' ')
//     .trim();

//   if (!name) name = raw.trim();

//   // unit
//   const unitMatch = text.match(new RegExp(`\\b(${unitWords.join('|')})\\b`));
//   const unit = unitMatch ? unitMatch[1] : 'pcs';

//   return { name, quantity, unit };
// }

// // AI Parser
// export async function parseVoiceCommand(raw) {
//   if (!raw) return null;

//   try {
//     const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//     const response = await client.chat.completions.create({
//       model: "gpt-4o-mini", // fast & cheap
//       messages: [
//         { role: "system", content: "You are an AI that extracts product details from user input." },
//         {
//           role: "user",
//           content: `Extract product name, quantity, and unit from this command: "${raw}". 
//           Always respond in JSON format like: { "name": "milk", "quantity": 2, "unit": "pack" }`
//         }
//       ],
//       temperature: 0,
//     });

//     const aiText = response.choices[0].message.content.trim();

//     // Try to parse JSON
//     const parsed = JSON.parse(aiText);
//     if (parsed.name && parsed.quantity) {
//       return parsed;
//     }

//     throw new Error("AI parsing failed");
//   } catch (err) {
//     console.error("AI parser failed, using fallback:", err.message);
//     return fallbackParser(raw);
//   }
// }

import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function parseDeleteCommand(command) {
  const prompt = `
User bola: "${command}"
Extract karo products aur quantities ko JSON me.
Agar quantity nahi di to 1 maan lo.
Example output:
[
  { "name": "mango", "qty": 5 },
  { "name": "rice", "qty": 2 }
]
Sirf JSON return karo, extra text mat likho.
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  let parsed;
  try {
    parsed = JSON.parse(response.choices[0].message.content);
  } catch (err) {
    parsed = [];
  }

  return parsed;
}
