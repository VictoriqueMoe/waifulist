import { NextResponse } from "next/server";
import { getAiringSchedule } from "@/services/airingService";

export async function GET() {
    try {
        const airing = await getAiringSchedule();
        return NextResponse.json(airing);
    } catch (error) {
        console.error("[API/airing] Error:", error);
        return NextResponse.json({ error: "Failed to fetch airing schedule" }, { status: 500 });
    }
}
