import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

// POST /api/profile — Create a new profile
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { seniorName, caregiverName } = body;

        if (!seniorName || !caregiverName) {
            return NextResponse.json(
                { success: false, error: "seniorName and caregiverName are required." },
                { status: 400 }
            );
        }

        const { data, error } = await getSupabase()
            .from("profiles")
            .insert({
                senior_name: seniorName,
                caregiver_name: caregiverName,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                id: data.id,
                seniorName: data.senior_name,
                caregiverName: data.caregiver_name,
                createdAt: data.created_at,
            },
        });
    } catch (err) {
        console.error("Profile POST error:", err);
        return NextResponse.json(
            { success: false, error: "Invalid request body." },
            { status: 400 }
        );
    }
}

// GET /api/profile?profileId=xxx — Get a profile
export async function GET(request: NextRequest) {
    const profileId = request.nextUrl.searchParams.get("profileId");

    if (!profileId) {
        return NextResponse.json(
            { success: false, error: "profileId query parameter is required." },
            { status: 400 }
        );
    }

    const { data, error } = await getSupabase()
        .from("profiles")
        .select()
        .eq("id", profileId)
        .single();

    if (error) {
        return NextResponse.json(
            { success: false, error: "Profile not found." },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        data: {
            id: data.id,
            seniorName: data.senior_name,
            caregiverName: data.caregiver_name,
            createdAt: data.created_at,
        },
    });
}
