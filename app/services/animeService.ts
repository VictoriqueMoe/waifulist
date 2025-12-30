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
                for (const anime of animeList) {
                    result.set(anime.id, anime);
                }
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

export type BrowseSortType = "rating" | "newest";

export async function browseAnime(
    limit: number = 20,
    offset: number = 0,
    sort: BrowseSortType = "rating",
    hideSpecials: boolean = false,
): Promise<{ anime: Anime[]; total: number }> {
    try {
        const params = new URLSearchParams({
            limit: String(limit),
            offset: String(offset),
            sort,
            hideSpecials: String(hideSpecials),
        });
        const response = await fetch(`/api/anime?${params}`);
        if (!response.ok) {
            return { anime: [], total: 0 };
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to browse anime:", error);
        return { anime: [], total: 0 };
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

export async function searchAnime(query: string, limit: number = 20, hideSpecials: boolean = false): Promise<Anime[]> {
    try {
        const params = new URLSearchParams({
            q: query,
            limit: String(limit),
            hideSpecials: String(hideSpecials),
        });
        const response = await fetch(`/api/anime?${params}`);
        if (!response.ok) {
            return [];
        }
        return await response.json();
    } catch (error) {
        console.error("Search failed:", error);
        return [];
    }
}
