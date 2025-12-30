import { Anime } from "@/types/anime";

const CDN_BASE_URL = "https://raw.githubusercontent.com/meesvandongen/anime-dataset/main/data";
const CDN_TIMEOUT = 5000;

export async function fetchAnimeFromCdn(id: number): Promise<Anime | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CDN_TIMEOUT);
        const response = await fetch(`${CDN_BASE_URL}/anime/${id}.json`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error(`[CDN] Fetch anime ${id} timed out`);
        } else {
            console.error(`[CDN] Failed to fetch anime ${id}:`, error);
        }
        return null;
    }
}
