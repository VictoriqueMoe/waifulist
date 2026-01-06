import { NextRequest, NextResponse } from "next/server";
import { getAnimeById } from "@/services/animeData";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const animeId = parseInt(id, 10);

    if (isNaN(animeId)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const anime = await getAnimeById(animeId, true);

    if (!anime) {
        return NextResponse.json({ error: "Anime not found" }, { status: 404 });
    }

    return NextResponse.json(anime);
}
