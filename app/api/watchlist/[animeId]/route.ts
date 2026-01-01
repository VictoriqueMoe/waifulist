import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseError, getWatchedAnime, removeFromWatchList, updateWatchStatus } from "@/lib/db";

interface RouteParams {
    params: Promise<{ animeId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
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
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    try {
        const { animeId } = await params;
        const body = await request.json();
        const { status, episodesWatched, rating, notes } = body;

        const updates: { status?: string; episodes_watched?: number; rating?: number | null; notes?: string | null } =
            {};
        if (status !== undefined) {
            updates.status = status;
        }
        if (episodesWatched !== undefined) {
            updates.episodes_watched = episodesWatched;
        }
        if (rating !== undefined) {
            updates.rating = rating;
        }
        if (notes !== undefined) {
            updates.notes = notes;
        }

        const item = updateWatchStatus(user.id, parseInt(animeId, 10), updates);
        return NextResponse.json({ item });
    } catch (error) {
        console.error("Update watch status error:", error);
        if (error instanceof DatabaseError && error.message.includes("No watch list entry")) {
            return NextResponse.json({ error: "Anime not in watch list" }, { status: 404 });
        }
        return NextResponse.json({ error: "Failed to update watch status" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    try {
        const { animeId } = await params;
        const removed = removeFromWatchList(user.id, parseInt(animeId, 10));
        return NextResponse.json({ removed });
    } catch (error) {
        console.error("Remove from watch list error:", error);
        return NextResponse.json({ error: "Failed to remove from watch list" }, { status: 500 });
    }
}
