import { NextRequest, NextResponse } from "next/server";
import { getAllWatched, getUserByPublicId, getWatchedByStatus } from "@/lib/db";

export async function GET(request: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
    const { uuid } = await params;

    const user = getUserByPublicId(uuid);
    if (!user) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const items = status ? getWatchedByStatus(user.id, status) : getAllWatched(user.id);

    return NextResponse.json({
        username: user.username,
        items,
    });
}
