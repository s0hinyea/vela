import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getDateTimeInZone } from "@/lib/datetime";

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
        const { today } = getDateTimeInZone(typeof timeZone === "string" ? timeZone : null);

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
