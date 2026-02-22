import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function safePinMatch(storedPin: string, providedPin: string): boolean {
    const a = Buffer.from(storedPin, "utf8");
    const b = Buffer.from(providedPin, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
}

// POST /api/profile/verify-pin
// Body: { profileId: string, pin: string }
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const profileId = typeof body?.profileId === "string" ? body.profileId.trim() : "";
        const pin = typeof body?.pin === "string" ? body.pin.trim() : "";

        if (!profileId || !pin) {
            return NextResponse.json(
                { success: false, error: "profileId and pin are required." },
                { status: 400 }
            );
        }

        if (!/^\d{4}$/.test(pin)) {
            return NextResponse.json(
                { success: false, error: "Caregiver PIN must be exactly 4 digits." },
                { status: 400 }
            );
        }

        const { data: profile, error } = await getSupabase()
            .from("profiles")
            .select("caregiver_pin")
            .eq("id", profileId)
            .single();

        if (error || !profile) {
            return NextResponse.json(
                { success: false, error: "Profile not found." },
                { status: 404 }
            );
        }

        const storedPin = String(profile.caregiver_pin ?? "");
        if (!storedPin || !safePinMatch(storedPin, pin)) {
            return NextResponse.json(
                { success: false, error: "Invalid caregiver PIN." },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                valid: true,
            },
        });
    } catch (err) {
        console.error("[verify-pin] error:", err);
        return NextResponse.json(
            { success: false, error: "Invalid request body." },
            { status: 400 }
        );
    }
}
