import { Anime } from "@/types/anime";
import { ANIME_BATCH_SIZE } from "@/lib/constants";

let batchPromise: Promise<Map<number, Anime>> | null = null;
let batchIds: number[] | null = null;

export async function getAnimeById(id: number): Promise<Anime | null> {
    try {
        const response = await fetch(`/api/anime/${id}`);
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch anime ${id}:`, error);
        return null;
    }
}

async function fetchBatch(ids: number[]): Promise<Map<number, Anime>> {
    const result = new Map<number, Anime>();

    if (ids.length === 0) {
        return result;
    }

    const chunkSize = ANIME_BATCH_SIZE;
    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        try {
            const response = await fetch("/api/anime/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: chunk }),
            });

            if (response.ok) {
                const animeList: Anime[] = await response.json();
                animeList.forEach(anime => {
                    result.set(anime.id, anime);
                });
            }
        } catch (error) {
            console.error("Batch fetch failed:", error);
        }
    }

    return result;
}

export async function getAnimeBatch(ids: number[]): Promise<Map<number, Anime>> {
    if (ids.length === 0) {
        return new Map();
    }

    const idsKey = ids
        .slice()
        .sort((a, b) => a - b)
        .join(",");
    const cachedKey = batchIds
        ?.slice()
        .sort((a, b) => a - b)
        .join(",");

    if (batchPromise && idsKey === cachedKey) {
        return batchPromise;
    }

    batchIds = ids;
    batchPromise = fetchBatch(ids);

    try {
        return await batchPromise;
    } finally {
        batchPromise = null;
        batchIds = null;
    }
}

export async function getPopularAnime(limit: number = 20): Promise<Anime[]> {
    try {
        const response = await fetch(`/api/anime?limit=${limit}`);
        if (!response.ok) {
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch popular anime:", error);
        return [];
    }
}

export async function getHomePageAnime(): Promise<{ featured: Anime[]; popular: Anime[] }> {
    try {
        const response = await fetch("/api/anime?home=true");
        if (!response.ok) {
            return { featured: [], popular: [] };
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch homepage anime:", error);
        return { featured: [], popular: [] };
    }
}

export async function searchAnime(query: string, limit: number = 20): Promise<Anime[]> {
    try {
        const response = await fetch(`/api/anime?q=${encodeURIComponent(query)}&limit=${limit}`);
        if (!response.ok) {
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Search failed:", error);
        return [];
    }
}
