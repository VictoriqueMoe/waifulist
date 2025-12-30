import { NextRequest, NextResponse } from "next/server";
import { getAnimeFromRedisByIds } from "@/services/animeData";
import { Anime } from "@/types/anime";
import { ANIME_BATCH_SIZE } from "@/lib/constants";

export async function POST(request: NextRequest): Promise<NextResponse<Anime[]>> {
    try {
        const body = await request.json();
        const ids = body.ids as number[];

        if (!ids || !Array.isArray(ids)) {
            return NextResponse.json([]);
        }

        const limitedIds = ids.slice(0, ANIME_BATCH_SIZE);

        const animeMap = await getAnimeFromRedisByIds(limitedIds);

        return NextResponse.json(Array.from(animeMap.values()));
    } catch (error) {
        console.error("Batch fetch error:", error);
        return NextResponse.json([]);
    }
}
