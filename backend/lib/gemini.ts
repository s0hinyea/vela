import { GoogleGenAI } from "@google/genai";

let _gemini: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
    if (!_gemini) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Missing GEMINI_API_KEY in environment variables.");
        }
        _gemini = new GoogleGenAI({ apiKey });
    }
    return _gemini;
}

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
  "instructions": "ONE short sentence, max 15 words, e.g. Take one tablet with food in the morning",
  "color": "physical description of the pill or null",
  "confidence": 0.0 to 1.0,
  "rawLabelText": "the raw text you read from the label"
}

Rules:
- frequency "once" → suggestedTimes has 1 entry, "twice" → 2 entries, etc.
- Use sensible default times: morning=08:00, noon=12:00, evening=18:00, bedtime=22:00
- instructions MUST be a single short sentence, maximum 15 words
- instructions must be warm and simple, not clinical jargon
- NEVER include emojis, bullet points, line breaks, or safety disclaimers in instructions
- Do NOT add warnings, side effects, or extra context to instructions
- If you can't read part of the label, lower the confidence score
- Return ONLY the JSON object, no markdown fences, no explanation`;

export async function extractLabelFromImage(imageBase64: string) {
    const response = await getGemini().models.generateContent({
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
New dosage: {dosage}
New frequency: {frequency}

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
  "safe": true/false (false if any MAJOR warning exists),
  "dosageWarning": "optional dosage safety warning string, or null"
}

Rules:
- Be thorough but not alarmist. Only flag real clinical concerns.
- Use warm, non-clinical language a caregiver would understand.
- If no interactions exist, return empty warnings array and safe: true.
- Return ONLY the JSON object, no markdown fences, no explanation.`;

export async function checkInteractions(
    existingMedications: string[],
    newMedication: string,
    dosage?: string,
    frequency?: string
) {
    const prompt = INTERACT_PROMPT
        .replace("{existing}", existingMedications.join(", ") || "none")
        .replace("{new}", newMedication)
        .replace("{dosage}", dosage || "unknown")
        .replace("{frequency}", frequency || "unknown");

    const response = await getGemini().models.generateContent({
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

// ---------------------------------------------------------------------------
// 3. Medication Translation — translates instructions to target language
// ---------------------------------------------------------------------------

const TRANSLATE_MED_PROMPT = `You are a medical translator. Translate the following medication information into {language}.

Medication name: {name}
Dosage: {dosage}
Instructions: {instructions}

Return ONLY a valid JSON object:
{
  "name": "keep the original medication name — do NOT translate it",
  "dosage": "keep original dosage (e.g. 500mg) — do NOT translate numbers/units",
  "instructions": "translated instructions in {language}, warm and simple tone"
}

Rules:
- NEVER translate the medication name or dosage — these are clinical and must stay as-is
- Translate ONLY the instructions into natural, warm {language}
- Use simple words a senior would understand
- Return ONLY the JSON object, no markdown fences`;

export async function translateMedicationInfo(
    medInfo: { name: string; dosage: string; instructions: string },
    targetLanguage: string
): Promise<{ name: string; dosage: string; instructions: string }> {
    if (targetLanguage === "en") return medInfo;

    const langNames: Record<string, string> = {
        es: "Spanish", zh: "Chinese (Simplified)", hi: "Hindi",
        fr: "French", ar: "Arabic", pt: "Portuguese",
        ko: "Korean", ja: "Japanese", vi: "Vietnamese",
        tl: "Tagalog", ru: "Russian", de: "German",
    };

    const langName = langNames[targetLanguage] ?? targetLanguage;

    const prompt = TRANSLATE_MED_PROMPT
        .replace(/\{language\}/g, langName)
        .replace("{name}", medInfo.name)
        .replace("{dosage}", medInfo.dosage)
        .replace("{instructions}", medInfo.instructions);

    const response = await getGemini().models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = response.text?.trim() ?? "";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        // If translation fails, return original
        console.error("Translation parse failed, returning original:", text.slice(0, 200));
        return medInfo;
    }
}

// ---------------------------------------------------------------------------
// 4. Batch Notification Translation — translates notification texts
// ---------------------------------------------------------------------------

const TRANSLATE_NOTIF_PROMPT = `You are a medical translator. Translate the following notification texts into {language}.

The texts are for medication reminders sent to an elderly person. Keep the tone warm and caring.

Input texts (JSON array):
{texts}

Return ONLY a valid JSON array of translated strings, in the same order:
["translated text 1", "translated text 2", ...]

Rules:
- NEVER translate medication names or dosages (e.g. "Metformin 500mg" stays as-is)
- Translate everything else into natural, warm {language}
- Maintain the same meaning and tone
- Return ONLY the JSON array, no markdown fences`;

export async function translateNotificationTexts(
    texts: string[],
    targetLanguage: string
): Promise<string[]> {
    if (targetLanguage === "en" || texts.length === 0) return texts;

    const langNames: Record<string, string> = {
        es: "Spanish", zh: "Chinese (Simplified)", hi: "Hindi",
        fr: "French", ar: "Arabic", pt: "Portuguese",
        ko: "Korean", ja: "Japanese", vi: "Vietnamese",
        tl: "Tagalog", ru: "Russian", de: "German",
    };

    const langName = langNames[targetLanguage] ?? targetLanguage;

    const prompt = TRANSLATE_NOTIF_PROMPT
        .replace(/\{language\}/g, langName)
        .replace("{texts}", JSON.stringify(texts));

    const response = await getGemini().models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = response.text?.trim() ?? "";
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    try {
        const result = JSON.parse(cleaned);
        if (Array.isArray(result) && result.length === texts.length) {
            return result;
        }
        console.error("Translation returned wrong array length, using originals");
        return texts;
    } catch {
        console.error("Translation parse failed, using originals:", text.slice(0, 200));
        return texts;
    }
}
