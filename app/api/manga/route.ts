import { NextRequest, NextResponse } from "next/server";
import { searchMangaFromAniList } from "@/lib/anilist";
import { anilistErrorResponse } from "@/lib/api/anilistErrorResponse";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = Math.min(25, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        const results = await searchMangaFromAniList(query, limit);
        return NextResponse.json({
            results: results.map(m => ({
                mal_id: m.idMal,
                title: m.title,
            })),
        });
    } catch (error) {
        console.error("[Manga Search] Error:", error);

        const upstream = anilistErrorResponse(error);
        if (upstream) {
            return upstream;
        }

        return NextResponse.json({ error: "Failed to search manga" }, { status: 500 });
    }
}
