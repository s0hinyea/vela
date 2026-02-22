import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// GET /api/schedule/today?profileId=xxx — Returns today's dose schedule
export async function GET(request: NextRequest) {
    const profileId = request.nextUrl.searchParams.get("profileId");

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

    // 2. Get today's date
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

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

    // 4. Build DoseSlot[] from medications × scheduled_times
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const slots = (medications ?? []).flatMap((med: Record<string, unknown>) => {
        const times = med.scheduled_times as string[];
        return times.map((time: string) => {
            // Check if there's a dose log for this med + time
            const log = (logs ?? []).find(
                (l: Record<string, unknown>) =>
                    l.medication_id === med.id && l.scheduled_time === time
            );

            // Determine status
            let status: string = "upcoming";
            if (log && (log as Record<string, unknown>).taken_at) {
                status = "taken";
            } else if (time <= currentHHMM) {
                // If the scheduled time has already passed today AND it hasn't been taken, it's due!
                // We shouldn't lock them out by calling it "missed" just because an hour passed. 
                // They still need to take it.
                status = "due";
            } else {
                status = "upcoming";
            }

            // Format display label
            const [h, m] = time.split(":").map(Number);
            const ampm = h >= 12 ? "PM" : "AM";
            const displayH = h % 12 || 12;
            const scheduledTimeLabel = `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;

            return {
                id: log ? (log as Record<string, unknown>).id : `slot-${med.id}-${time}`,
                medicationId: med.id,
                medicationName: med.name,
                dosage: med.dosage,
                instructions: med.instructions,
                instructionsTranslated: med.instructions_translated ?? null,
                scheduledTime: time,
                scheduledTimeLabel,
                status,
                takenAt: log ? (log as Record<string, unknown>).taken_at : null,
                audioUrl: null,
            };
        });
    });

    // Sort by scheduledTime ascending
    slots.sort((a: { scheduledTime: string }, b: { scheduledTime: string }) =>
        a.scheduledTime.localeCompare(b.scheduledTime)
    );

    const allTaken = slots.length > 0 && slots.every((s: { status: string }) => s.status === "taken");
    const nextSlot = slots.find((s: { status: string }) => s.status === "due") ?? null;

    return NextResponse.json({
        success: true,
        data: {
            date: today,
            slots,
            allTaken,
            nextSlot,
        },
    });
}
