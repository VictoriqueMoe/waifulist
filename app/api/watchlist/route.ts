import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
    addToWatchList,
    bulkAddToWatchList,
    DatabaseError,
    getAllWatched,
    getWatchedByStatus,
    getWatchedCountByStatus,
} from "@/lib/db";

export async function GET(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const countsOnly = searchParams.get("counts") === "true";

    if (countsOnly) {
        const counts = getWatchedCountByStatus(user.id);
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        return NextResponse.json({ counts: { ...counts, all: total } });
    }

    const items = status ? getWatchedByStatus(user.id, status) : getAllWatched(user.id);

    return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    try {
        const body = await request.json();

        if (body.animeIds && Array.isArray(body.animeIds)) {
            const count = bulkAddToWatchList(user.id, body.animeIds, body.status || "completed");
            return NextResponse.json({ added: count });
        }

        const { animeId, status } = body;
        if (!animeId || !status) {
            return NextResponse.json({ error: "animeId and status required" }, { status: 400 });
        }

        const item = addToWatchList(user.id, animeId, status);
        return NextResponse.json({ item });
    } catch (error) {
        console.error("Add to watch list error:", error);
        if (error instanceof DatabaseError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to add to watch list" }, { status: 500 });
    }
}
