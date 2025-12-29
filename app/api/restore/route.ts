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
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const result = {
                    type: "restored",
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
                controller.close();
            },
        });
        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        console.error("Export error:", error);
        return new Response(JSON.stringify({ error: "Failed to restore file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
