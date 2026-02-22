import { NextRequest, NextResponse } from "next/server";
import { checkInteractions } from "@/lib/gemini";

// POST /api/interact — Checks drug-drug interactions via Gemini reasoning
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { existingMedications, newMedication, dosage, frequency } = body;

        if (!newMedication) {
            return NextResponse.json(
                { success: false, error: "newMedication is required." },
                { status: 400 }
            );
        }

        const result = await checkInteractions(
            existingMedications ?? [],
            newMedication,
            dosage,
            frequency
        );

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (err) {
        console.error("Interact error:", err);
        return NextResponse.json(
            { success: false, error: "Failed to check interactions." },
            { status: 500 }
        );
    }
}
