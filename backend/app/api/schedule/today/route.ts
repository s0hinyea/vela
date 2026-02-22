import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getDateTimeInZone } from "@/lib/datetime";

type DoseLogRow = {
    id: string;
    medication_id: string;
    scheduled_time: string;
    taken_at: string | null;
};

type MedicationRow = {
    id: string;
    name: string;
    dosage: string;
    instructions: string;
    instructions_translated: string | null;
    scheduled_times: string[];
};

type VoiceClipRow = {
    scheduled_time: string;
    audio_url: string | null;
};

type RawSlot = {
    id: string;
    medicationId: string;
    medicationName: string;
    dosage: string;
    instructions: string;
    instructionsTranslated: string | null;
    scheduledTime: string;
    scheduledTimeLabel: string;
    takenAt: string | null;
    audioUrl: string | null;
    isTaken: boolean;
    scheduledMinutes: number;
};

function toMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map((part) => Number(part));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
    return hours * 60 + minutes;
}

function toDisplayLabel(time: string): string {
    const [h, m] = time.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;
}

// GET /api/schedule/today?profileId=xxx — Returns today's dose schedule
export async function GET(request: NextRequest) {
    const profileId = request.nextUrl.searchParams.get("profileId");
    const timeZone = request.nextUrl.searchParams.get("timeZone");

    if (!profileId) {
        return NextResponse.json(
            { success: false, error: "profileId query parameter is required." },
            { status: 400 }
        );
    }

    const supabase = getSupabase();

    // 1. Get all medications for this profile
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

    // 2. Resolve "today" and "now" in the caller's timezone (falls back to UTC).
    const { today, currentMinutes, timeZone: resolvedTimeZone } = getDateTimeInZone(timeZone);

    // 3. Get existing dose logs for today
    const { data: logs, error: logError } = await supabase
        .from("dose_logs")
        .select()
        .eq("profile_id", profileId)
        .eq("date", today);

    if (logError) {
        return NextResponse.json(
            { success: false, error: logError.message },
            { status: 500 }
        );
    }

    // 4. Get generated voice clips for today's 'action' stage
    const { data: voiceClips } = await supabase
        .from("voice_clips")
        .select()
        .eq("profile_id", profileId)
        .eq("date", today)
        .eq("stage", "action");

    // 4. Build DoseSlot[] from medications × scheduled_times
    const rawSlots: RawSlot[] = (medications ?? []).flatMap((medication) => {
        const med = medication as unknown as MedicationRow;
        const times = Array.isArray(med.scheduled_times) ? med.scheduled_times : [];

        return times.map((time: string) => {
            // Check if there's a dose log for this med + time
            const log = (logs ?? []).find((row) => {
                const l = row as unknown as DoseLogRow;
                return l.medication_id === med.id && l.scheduled_time === time;
            }) as unknown as DoseLogRow | undefined;

            // Find matching grouped audio clip
            const voiceClip = (voiceClips ?? []).find((clip) => {
                const vc = clip as unknown as VoiceClipRow;
                return vc.scheduled_time === time;
            }) as unknown as VoiceClipRow | undefined;

            return {
                id: log ? log.id : `slot-${med.id}-${time}`,
                medicationId: med.id,
                medicationName: med.name,
                dosage: med.dosage,
                instructions: med.instructions,
                instructionsTranslated: med.instructions_translated ?? null,
                scheduledTime: time,
                scheduledTimeLabel: toDisplayLabel(time),
                takenAt: log?.taken_at ?? null,
                audioUrl: voiceClip?.audio_url ?? null,
                isTaken: Boolean(log?.taken_at),
                scheduledMinutes: toMinutes(time),
            };
        });
    });

    // Sort by scheduledTime ascending
    rawSlots.sort((a, b) =>
        a.scheduledTime.localeCompare(b.scheduledTime)
    );

    // The nearest upcoming untaken time slot is "due" (orange).
    const dueSlot =
        rawSlots.find((slot) => !slot.isTaken && slot.scheduledMinutes >= currentMinutes) ??
        null;
    const dueMinutes = dueSlot?.scheduledMinutes ?? null;

    const slots = rawSlots.map((slot) => {
        let status: "taken" | "due" | "upcoming" | "missed";
        if (slot.isTaken) {
            status = "taken";
        } else if (dueMinutes !== null && slot.scheduledMinutes === dueMinutes) {
            status = "due";
        } else if (slot.scheduledMinutes < currentMinutes) {
            status = "missed";
        } else {
            status = "upcoming";
        }

        return {
            id: slot.id,
            medicationId: slot.medicationId,
            medicationName: slot.medicationName,
            dosage: slot.dosage,
            instructions: slot.instructions,
            instructionsTranslated: slot.instructionsTranslated,
            scheduledTime: slot.scheduledTime,
            scheduledTimeLabel: slot.scheduledTimeLabel,
            status,
            takenAt: slot.takenAt,
            audioUrl: slot.audioUrl,
        };
    });

    const allTaken = slots.length > 0 && slots.every((slot) => slot.status === "taken");
    const nextSlot =
        slots.find((slot) => slot.status === "due") ??
        slots.find((slot) => slot.status === "upcoming") ??
        null;

    return NextResponse.json({
        success: true,
        data: {
            date: today,
            slots,
            allTaken,
            nextSlot,
            timeZone: resolvedTimeZone,
        },
    });
}
