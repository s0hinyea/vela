import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getDateTimeInZone } from "@/lib/datetime";

const DOSE_WINDOW_MINUTES = 30;

function toMinutes(time: string): number {
    const [h, m] = time.split(":").map((part) => Number(part));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
}

function toDisplayTime(totalMinutes: number): string {
    const clamped = Math.max(0, Math.min(1439, totalMinutes));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 || 12;
    return `${displayH}:${String(m).padStart(2, "0")} ${ampm}`;
}

// POST /api/doses/log — Mark a dose as taken
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            doseSlotId,
            profileId,
            medicationId,
            takenAt,
            scheduledTime: scheduledTimeFromBody,
            timeZone,
        } = body;

        if (!profileId || !medicationId || !takenAt) {
            return NextResponse.json(
                {
                    success: false,
                    error: "profileId, medicationId, and takenAt are required.",
                },
                { status: 400 }
            );
        }

        const supabase = getSupabase();
        const { today, currentMinutes } = getDateTimeInZone(
            typeof timeZone === "string" ? timeZone : null
        );

        // Prefer explicit scheduledTime from client, then parse HH:MM from slot id.
        // This avoids UUID parsing issues when med ids include dashes.
        let scheduledTime = "00:00";
        if (typeof scheduledTimeFromBody === "string" && /^\d{2}:\d{2}$/.test(scheduledTimeFromBody)) {
            scheduledTime = scheduledTimeFromBody;
        } else if (typeof doseSlotId === "string") {
            const match = doseSlotId.match(/(\d{2}:\d{2})$/);
            if (match?.[1]) {
                scheduledTime = match[1];
            }
        }

        // Strict timing enforcement: allow confirmations only within ±30 minutes.
        const scheduledMinutes = toMinutes(scheduledTime);
        const windowStart = Math.max(0, scheduledMinutes - DOSE_WINDOW_MINUTES);
        const windowEnd = Math.min(1439, scheduledMinutes + DOSE_WINDOW_MINUTES);
        const withinWindow = currentMinutes >= windowStart && currentMinutes <= windowEnd;

        if (!withinWindow) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Dose can only be marked between ${toDisplayTime(windowStart)} and ${toDisplayTime(windowEnd)}.`,
                },
                { status: 409 }
            );
        }

        // Upsert: if a log already exists for this med + time + date, update it
        const { data, error } = await supabase
            .from("dose_logs")
            .upsert(
                {
                    profile_id: profileId,
                    medication_id: medicationId,
                    scheduled_time: scheduledTime,
                    taken_at: takenAt,
                    date: today,
                    status: "taken",
                },
                {
                    onConflict: "profile_id,medication_id,scheduled_time,date",
                    ignoreDuplicates: false,
                }
            )
            .select()
            .single();

        // If upsert with conflict fails (no unique constraint), fall back to insert
        if (error) {
            const { data: insertData, error: insertError } = await supabase
                .from("dose_logs")
                .insert({
                    profile_id: profileId,
                    medication_id: medicationId,
                    scheduled_time: scheduledTime,
                    taken_at: takenAt,
                    date: today,
                    status: "taken",
                })
                .select()
                .single();

            if (insertError) {
                return NextResponse.json(
                    { success: false, error: insertError.message },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                data: {
                    id: insertData.id,
                    doseSlotId: doseSlotId ?? `slot-${medicationId}-${scheduledTime}`,
                    medicationId: insertData.medication_id,
                    profileId: insertData.profile_id,
                    takenAt: insertData.taken_at,
                    date: insertData.date,
                },
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: data.id,
                doseSlotId: doseSlotId ?? `slot-${medicationId}-${scheduledTime}`,
                medicationId: data.medication_id,
                profileId: data.profile_id,
                takenAt: data.taken_at,
                date: data.date,
            },
        });
    } catch (err) {
        console.error("Dose log error:", err);
        return NextResponse.json(
            { success: false, error: "Invalid request body." },
            { status: 400 }
        );
    }
}
