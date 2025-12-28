import { NextRequest, NextResponse } from "next/server";
import { getHomePageAnime, getPopularAnime, searchAnime } from "@/services/animeData";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const home = searchParams.get("home");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (query) {
        const results = await searchAnime(query, limit);
        return NextResponse.json(results);
    }

    if (home === "true") {
        const data = await getHomePageAnime();
        return NextResponse.json(data);
    }

    const popular = await getPopularAnime(limit);
    return NextResponse.json(popular);
}
