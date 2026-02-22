import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const profileId = typeof body?.profileId === "string" ? body.profileId.trim() : "";

        if (!profileId) {
            return NextResponse.json(
                { success: false, error: "profileId is required." },
                { status: 400 }
            );
        }

        const supabase = getSupabase();
        const today = new Date().toISOString().split("T")[0];
        const startOfDay = `${today}T00:00:00.000Z`;
        const endOfDay = `${today}T23:59:59.999Z`;

        const { data, error } = await supabase
            .from("chat_logs")
            .delete()
            .eq("profile_id", profileId)
            .gte("created_at", startOfDay)
            .lte("created_at", endOfDay)
            .select("id");

        if (error) {
            console.error("[chat-reset] failed:", error);
            return NextResponse.json(
                { success: false, error: "Failed to reset chat limit." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                remaining: 3,
                deleted: data?.length ?? 0,
            },
        });
    } catch (err) {
        console.error("[chat-reset] error:", err);
        return NextResponse.json(
            {
                success: false,
                error: "Internal server error.",
                details: err instanceof Error ? err.message : String(err),
            },
            { status: 500 }
        );
    }
}
