import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { restoreWatchList, WatchedAnimeRow } from "@/lib/db";

export async function POST(request: NextRequest): Promise<Response> {
    const user = await getCurrentUser();
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
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
        const rows: WatchedAnimeRow[] = JSON.parse(body.content);
        restoreWatchList(user.id, rows);
        return new Response(JSON.stringify({ completed: true }), {});
    } catch (error) {
        console.error("Restore error:", error);
        return new Response(JSON.stringify({ error: "Failed to restore file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
