import {
    Anime,
    AnimePicture,
    AnimeRecommendation,
    AnimeRelation,
    PicturesResponse,
    RecommendationsResponse,
} from "@/types/anime";

const JIKAN_API_URL = process.env.JIKAN_API_URL || "http://jikan:8080/v4";
const JIKAN_TIMEOUT = 10000;
const JIKAN_MAX_RETRIES = 2;
const JIKAN_RETRY_DELAY = 500;

const RELATION_PRIORITY: Record<string, number> = {
    Sequel: 1,
    Prequel: 2,
    "Alternative version": 3,
    "Parent story": 4,
    "Side story": 5,
    Summary: 6,
    "Spin-off": 7,
    Other: 8,
    Character: 9,
    Adaptation: 10,
};

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFromJikan<T>(endpoint: string, fallback: T): Promise<T> {
    for (let attempt = 0; attempt <= JIKAN_MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), JIKAN_TIMEOUT);
            const response = await fetch(`${JIKAN_API_URL}${endpoint}`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (response.status >= 500 && attempt < JIKAN_MAX_RETRIES) {
                console.warn(`[Jikan] 500 error for ${endpoint}, retrying (${attempt + 1}/${JIKAN_MAX_RETRIES})...`);
                await delay(JIKAN_RETRY_DELAY);
                continue;
            }

            if (!response.ok) {
                console.error(`[Jikan] Failed to fetch ${endpoint}: ${response.status}`);
                return fallback;
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                console.error(`[Jikan] Fetch ${endpoint} timed out`);
            } else {
                console.error(`[Jikan] Failed to fetch ${endpoint}:`, error);
            }

            if (attempt < JIKAN_MAX_RETRIES) {
                await delay(JIKAN_RETRY_DELAY);
                continue;
            }
            return fallback;
        }
    }
    return fallback;
}

interface JikanResponse {
    data: Anime;
}

export async function fetchAnimeFromJikan(id: number): Promise<Anime | null> {
    function sortRelations(relations: AnimeRelation[]): AnimeRelation[] {
        return [...relations].sort((a, b) => {
            const priorityA = RELATION_PRIORITY[a.relation] ?? 99;
            const priorityB = RELATION_PRIORITY[b.relation] ?? 99;
            return priorityA - priorityB;
        });
    }

    const response = await fetchFromJikan<JikanResponse | null>(`/anime/${id}/full`, null);
    if (!response) {
        return null;
    }

    const anime = response.data;
    if (anime.relations) {
        anime.relations = sortRelations(anime.relations);
    }

    return anime;
}

export async function fetchAnimePictures(id: number): Promise<AnimePicture[]> {
    const response = await fetchFromJikan<PicturesResponse | null>(`/anime/${id}/pictures`, null);
    return response?.data || [];
}

export async function fetchAnimeRecommendations(id: number, limit = 12): Promise<AnimeRecommendation[]> {
    const response = await fetchFromJikan<RecommendationsResponse | null>(`/anime/${id}/recommendations`, null);
    if (!response?.data) {
        return [];
    }
    return response.data.sort((a, b) => b.votes - a.votes).slice(0, limit);
}

export const fetchAnimeFromCdn = fetchAnimeFromJikan;
