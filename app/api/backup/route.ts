import { getCurrentUser } from "@/lib/auth";
import { getAllWatched, getAllBookmarks, getTierListsByUserId } from "@/lib/db";
import { BackupData } from "@/types/backup";
import { NextResponse } from "next/server";

export async function POST(): Promise<Response> {
    const user = await getCurrentUser();
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorised" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
    try {
        const backupData: BackupData = {
            Anime: getAllWatched(user.id),
            Bookmarks: getAllBookmarks(user.id),
            TierLists: getTierListsByUserId(user.id),
        };
        return NextResponse.json(backupData);
    } catch (error) {
        console.error("Export error:", error);
        return new Response(JSON.stringify({ error: "Failed to export file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
