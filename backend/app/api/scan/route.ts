import { NextRequest, NextResponse } from "next/server";
import { extractLabelFromImage } from "@/lib/gemini";

// POST /api/scan — Receives pill bottle photo, calls Gemini Vision
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { imageBase64 } = body;

        if (!imageBase64) {
            return NextResponse.json(
                { success: false, error: "imageBase64 is required." },
                { status: 400 }
            );
        }

        const scannedMedication = await extractLabelFromImage(imageBase64);

        return NextResponse.json({
            success: true,
            data: scannedMedication,
        });
    } catch (err) {
        console.error("Scan error:", err);
        return NextResponse.json(
            {
                success: false,
                error:
                    "Could not read label clearly. Please try again or enter manually.",
            },
            { status: 500 }
        );
    }
}
