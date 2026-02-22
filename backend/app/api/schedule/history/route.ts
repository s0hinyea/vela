import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getDateTimeInZone } from "@/lib/datetime";

type DoseLogRow = {
    id: string;
    medication_id: string;
    scheduled_time: string;
    taken_at: string | null;
    date: string;
};

type MedicationRow = {
    id: string;
    name: string;
    dosage: string;
    instructions: string;
    instructions_translated: string | null;
    scheduled_times: string[];
    created_at: string;
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
    isTaken: boolean;
    scheduledMinutes: number;
    status: "taken" | "due" | "upcoming" | "missed";
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

// GET /api/schedule/history?profileId=xxx&timeZone=xxx — Returns 7 days of history
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
        .select("id, name, dosage, instructions, instructions_translated, scheduled_times, created_at")
        .eq("profile_id", profileId);

    if (medError) {
        return NextResponse.json(
            { success: false, error: medError.message },
            { status: 500 }
        );
    }

    // 2. Resolve "today" array backwards 7 days
    const { today, currentMinutes, timeZone: resolvedTimeZone } = getDateTimeInZone(timeZone);
    const [ty, tm, td] = today.split("-").map(Number);
    const baseDate = new Date(ty, tm - 1, td);

    const historyDates: string[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        historyDates.push(dateStr);
    }
    const oldestDate = historyDates[historyDates.length - 1];

    // 3. Get dose logs for the past 7 days
    const { data: logs, error: logError } = await supabase
        .from("dose_logs")
        .select("id, medication_id, scheduled_time, taken_at, date")
        .eq("profile_id", profileId)
        .gte("date", oldestDate)
        .lte("date", today);

    if (logError) {
        return NextResponse.json(
            { success: false, error: logError.message },
            { status: 500 }
        );
    }

    // 4. Build history grouped by date
    const history = historyDates.map((dateStr) => {
        const isToday = dateStr === today;
        const endOfDayUTC = new Date(`${dateStr}T23:59:59Z`).toISOString(); // Rough boundary for creation

        const rawSlots: RawSlot[] = (medications ?? []).flatMap((medication) => {
            const med = medication as unknown as MedicationRow;
            const times = Array.isArray(med.scheduled_times) ? med.scheduled_times : [];

            // Skip medications that were not yet created by the end of this arbitrary day
            // This prevents showing 5 "missed" days for a med added yesterday.
            if (med.created_at > endOfDayUTC) {
                return [];
            }

            return times.map((time: string) => {
                const log = (logs ?? []).find((row) => {
                    const l = row as unknown as DoseLogRow;
                    return l.medication_id === med.id && l.scheduled_time === time && l.date === dateStr;
                }) as unknown as DoseLogRow | undefined;

                const isTaken = Boolean(log?.taken_at);
                const scheduledMinutes = toMinutes(time);

                let status: "taken" | "due" | "upcoming" | "missed";
                if (isTaken) {
                    status = "taken";
                } else if (!isToday) {
                    status = "missed";
                } else {
                    // It is today. We don't mark as missed unless it's past the time.
                    // For the history overview, anything in the past untaken is missed, anything future is upcoming.
                    if (scheduledMinutes < currentMinutes - 30) {
                        status = "missed"; // Past the 30 min window
                    } else if (scheduledMinutes <= currentMinutes + 30) {
                        status = "due";
                    } else {
                        status = "upcoming";
                    }
                }

                return {
                    id: log ? log.id : `history-${dateStr}-${med.id}-${time}`,
                    medicationId: med.id,
                    medicationName: med.name,
                    dosage: med.dosage,
                    instructions: med.instructions,
                    instructionsTranslated: med.instructions_translated ?? null,
                    scheduledTime: time,
                    scheduledTimeLabel: toDisplayLabel(time),
                    takenAt: log?.taken_at ?? null,
                    isTaken,
                    scheduledMinutes,
                    status,
                };
            });
        });

        // Sort by time ascending
        rawSlots.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

        return {
            date: dateStr,
            slots: rawSlots,
        };
    });

    return NextResponse.json({
        success: true,
        data: {
            history,
            timeZone: resolvedTimeZone,
        },
    });
}
