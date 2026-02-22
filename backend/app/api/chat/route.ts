import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { askChatbot } from "@/lib/gemini";

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
            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to verify query limit.",
                    details: countError.message,
                },
                { status: 500 }
            );
        }

        if (count !== null && count >= 3) {
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
                remaining: 3 - (count ?? 0) - 1
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
