import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllWatched } from "@/lib/db";
import { getAnimeFromRedisByIds } from "@/services/animeData";

export async function GET() {
    const start = Date.now();

    const user = await getCurrentUser();
    const authTime = Date.now() - start;

    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const dbStart = Date.now();
    const items = getAllWatched(user.id);
    const dbTime = Date.now() - dbStart;

    const animeIds = items.map(item => item.anime_id);

    const redisStart = Date.now();
    const animeMap = await getAnimeFromRedisByIds(animeIds);
    const redisTime = Date.now() - redisStart;

    const animeData: Record<number, unknown> = {};

    for (const [id, anime] of animeMap) {
        animeData[id] = anime;
    }

    const totalTime = Date.now() - start;
    console.log(
        `[/api/watchlist/anime] auth=${authTime}ms db=${dbTime}ms redis=${redisTime}ms total=${totalTime}ms (${animeIds.length} items)`,
    );

    return NextResponse.json(animeData);
}
