import { getCurrentUser } from "@/lib/auth";
import { getAiringSubscriptions, getAllBookmarks, getAllWatched, getTierListsByUserId } from "@/lib/db";
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
            Anime: getAllWatched(user.id).map(({ id, user_id, ...dto }) => dto),
            Bookmarks: getAllBookmarks(user.id).map(({ id, user_id, ...dto }) => dto),
            TierLists: getTierListsByUserId(user.id).map(({ id, user_id, ...dto }) => dto),
            AiringSubscriptions: getAiringSubscriptions(user.id).map(({ id, user_id, ...dto }) => dto),
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
