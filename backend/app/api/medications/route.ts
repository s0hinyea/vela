import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { translateMedicationInfo } from "@/lib/gemini";

type InteractionRow = {
    drugs?: string[];
    severity?: string;
    explanation?: string;
    recommendation?: string;
};

function compactActionFromText(text: string): string {
    const normalized = text.toLowerCase();
    if (normalized.includes("avoid") || normalized.includes("do not") || normalized.includes("don't")) {
        return "avoid";
    }
    if (
        normalized.includes("separate") ||
        normalized.includes("apart") ||
        normalized.includes("hour") ||
        normalized.includes("timing")
    ) {
        return "space doses";
    }
    if (normalized.includes("bleed")) return "watch bleeding";
    if (normalized.includes("dizzy") || normalized.includes("drows")) return "watch dizziness";
    if (normalized.includes("pressure")) return "watch pressure";
    if (normalized.includes("kidney")) return "watch kidneys";
    if (normalized.includes("monitor") || normalized.includes("watch")) return "monitor";
    return "use caution";
}

function pickOtherDrugName(drugs: string[] | undefined, newMedicationName: string): string {
    const values = (drugs ?? []).map((d) => String(d).trim()).filter(Boolean);
    if (!values.length) return "other meds";

    const normalizedNew = newMedicationName.trim().toLowerCase();
    const counterpart = values.find((d) => d.toLowerCase() !== normalizedNew);
    return counterpart ?? values[0];
}

function buildCompactSafetySummary(
    interactions: unknown,
    newMedicationName: string
): string | null {
    if (!Array.isArray(interactions)) return null;

    const important = (interactions as InteractionRow[])
        .filter((w) => w?.severity === "MAJOR" || w?.severity === "MODERATE")
        .sort((a, b) => (a.severity === "MAJOR" ? -1 : 1) - (b.severity === "MAJOR" ? -1 : 1))
        .slice(0, 2);

    if (!important.length) return null;

    const parts = important.map((w) => {
        const otherDrug = pickOtherDrugName(w.drugs, newMedicationName);
        const action = compactActionFromText(`${w.recommendation ?? ""} ${w.explanation ?? ""}`);
        return `${action} with ${otherDrug}`;
    });

    return parts.join("; ");
}

function appendSafetyToInstructions(instructions: string, safetySummary: string | null): string {
    const base = String(instructions ?? "")
        .replace(/\s*Safety:\s*.*$/i, "")
        .trim();

    if (!safetySummary) return base;

    const normalizedBase = base ? (/[.!?]$/.test(base) ? base : `${base}.`) : "";
    const normalizedSafety = safetySummary.replace(/[.!?]+$/g, "").trim();
    if (!normalizedSafety) return normalizedBase || base;

    return normalizedBase
        ? `${normalizedBase} Safety: ${normalizedSafety}.`
        : `Safety: ${normalizedSafety}.`;
}

// Helper: transform snake_case DB row → camelCase Medication contract
function toMedication(row: Record<string, unknown>) {
    return {
        id: row.id,
        profileId: row.profile_id,
        name: row.name,
        brandName: row.brand_name ?? null,
        dosage: row.dosage,
        form: row.form,
        frequency: row.frequency,
        scheduledTimes: row.scheduled_times,
        instructions: row.instructions,
        instructionsTranslated: row.instructions_translated ?? null,
        color: row.color ?? null,
        interactions: row.interactions ?? [],
        createdAt: row.created_at,
    };
}

// GET /api/medications?profileId=xxx — Fetch all medications for a profile
export async function GET(request: NextRequest) {
    const profileId = request.nextUrl.searchParams.get("profileId");

    if (!profileId) {
        return NextResponse.json(
            { success: false, error: "profileId query parameter is required." },
            { status: 400 }
        );
    }

    const { data, error } = await getSupabase()
        .from("medications")
        .select()
        .eq("profile_id", profileId)
        .order("created_at", { ascending: true });

    if (error) {
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        data: (data ?? []).map(toMedication),
    });
}

// POST /api/medications — Save a confirmed medication + pre-generate voice clips
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profileId, scanned, interactions, finalTimes } = body;

        if (!profileId || !scanned) {
            return NextResponse.json(
                { success: false, error: "profileId and scanned are required." },
                { status: 400 }
            );
        }

        // 1. Fetch profile for senior name + language preference
        const { data: profile } = await getSupabase()
            .from("profiles")
            .select("senior_name, preferred_language")
            .eq("id", profileId)
            .single();

        const seniorName = profile?.senior_name ?? "there";
        const language = profile?.preferred_language ?? "en";
        const compactSafetySummary = buildCompactSafetySummary(
            interactions,
            String(scanned.name ?? "")
        );
        const finalInstructions = appendSafetyToInstructions(
            String(scanned.instructions ?? ""),
            compactSafetySummary
        );

        // 2. Translate instructions if language isn't English
        let translatedInstructions: string | null = null;
        if (language !== "en" && finalInstructions) {
            try {
                const translated = await translateMedicationInfo(
                    { name: scanned.name, dosage: scanned.dosage, instructions: finalInstructions },
                    language
                );
                translatedInstructions = translated.instructions;
            } catch (err) {
                console.error("Translation failed, saving without translation:", err);
            }
        }

        // 3. Save medication to Supabase
        const { data, error } = await getSupabase()
            .from("medications")
            .insert({
                profile_id: profileId,
                name: scanned.name,
                brand_name: scanned.brandName ?? null,
                dosage: scanned.dosage,
                form: scanned.form,
                frequency: scanned.frequency,
                scheduled_times: finalTimes ?? scanned.suggestedTimes,
                instructions: finalInstructions,
                instructions_translated: translatedInstructions,
                color: scanned.color ?? null,
                interactions: interactions ?? [],
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        // 4. Trigger group-audio generation for today's schedule in the background.
        // Do not await so medication save stays fast.
        const baseUrl = request.nextUrl.origin;
        const today = new Date().toISOString().split("T")[0];
        void fetch(`${baseUrl}/api/voice/generate-schedule`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId, date: today })
        })
            .then((res) => {
                if (!res.ok) {
                    console.error(
                        "[medications] background voice generation trigger failed:",
                        res.status
                    );
                }
            })
            .catch((err) => {
                console.error("Failed to trigger schedule generation:", err);
            });

        return NextResponse.json({
            success: true,
            data: toMedication(data),
        });
    } catch (err) {
        console.error("Save medication error:", err);
        return NextResponse.json(
            { success: false, error: "Invalid request body." },
            { status: 400 }
        );
    }
}
