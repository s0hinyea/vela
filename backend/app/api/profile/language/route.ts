import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { translateMedicationInfo } from "@/lib/gemini";
import { generateAndCacheVoice } from "@/lib/elevenlabs";

// PATCH /api/profile/language — Update preferred language & retranslate all medications + regenerate voice
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { profileId, language } = body;

        if (!profileId || !language) {
            return NextResponse.json(
                { success: false, error: "profileId and language are required." },
                { status: 400 }
            );
        }

        const supabase = getSupabase();

        // 1. Fetch the profile (for senior_name used in voice clips)
        const { data: profileData, error: fetchError } = await supabase
            .from("profiles")
            .select("senior_name")
            .eq("id", profileId)
            .single();

        if (fetchError || !profileData) {
            return NextResponse.json(
                { success: false, error: fetchError?.message ?? "Profile not found." },
                { status: 404 }
            );
        }

        const seniorName = profileData.senior_name ?? "there";

        // 2. Update preferred_language on the profile
        const { error: profileError } = await supabase
            .from("profiles")
            .update({ preferred_language: language })
            .eq("id", profileId);

        if (profileError) {
            return NextResponse.json(
                { success: false, error: profileError.message },
                { status: 500 }
            );
        }

        console.log(`[language] Updated profile ${profileId} → ${language}`);

        // 3. Fetch all medications for this profile
        const { data: medications, error: medError } = await supabase
            .from("medications")
            .select("id, name, dosage, instructions, color")
            .eq("profile_id", profileId);

        if (medError) {
            return NextResponse.json(
                { success: false, error: medError.message },
                { status: 500 }
            );
        }

        console.log(`[language] Found ${medications?.length ?? 0} medications to process`);

        if (!medications || medications.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    profileId,
                    language,
                    medicationsUpdated: 0,
                    medications: [],
                },
            });
        }

        // 4. Translate & regenerate voice for each medication
        const results: { id: string; instructionsTranslated: string | null; error?: string }[] = [];

        for (const med of medications) {
            let translated: string | null = null;

            if (language !== "en" && med.instructions) {
                console.log(`[language] Translating ${med.name} → ${language}...`);
                try {
                    const result = await translateMedicationInfo(
                        {
                            name: med.name,
                            dosage: med.dosage,
                            instructions: med.instructions,
                        },
                        language
                    );
                    translated = result.instructions;
                    console.log(`[language] ✅ Translated ${med.name}: "${translated?.slice(0, 50)}..."`);
                } catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    console.error(`[language] ❌ Translation failed for ${med.name}:`, errMsg);
                    results.push({ id: med.id, instructionsTranslated: null, error: errMsg });
                    continue;
                }
            }

            // 5. Update the medication record
            const { error: updateError } = await supabase
                .from("medications")
                .update({ instructions_translated: translated })
                .eq("id", med.id);

            if (updateError) {
                console.error(`[language] ❌ DB update failed for ${med.name}:`, updateError.message);
                results.push({ id: med.id, instructionsTranslated: null, error: updateError.message });
                continue;
            }

            // 6. Regenerate voice clips with translated text
            const spokenInstructions = translated ?? med.instructions ?? "";
            const colorDesc = med.color ? ` — that's the ${med.color} one` : "";

            const voiceTexts = [
                `${seniorName}, it's time for your ${med.name} ${med.dosage}${colorDesc}. ${spokenInstructions}.`,
                `${seniorName}, your ${med.name} is coming up soon. ${spokenInstructions}.`,
                `Just checking in — did you take your ${med.name} ${med.dosage}?`,
            ];

            // Fire and forget voice generation — don't block the loop
            Promise.all(
                voiceTexts.map((text) =>
                    generateAndCacheVoice(text, seniorName).catch((err) =>
                        console.error(`[language] Voice regen failed for ${med.name}:`, err)
                    )
                )
            ).then(() => {
                console.log(`[language] 🔊 Voice clips regenerated for ${med.name} (${language})`);
            });

            results.push({
                id: med.id,
                instructionsTranslated: translated,
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                profileId,
                language,
                medicationsUpdated: results.length,
                medications: results,
            },
        });
    } catch (err) {
        console.error("[language] Endpoint error:", err);
        return NextResponse.json(
            { success: false, error: "Invalid request body." },
            { status: 400 }
        );
    }
}
