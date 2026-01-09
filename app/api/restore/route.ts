import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { BackupData } from "@/types/backup";
import { restoreBookmarks, restoreTierLists, restoreWatchList } from "@/lib/db";

export async function POST(request: NextRequest): Promise<Response> {
    const user = await getCurrentUser();
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorised" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
    try {
        const body = await request.json();
        if (!body) {
            return new Response(JSON.stringify({ error: "No file content provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        const rows: BackupData = JSON.parse(body.content);
        if (rows.Anime && rows.Anime.length > 0) {
            restoreWatchList(user.id, rows.Anime);
        }
        if (rows.Bookmarks && rows.Bookmarks.length > 0) {
            restoreBookmarks(user.id, rows.Bookmarks);
        }
        if (rows.TierLists && rows.TierLists.length > 0) {
            restoreTierLists(user.id, rows.TierLists);
        }
        return NextResponse.json({ completed: true });
    } catch (error) {
        console.error("Restore error:", error);
        return new Response(JSON.stringify({ error: "Failed to restore file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
