import { NextResponse } from "next/server";

// Health check route — confirms the API is live
export async function GET() {
    return NextResponse.json({
        status: "ok",
        service: "vela-backend",
        version: "1.0.0",
        routes: [
            "POST /api/profile",
            "GET  /api/profile?profileId=",
            "POST /api/scan",
            "POST /api/interact",
            "POST /api/voice",
            "POST /api/medications",
            "GET  /api/medications?profileId=",
            "GET  /api/schedule/today?profileId=",
            "POST /api/doses/log",
            "GET  /api/notifications/schedule?profileId=",
        ],
    });
}
