import { NextResponse } from "next/server";
import { getSchedule } from "@/services/backend/scheduleService";
import { anilistErrorResponse } from "@/lib/api/anilistErrorResponse";

export async function GET() {
    try {
        const schedule = await getSchedule();
        return NextResponse.json(schedule);
    } catch (error) {
        console.error("[API/schedule] Error:", error);

        const upstream = anilistErrorResponse(error);
        if (upstream) {
            return upstream;
        }

        return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
    }
}
