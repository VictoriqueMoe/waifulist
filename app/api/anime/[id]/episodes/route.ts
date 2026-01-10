import { NextRequest, NextResponse } from "next/server";
import { fetchAnimeEpisodes } from "@/lib/jikanApi";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const animeId = parseInt(id, 10);

    if (isNaN(animeId)) {
        return NextResponse.json({ error: "Invalid anime ID" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);

    const data = await fetchAnimeEpisodes(animeId, page);
    return NextResponse.json(data);
}
