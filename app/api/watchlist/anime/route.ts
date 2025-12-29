import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllWatched } from "@/lib/db";
import { getAnimeById } from "@/services/animeData";
import { Anime } from "@/types/anime";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = getAllWatched(user.id);
    const animeIds = items.map(item => item.anime_id);

    const animeResults = await Promise.all(animeIds.map(id => getAnimeById(id, false, true)));

    const animeData: Record<number, Anime> = {};
    animeResults.forEach((anime, index) => {
        if (anime) {
            animeData[animeIds[index]] = anime;
        }
    });

    return NextResponse.json(animeData);
}
