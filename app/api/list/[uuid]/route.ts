import { NextRequest, NextResponse } from "next/server";
import { getAllWatched, getUserByPublicId, getWatchedByStatus } from "@/lib/db";
import { getAnimeFromRedisByIds } from "@/services/animeData";

export async function GET(request: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
    const { uuid } = await params;

    const user = getUserByPublicId(uuid);
    if (!user) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const items = status ? getWatchedByStatus(user.id, status) : getAllWatched(user.id);

    const animeIds = items.map(item => item.anime_id);
    const animeMap = await getAnimeFromRedisByIds(animeIds);

    const animeData: Record<number, unknown> = {};
    for (const [id, anime] of animeMap) {
        animeData[id] = anime;
    }

    return NextResponse.json({
        username: user.username,
        items,
        animeData,
    });
}
