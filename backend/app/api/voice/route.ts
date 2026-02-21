import { NextRequest, NextResponse } from "next/server";
import { generateAndCacheVoice } from "@/lib/elevenlabs";

// POST /api/voice — Generate and cache an ElevenLabs voice clip
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text, seniorName } = body;

        if (!text || !seniorName) {
            return NextResponse.json(
                { success: false, error: "text and seniorName are required." },
                { status: 400 }
            );
        }

        const result = await generateAndCacheVoice(text, seniorName);

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (err) {
        console.error("Voice error:", err);
        return NextResponse.json(
            { success: false, error: "Failed to generate voice clip." },
            { status: 500 }
        );
    }
}
