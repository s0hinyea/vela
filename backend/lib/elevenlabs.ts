import { getSupabase } from "./supabase";
import { randomUUID } from "crypto";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";

// "Rachel" — warm, calm, female voice. Great default for a companion app.
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
const MODEL_ID = "eleven_multilingual_v2";

/**
 * Generate a voice clip via ElevenLabs TTS and upload it to Supabase Storage.
 * Returns metadata + a public URL for instant playback.
 */
export async function generateAndCacheVoice(
    text: string,
    seniorName: string
): Promise<{
    id: string;
    text: string;
    audioUrl: string;
    durationMs: number;
    createdAt: string;
}> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new Error("Missing ELEVENLABS_API_KEY in environment variables.");
    }

    // 1. Call ElevenLabs TTS API
    const response = await fetch(
        `${ELEVENLABS_API_URL}/${DEFAULT_VOICE_ID}`,
        {
            method: "POST",
            headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
            },
            body: JSON.stringify({
                text,
                model_id: MODEL_ID,
                voice_settings: {
                    stability: 0.65,
                    similarity_boost: 0.75,
                    style: 0.35,
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    // 2. Read the audio buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // 3. Upload to Supabase Storage
    const id = randomUUID();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "vela-audio";
    const filePath = `${id}.mp3`;

    const supabase = getSupabase();
    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, audioBuffer, {
            contentType: "audio/mpeg",
            cacheControl: "3600",
            upsert: false,
        });

    if (uploadError) {
        throw new Error(`Supabase upload error: ${uploadError.message}`);
    }

    // 4. Get public URL
    const {
        data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    // Estimate duration: ~150 words/min average speech rate, ~5 chars/word
    const estimatedDurationMs = Math.round((text.length / 5 / 150) * 60 * 1000);

    return {
        id,
        text,
        audioUrl: publicUrl,
        durationMs: estimatedDurationMs,
        createdAt: new Date().toISOString(),
    };
}
