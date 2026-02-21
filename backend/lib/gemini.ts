import { GoogleGenAI } from "@google/genai";

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODEL = "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// 1. Label Extraction (Vision) — takes a base64 image, returns ScannedMedication
// ---------------------------------------------------------------------------

const EXTRACT_PROMPT = `You are a pharmacist assistant. Analyze this pill bottle label image and extract medication information.

Return ONLY a valid JSON object with exactly these fields:
{
  "name": "generic medication name",
  "brandName": "brand name or null",
  "dosage": "e.g. 500mg",
  "form": "tablet" | "capsule" | "liquid" | "patch" | "inhaler" | "other",
  "frequency": "once" | "twice" | "three_times" | "four_times" | "as_needed",
  "suggestedTimes": ["HH:MM in 24hr format"],
  "instructions": "plain English instruction, e.g. Take with food",
  "color": "physical description of the pill or null",
  "confidence": 0.0 to 1.0,
  "rawLabelText": "the raw text you read from the label"
}

Rules:
- frequency "once" → suggestedTimes has 1 entry, "twice" → 2 entries, etc.
- Use sensible default times: morning=08:00, noon=12:00, evening=18:00, bedtime=22:00
- instructions should be warm and simple, not clinical jargon
- If you can't read part of the label, lower the confidence score
- Return ONLY the JSON object, no markdown fences, no explanation`;

export async function extractLabelFromImage(imageBase64: string) {
    const response = await gemini.models.generateContent({
        model: MODEL,
        contents: [
            {
                role: "user",
                parts: [
                    { text: EXTRACT_PROMPT },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: imageBase64,
                        },
                    },
                ],
            },
        ],
    });

    const text = response.text?.trim() ?? "";
    // Strip markdown fences if Gemini wraps in ```json ... ```
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
    }
}

// ---------------------------------------------------------------------------
// 2. Interaction Check (Reasoning) — checks new med against existing meds
// ---------------------------------------------------------------------------

const INTERACT_PROMPT = `You are a pharmacist safety assistant. A senior is adding a new medication to their regimen.

Current medications: {existing}
New medication: {new}

Analyze potential drug-drug interactions, timing conflicts, food conflicts, and duplicate therapies.

Return ONLY a valid JSON object with exactly this shape:
{
  "warnings": [
    {
      "drugs": ["MedA", "MedB"],
      "severity": "MAJOR" | "MODERATE" | "MINOR",
      "explanation": "plain English explanation of the risk",
      "recommendation": "what to do, using the senior's perspective"
    }
  ],
  "scheduleNotes": "any timing advice, or null",
  "safe": true/false (false if any MAJOR warning exists)
}

Rules:
- Be thorough but not alarmist. Only flag real clinical concerns.
- Use warm, non-clinical language a caregiver would understand.
- If no interactions exist, return empty warnings array and safe: true.
- Return ONLY the JSON object, no markdown fences, no explanation.`;

export async function checkInteractions(
    existingMedications: string[],
    newMedication: string
) {
    const prompt = INTERACT_PROMPT
        .replace("{existing}", existingMedications.join(", ") || "none")
        .replace("{new}", newMedication);

    const response = await gemini.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = response.text?.trim() ?? "";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 200)}`);
    }
}
