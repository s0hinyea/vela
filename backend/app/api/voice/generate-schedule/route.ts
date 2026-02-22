import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateAndCacheVoice } from "@/lib/elevenlabs";
import { translateNotificationTexts } from "@/lib/gemini";

// POST /api/voice/generate-schedule
// Body: { profileId, date }
// Groups medications by scheduled_time and pre-generates the grouped audio for each time slot.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profileId, date } = body;

        if (!profileId || !date) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const supabase = getSupabase();

        // 1. Fetch Profile
        const { data: profile } = await supabase.from("profiles").select().eq("id", profileId).single();
        if (!profile) return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });

        const seniorName = profile.senior_name;
        const language = profile.preferred_language ?? "en";

        // 2. Fetch all medications
        const { data: medications } = await supabase.from("medications").select().eq("profile_id", profileId);

        if (!medications || medications.length === 0) {
            return NextResponse.json({ success: true, message: "No medications to schedule" });
        }

        // 3. Group by scheduled_time
        const timeGroups: Record<string, typeof medications> = {};
        for (const med of medications) {
            const times = med.scheduled_times as string[];
            for (const time of times) {
                if (!timeGroups[time]) timeGroups[time] = [];
                timeGroups[time].push(med);
            }
        }

        console.log(`[GenerateSchedule] Grouping for ${profileId} on ${date}: found ${Object.keys(timeGroups).length} time slots.`);

        // 4. Generate audio batches per time slot
        for (const [time, meds] of Object.entries(timeGroups)) {
            // Build the scripts
            const isSingle = meds.length === 1;
            const medList = meds.map((m) => `${m.name} ${m.dosage}`).join(isSingle ? "" : " and ");

            let detailedInstructions = "";
            let colorHints = "";

            if (isSingle) {
                const med = meds[0];
                detailedInstructions = med.instructions ? ` ${med.instructions}.` : "";
                colorHints = med.color ? ` — that's the ${med.color} one` : "";
            } else {
                const instructionParts = meds
                    .filter(m => m.instructions || m.color)
                    .map(m => {
                        let text = `For your ${m.name}`;
                        if (m.color) text += `, which is the ${m.color} one,`;
                        if (m.instructions) text += ` ${m.instructions}.`;
                        else text += `.`;
                        return text;
                    });

                if (instructionParts.length > 0) {
                    detailedInstructions = " " + instructionParts.join(" ");
                }
            }

            console.log("GENERATING SCRIPT:", meds.length, "MEDS");
            let scripts = [
                // heads_up
                { stage: "heads_up", text: `${seniorName}, your ${medList} ${isSingle ? "is" : "are"} coming up soon.${detailedInstructions}` },
                // action
                { stage: "action", text: `${seniorName}, it's time for your ${medList}${colorHints}.${detailedInstructions}` },
                // follow_up
                { stage: "follow_up", text: `Just checking in, ${seniorName}. Did you take your ${medList}?` }
            ];
            console.log("GENERATED SCRIPTS:", JSON.stringify(scripts, null, 2));

            // 4a. Translate scripts if necessary
            if (language !== "en") {
                const textsToTranslate = scripts.map(s => s.text);
                try {
                    const translated = await translateNotificationTexts(textsToTranslate, language);
                    scripts = scripts.map((s, idx) => ({ ...s, text: translated[idx] || s.text }));
                } catch (e) {
                    console.error("[GenerateSchedule] Translation failed, falling back to English", e);
                }
            }

            // 4b. Generate ElevenLabs audio for each script and save to DB
            for (const script of scripts) {
                try {
                    console.log(`[GenerateSchedule] Generating audio for ${time} ${script.stage}...`);
                    const voiceClip = await generateAndCacheVoice(script.text, seniorName);

                    // Upsert into voice_clips (on conflict update audio_url)
                    const { error } = await supabase.from("voice_clips").upsert({
                        profile_id: profileId,
                        date: date,
                        scheduled_time: time,
                        stage: script.stage,
                        audio_url: voiceClip.audioUrl,
                    }, {
                        onConflict: "profile_id, date, scheduled_time, stage"
                    });

                    if (error) {
                        console.error("[GenerateSchedule] DB Upsert failed for voice clip:", error);
                    }
                } catch (e) {
                    console.error(`[GenerateSchedule] ElevenLabs generation failed for ${script.stage}`, e);
                }
            }
        }

        return NextResponse.json({ success: true, message: "Schedule generated and grouped successfully" });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
