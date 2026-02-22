import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateAndCacheVoice } from "@/lib/elevenlabs";
import { translateMedicationInfo } from "@/lib/gemini";

// Helper: transform snake_case DB row → camelCase Medication contract
function toMedication(row: Record<string, unknown>) {
    return {
        id: row.id,
        profileId: row.profile_id,
        name: row.name,
        brandName: row.brand_name ?? null,
        dosage: row.dosage,
        form: row.form,
        frequency: row.frequency,
        scheduledTimes: row.scheduled_times,
        instructions: row.instructions,
        instructionsTranslated: row.instructions_translated ?? null,
        color: row.color ?? null,
        interactions: row.interactions ?? [],
        createdAt: row.created_at,
    };
}

// GET /api/medications?profileId=xxx — Fetch all medications for a profile
export async function GET(request: NextRequest) {
    const profileId = request.nextUrl.searchParams.get("profileId");

    if (!profileId) {
        return NextResponse.json(
            { success: false, error: "profileId query parameter is required." },
            { status: 400 }
        );
    }

    const { data, error } = await getSupabase()
        .from("medications")
        .select()
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        data: (data ?? []).map(toMedication),
    });
}

// POST /api/medications — Save a confirmed medication + pre-generate voice clips
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profileId, scanned, interactions, finalTimes } = body;

        if (!profileId || !scanned) {
            return NextResponse.json(
                { success: false, error: "profileId and scanned are required." },
                { status: 400 }
            );
        }

        // 1. Fetch profile for senior name + language preference
        const { data: profile } = await getSupabase()
            .from("profiles")
            .select("senior_name, preferred_language")
            .eq("id", profileId)
            .single();

        const seniorName = profile?.senior_name ?? "there";
        const language = profile?.preferred_language ?? "en";

        // 2. Translate instructions if language isn't English
        let translatedInstructions: string | null = null;
        if (language !== "en" && scanned.instructions) {
            try {
                const translated = await translateMedicationInfo(
                    { name: scanned.name, dosage: scanned.dosage, instructions: scanned.instructions },
                    language
                );
                translatedInstructions = translated.instructions;
            } catch (err) {
                console.error("Translation failed, saving without translation:", err);
            }
        }

        // 3. Save medication to Supabase
        const { data, error } = await getSupabase()
            .from("medications")
            .insert({
                profile_id: profileId,
                name: scanned.name,
                brand_name: scanned.brandName ?? null,
                dosage: scanned.dosage,
                form: scanned.form,
                frequency: scanned.frequency,
                scheduled_times: finalTimes ?? scanned.suggestedTimes,
                instructions: scanned.instructions,
                instructions_translated: translatedInstructions,
                color: scanned.color ?? null,
                interactions: interactions ?? [],
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // 4. Pre-generate voice clips — use translated text if available
        const medName = scanned.name;
        const dosage = scanned.dosage;
        const spokenInstructions = translatedInstructions ?? scanned.instructions ?? "";
        const colorDesc = scanned.color ? ` — that's the ${scanned.color} one` : "";

        const voiceTexts = [
            `${seniorName}, it's time for your ${medName} ${dosage}${colorDesc}. ${spokenInstructions}.`,
            `${seniorName}, your ${medName} is coming up soon. ${spokenInstructions}.`,
            `Just checking in — did you take your ${medName} ${dosage}?`,
        ];

        // Fire and forget — don't await, don't block the response
        Promise.all(
            voiceTexts.map((text) =>
                generateAndCacheVoice(text, seniorName).catch((err) =>
                    console.error("Voice pre-gen failed:", err)
                )
            )
        ).then(() => {
            console.log(`Voice clips pre-generated for ${medName} (lang: ${language})`);
        });

        return NextResponse.json({
            success: true,
            data: toMedication(data),
        });
    } catch (err) {
        console.error("Save medication error:", err);
        return NextResponse.json(
            { success: false, error: "Invalid request body." },
            { status: 400 }
        );
    }
}
