import { getCurrentUser } from "@/lib/auth";
import { getAllWatched } from "@/lib/db";

export async function POST(): Promise<Response> {
    const user = await getCurrentUser();
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
    try {
        const items = getAllWatched(user.id);
        return new Response(JSON.stringify(items));
    } catch (error) {
        console.error("Export error:", error);
        return new Response(JSON.stringify({ error: "Failed to export file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
