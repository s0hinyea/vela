import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getDateTimeInZone } from "@/lib/datetime";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profileId, timeZone } = body;

        if (!profileId) {
            return NextResponse.json(
                { success: false, error: "profileId is required." },
                { status: 400 }
            );
        }

        const supabase = getSupabase();

        // 1. Get all medications for this profile
        const { data: medications, error: medError } = await supabase
            .from("medications")
            .select("id, scheduled_times")
            .eq("profile_id", profileId);

        if (medError || !medications || medications.length === 0) {
            return NextResponse.json(
                { success: false, error: medError?.message ?? "No medications found." },
                { status: 500 }
            );
        }

        // 2. Backdate created_at for all medications by 10 days
        const { today } = getDateTimeInZone(timeZone);
        const [ty, tm, td] = today.split("-").map(Number);

        const tenDaysAgo = new Date(ty, tm - 1, td);
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        const backdateStr = tenDaysAgo.toISOString();

        const { error: updateError } = await supabase
            .from("medications")
            .update({ created_at: backdateStr })
            .eq("profile_id", profileId);

        if (updateError) {
            return NextResponse.json(
                { success: false, error: updateError.message },
                { status: 500 }
            );
        }

        // 3. Generate history dates (last 7 days, ending yesterday)
        // We only generate logs for the PAST, so today's schedule is untouched.
        const historyDates: string[] = [];
        const baseDate = new Date(ty, tm - 1, td);
        for (let i = 1; i <= 7; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            historyDates.push(dateStr);
        }

        // 4. Generate random dose logs
        const mockLogs = [];
        for (const dateStr of historyDates) {
            for (const med of medications) {
                const times = Array.isArray(med.scheduled_times) ? med.scheduled_times : [];
                for (const time of times) {
                    // 80% chance of being marked taken
                    const isTaken = Math.random() < 0.8;

                    if (isTaken) {
                        mockLogs.push({
                            profile_id: profileId,
                            medication_id: med.id,
                            scheduled_time: time,
                            date: dateStr,
                            status: "taken",
                            // Add a random taken_at timestamp for realism (roughly around the scheduled time)
                            taken_at: new Date(`${dateStr}T${time}:00Z`).toISOString()
                        });
                    }
                }
            }
        }

        if (mockLogs.length > 0) {
            // Because onConflict requires exact unique constraint names which might vary,
            // we will safely delete any existing logs for this profile in the 7 day window first,
            // then we bulk insert.
            const { error: deleteError } = await supabase
                .from("dose_logs")
                .delete()
                .eq("profile_id", profileId)
                .in("date", historyDates);

            if (deleteError) {
                return NextResponse.json(
                    { success: false, error: deleteError.message },
                    { status: 500 }
                );
            }

            const { error: insertError } = await supabase
                .from("dose_logs")
                .insert(mockLogs);

            if (insertError) {
                return NextResponse.json(
                    { success: false, error: insertError.message },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: `Generated ${mockLogs.length} fake taken dose logs over the last 7 days.`,
        });

    } catch (err) {
        console.error("Demo history generation error:", err);
        return NextResponse.json(
            { success: false, error: "Invalid request body." },
            { status: 400 }
        );
    }
}
