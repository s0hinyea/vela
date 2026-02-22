import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { askChatbot } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json(
        { success: false, error: "Method not allowed. Use POST /api/chat." },
        { status: 405 }
    );
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            Allow: "POST, OPTIONS",
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { profileId, medicationId, question } = body;

        if (!profileId || !medicationId || !question) {
            return NextResponse.json(
                { success: false, error: "Missing required fields: profileId, medicationId, question." },
                { status: 400 }
            );
        }

        const supabase = getSupabase();

        // 1. Check rate limit - 3 questions per day
        const today = new Date().toISOString().split("T")[0];
        const startOfDay = `${today}T00:00:00.000Z`;
        const endOfDay = `${today}T23:59:59.999Z`;

        const { count, error: countError } = await supabase
            .from("chat_logs")
            .select("*", { count: "exact", head: true })
            .eq("profile_id", profileId)
            .gte("created_at", startOfDay)
            .lte("created_at", endOfDay);

        if (countError) {
            console.error("[chat] rate-limit query failed:", countError);
        }

        const dailyCount = countError ? null : count ?? 0;

        if (dailyCount !== null && dailyCount >= 3) {
            return NextResponse.json(
                { 
                    success: false, 
                    error: "Daily limit reached. You can ask 3 questions per day to keep Vela healthy!",
                    limitReached: true 
                },
                { status: 429 }
            );
        }

        // 2. Fetch medication context
        const { data: med, error: medError } = await supabase
            .from("medications")
            .select("*")
            .eq("id", medicationId)
            .single();

        if (medError || !med) {
            return NextResponse.json(
                { success: false, error: "Medication context not found." },
                { status: 404 }
            );
        }

        // 3. Call Gemini Chatbot
        const medInfo = {
            name: med.name,
            dosage: med.dosage,
            form: med.form,
            frequency: med.frequency,
            scheduledTimes: med.scheduled_times,
            instructions: med.instructions,
            warnings: med.interactions?.map((i: any) => i.explanation) ?? [],
        };

        const answer = await askChatbot(medInfo, question);

        // 4. Log the interaction
        const { error: logError } = await supabase
            .from("chat_logs")
            .insert({
                profile_id: profileId,
                medication_id: medicationId,
                question: question,
                answer: answer
            });

        if (logError) {
            console.error("Failed to log chat interaction:", logError);
            // We still return the answer to the user even if logging fails
        }

        return NextResponse.json({
            success: true,
            data: {
                answer,
                // If rate-limit lookup failed, keep chat available and avoid blocking the experience.
                remaining: dailyCount === null ? 3 : Math.max(0, 3 - dailyCount - 1)
            }
        });

    } catch (err) {
        console.error("Chat API error:", err);
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
