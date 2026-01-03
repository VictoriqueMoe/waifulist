import { NextRequest, NextResponse } from "next/server";
import { ensureSearchIndex, getAnimeBySeason } from "@/services/animeData";
import { getAllSeasons, Season } from "@/lib/seasonUtils";

const VALID_SEASONS = new Set<string>(getAllSeasons());

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;

    const yearParam = searchParams.get("year");
    const seasonParam = searchParams.get("season");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    if (!yearParam || !seasonParam) {
        return NextResponse.json({ error: "Missing required parameters: year and season" }, { status: 400 });
    }

    const year = parseInt(yearParam, 10);
    if (isNaN(year) || year < 1970 || year > new Date().getFullYear() + 1) {
        return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    if (!VALID_SEASONS.has(seasonParam)) {
        return NextResponse.json(
            { error: "Invalid season. Must be one of: winter, spring, summer, fall" },
            { status: 400 },
        );
    }

    const season = seasonParam as Season;
    const limit = limitParam ? parseInt(limitParam, 10) : 24;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    await ensureSearchIndex();

    const result = await getAnimeBySeason(year, season, { limit, offset });

    return NextResponse.json(result);
}
