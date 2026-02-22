import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { generateAndCacheVoice } from "@/lib/elevenlabs";
import { generateConversationalAudioScripts, translateNotificationTexts } from "@/lib/gemini";

function formatTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;
}

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
            console.log("GENERATING SCRIPT:", meds.length, "MEDS");
            let scripts = await generateConversationalAudioScripts(seniorName, meds);
            console.log("GENERATED SCRIPTS:", JSON.stringify(scripts, null, 2));

            // 4a. Calculate English notifications for this time slot
            const isSingle = meds.length === 1;
            const medNames = meds.map(m => m.name).join(isSingle ? "" : (meds.length === 2 ? " and " : ", "));
            const displayTime = formatTime(time);

            let notifications = [
                {
                    stage: "heads_up",
                    title: isSingle ? `Coming up: ${medNames}` : `Coming up: ${meds.length} medications at ${displayTime}`,
                    body: `${seniorName}, your ${medNames} ${isSingle ? "is" : "are"} coming up soon.`
                },
                {
                    stage: "action",
                    title: isSingle ? `Time for ${medNames}` : `Time for ${meds.length} medications`,
                    body: `${seniorName}, it's time for your ${medNames}. Tap here.`
                },
                {
                    stage: "follow_up",
                    title: isSingle ? `Did you take ${medNames}?` : `Did you take your ${displayTime} medications?`,
                    body: `Just checking in — did you take your ${medNames}?`
                }
            ];

            // 4b. Translate scripts AND notifications if necessary
            if (language !== "en") {
                // Collect everything: 3 script texts, 3 notification titles, 3 notification bodies = 9 strings
                const textsToTranslate = [
                    ...scripts.map(s => s.text),
                    ...notifications.map(n => n.title),
                    ...notifications.map(n => n.body)
                ];

                try {
                    const translated = await translateNotificationTexts(textsToTranslate, language);

                    // First 3 are scripts
                    scripts = scripts.map((s, idx) => ({ ...s, text: translated[idx] || s.text }));

                    // Next 3 are titles
                    notifications = notifications.map((n, idx) => ({ ...n, title: translated[idx + 3] || n.title }));

                    // Last 3 are bodies
                    notifications = notifications.map((n, idx) => ({ ...n, body: translated[idx + 6] || n.body }));
                } catch (e) {
                    console.error("[GenerateSchedule] Translation failed, falling back to English", e);
                }
            }

            // 4c. Generate ElevenLabs audio for each script and save to DB
            for (let i = 0; i < scripts.length; i++) {
                const script = scripts[i];
                const notif = notifications[i];
                try {
                    console.log(`[GenerateSchedule] Generating audio for ${time} ${script.stage}...`);
                    const voiceClip = await generateAndCacheVoice(script.text, seniorName);

                    // Upsert into voice_clips (on conflict update audio_url, notification_title, notification_body)
                    const { error } = await supabase.from("voice_clips").upsert({
                        profile_id: profileId,
                        date: date,
                        scheduled_time: time,
                        stage: script.stage,
                        audio_url: voiceClip.audioUrl,
                        notification_title: notif.title,
                        notification_body: notif.body
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
