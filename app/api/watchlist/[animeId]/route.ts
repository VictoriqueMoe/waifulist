import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWatchedAnime, removeFromWatchList, updateWatchStatus } from "@/lib/db";

interface RouteParams {
    params: Promise<{ animeId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { animeId } = await params;
    const item = getWatchedAnime(user.id, parseInt(animeId, 10));

    if (!item) {
        return NextResponse.json({ item: null });
    }

    return NextResponse.json({ item });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { animeId } = await params;
    const body = await request.json();
    const { status, episodesWatched, rating } = body;

    const updates: { status?: string; episodes_watched?: number; rating?: number | null } = {};
    if (status !== undefined) {
        updates.status = status;
    }
    if (episodesWatched !== undefined) {
        updates.episodes_watched = episodesWatched;
    }
    if (rating !== undefined) {
        updates.rating = rating;
    }

    const item = updateWatchStatus(user.id, parseInt(animeId, 10), updates);
    return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { animeId } = await params;
    const removed = removeFromWatchList(user.id, parseInt(animeId, 10));

    return NextResponse.json({ removed });
}
