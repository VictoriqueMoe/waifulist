import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserStats } from "@/services/statsService";
import { StatsApiResponse } from "@/types/stats";

export async function GET(): Promise<NextResponse<StatsApiResponse>> {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getUserStats(user.id);
    if (!stats) {
        return NextResponse.json({ success: false, error: "Failed to load stats" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: stats });
}
