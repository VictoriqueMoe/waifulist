import { getCurrentUser } from "@/lib/auth";
import { getAllWatched } from "@/lib/db";
import { getAnimeById } from "@/services/animeData";

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
        const augmented = await Promise.all(
            items.map(async item => {
                const anime = await getAnimeById(item.anime_id);
                return { data: item, anime: anime?.title ?? "" };
            }),
        );
        return new Response(JSON.stringify(augmented));
    } catch (error) {
        console.error("Export error:", error);
        return new Response(JSON.stringify({ error: "Failed to export file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
