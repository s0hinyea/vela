import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { translateNotificationTexts } from "@/lib/gemini";

// GET /api/notifications/schedule?profileId=xxx
// Returns grouped notification schedule — medications at the same time
// are combined into a single notification with 3 stages:
//   heads_up (-30 min), action (at dose time), follow_up (+15 min)
export async function GET(request: NextRequest) {
    const profileId = request.nextUrl.searchParams.get("profileId");

    if (!profileId) {
        return NextResponse.json(
            { success: false, error: "profileId query parameter is required." },
            { status: 400 }
        );
    }

    const supabase = getSupabase();

    // 1. Get profile
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select()
        .eq("id", profileId)
        .single();

    if (profileError || !profile) {
        return NextResponse.json(
            { success: false, error: "Profile not found." },
            { status: 404 }
        );
    }

    const seniorName = profile.senior_name;
    const language = profile.preferred_language ?? "en";

    // 2. Get all medications
    const { data: medications, error: medError } = await supabase
        .from("medications")
        .select()
        .eq("profile_id", profileId);

    if (medError) {
        return NextResponse.json(
            { success: false, error: medError.message },
            { status: 500 }
        );
    }

    // 3. Get today's dose logs
    const today = new Date().toISOString().split("T")[0];
    const { data: logs } = await supabase
        .from("dose_logs")
        .select()
        .eq("profile_id", profileId)
        .eq("date", today);

    // 4. Get generated voice clips for today
    const { data: voiceClips } = await supabase
        .from("voice_clips")
        .select()
        .eq("profile_id", profileId)
        .eq("date", today);

    // 4. Group medications by scheduled time
    //    e.g. { "08:00": [{ id, name, dosage, ... }, ...], "18:00": [...] }
    const timeGroups: Record<
        string,
        { id: string; name: string; dosage: string; instructions: string; color: string | null }[]
    > = {};

    for (const med of medications ?? []) {
        const times = med.scheduled_times as string[];
        for (const time of times) {
            if (!timeGroups[time]) timeGroups[time] = [];
            timeGroups[time].push({
                id: med.id as string,
                name: med.name as string,
                dosage: med.dosage as string,
                instructions: (med.instructions as string) ?? "",
                color: med.color as string | null,
            });
        }
    }

    // 5. Build grouped notifications — one per time slot × 3 stages
    const notifications = Object.entries(timeGroups).flatMap(
        ([time, meds]) => {
            // Parse time
            const [h, m] = time.split(":").map(Number);

            // Format display time
            const ampm = h >= 12 ? "PM" : "AM";
            const displayH = h % 12 || 12;
            const displayTime = `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;

            // Compute heads-up and follow-up times
            const headsUpMin = Math.max(0, h * 60 + m - 30);
            const headsUpTime = `${String(Math.floor(headsUpMin / 60)).padStart(2, "0")}:${String(headsUpMin % 60).padStart(2, "0")}`;

            const followUpMin = Math.min(1439, h * 60 + m + 15);
            const followUpTime = `${String(Math.floor(followUpMin / 60)).padStart(2, "0")}:${String(followUpMin % 60).padStart(2, "0")}`;

            // Check if ALL meds at this time are taken
            const allTaken = meds.every((med) =>
                (logs ?? []).some(
                    (l: Record<string, unknown>) =>
                        l.medication_id === med.id &&
                        l.scheduled_time === time &&
                        l.taken_at
                )
            );

            // Build natural-language med list
            // e.g. "Metformin 500mg and Lisinopril 10mg"
            const medList = meds
                .map((med) => `${med.name} ${med.dosage}`)
                .join(meds.length === 2 ? " and " : ", ");

            const medNames = meds.map((m) => m.name).join(meds.length === 2 ? " and " : ", ");

            const isSingle = meds.length === 1;
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

            const stages = [
                {
                    stage: "heads_up",
                    triggerTime: headsUpTime,
                    title: isSingle
                        ? `Coming up: ${medNames}`
                        : `Coming up: ${meds.length} medications at ${displayTime}`,
                    body: `${seniorName}, your ${medList} ${isSingle ? "is" : "are"} coming up soon.${detailedInstructions}`,
                    audioText: `${seniorName}, your ${medList} ${isSingle ? "is" : "are"} coming up soon.${detailedInstructions}`,
                },
                {
                    stage: "action",
                    triggerTime: time,
                    title: isSingle
                        ? `Time for ${medList}`
                        : `Time for ${meds.length} medications`,
                    body: `${seniorName}, it's time for your ${medList}${colorHints}.${detailedInstructions} Tap here.`,
                    audioText: `${seniorName}, it's time for your ${medList}${colorHints}.${detailedInstructions}`,
                },
                {
                    stage: "follow_up",
                    triggerTime: followUpTime,
                    title: isSingle
                        ? `Did you take ${medNames}?`
                        : `Did you take your ${displayTime} medications?`,
                    body: `Just checking in — did you take your ${medList}?`,
                    audioText: `Just checking in, ${seniorName}. Did you take your ${medList}?`,
                },
            ];

            return stages.map((stage) => {
                const voiceClip = (voiceClips ?? []).find(
                    vc => vc.scheduled_time === time && vc.stage === stage.stage
                );

                return {
                    id: `notif-${time}-${stage.stage}`,
                    scheduledTime: time,
                    scheduledTimeLabel: displayTime,
                    stage: stage.stage,
                    triggerTime: stage.triggerTime,
                    title: voiceClip?.notification_title ?? stage.title,
                    body: voiceClip?.notification_body ?? stage.body,
                    audioText: stage.audioText,
                    audioUrl: voiceClip?.audio_url ?? null,
                    medications: meds.map((med) => ({
                        id: med.id,
                        name: med.name,
                        dosage: med.dosage,
                    })),
                    allTaken,
                    date: today,
                };
            });
        }
    );

    // Sort by trigger time
    notifications.sort((a, b) => a.triggerTime.localeCompare(b.triggerTime));

    // The notification titles and bodies were already translated and saved into 
    // the voice_clips table by the background generate-schedule process.
    // We simply returned them directly from the DB query above! 
    return NextResponse.json({
        success: true,
        data: {
            profileId,
            seniorName,
            preferredLanguage: language,
            date: today,
            totalNotifications: notifications.length,
            notifications,
        },
    });
}
