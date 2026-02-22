import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json();
        const { name, dosage, instructions } = body;

        if (!name || !dosage) {
            return NextResponse.json(
                { success: false, error: "Name and dosage are required." },
                { status: 400 }
            );
        }

        const { data, error } = await getSupabase()
            .from("medications")
            .update({
                name,
                dosage,
                instructions: instructions ?? null,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data });
    } catch (err) {
        console.error("Update medication error:", err);
        return NextResponse.json(
            { success: false, error: "Invalid request body." },
            { status: 400 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const db = getSupabase();

        // 1. Manually cascade delete from child tables to prevent foreign key constraint errors
        await db.from("dose_logs").delete().eq("medication_id", id);
        await db.from("schedule_slots").delete().eq("medication_id", id);
        await db.from("medication_interactions").delete().or(`drug1_id.eq.${id},drug2_id.eq.${id}`); // Just in case, depending on how it's linked
        await db.from("medication_interactions").delete().eq("medication_id", id); // Fallback if using direct reference

        // 2. Delete the actual medication
        const { error } = await db
            .from("medications")
            .delete()
            .eq("id", id);

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: null });
    } catch (err) {
        console.error("Delete medication error:", err);
        return NextResponse.json(
            { success: false, error: "Internal server error." },
            { status: 500 }
        );
    }
}
