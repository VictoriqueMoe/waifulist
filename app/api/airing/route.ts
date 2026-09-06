import { NextResponse } from "next/server";
import { getAiringSchedule } from "@/services/backend/airingService";
import { anilistErrorResponse } from "@/lib/api/anilistErrorResponse";

export async function GET() {
    try {
        const airing = await getAiringSchedule();
        return NextResponse.json(airing);
    } catch (error) {
        console.error("[API/airing] Error:", error);

        const upstream = anilistErrorResponse(error);
        if (upstream) {
            return upstream;
        }

        return NextResponse.json({ error: "Failed to fetch airing schedule" }, { status: 500 });
    }
}
