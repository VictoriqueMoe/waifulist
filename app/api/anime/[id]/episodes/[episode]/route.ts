import { NextRequest, NextResponse } from "next/server";
import { fetchAnimeEpisodeDetail } from "@/lib/cdn";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; episode: string }> }) {
    const { id, episode } = await params;
    const animeId = parseInt(id, 10);
    const episodeId = parseInt(episode, 10);

    if (isNaN(animeId) || isNaN(episodeId)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const episodeDetail = await fetchAnimeEpisodeDetail(animeId, episodeId);

    if (!episodeDetail) {
        return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    return NextResponse.json(episodeDetail);
}
