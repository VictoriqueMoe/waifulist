import { Anime, AnimeRelation } from "@/types/anime";

const JIKAN_API_URL = process.env.JIKAN_API_URL || "http://jikan:8080/v4";
const JIKAN_TIMEOUT = 10000;
const JIKAN_MAX_RETRIES = 2;
const JIKAN_RETRY_DELAY = 500;

// Priority order for displaying relations
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

function sortRelations(relations: AnimeRelation[]): AnimeRelation[] {
    return [...relations].sort((a, b) => {
        const priorityA = RELATION_PRIORITY[a.relation] ?? 99;
        const priorityB = RELATION_PRIORITY[b.relation] ?? 99;
        return priorityA - priorityB;
    });
}

interface JikanResponse {
    data: Anime;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchAnimeFromJikan(id: number): Promise<Anime | null> {
    for (let attempt = 0; attempt <= JIKAN_MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), JIKAN_TIMEOUT);
            const response = await fetch(`${JIKAN_API_URL}/anime/${id}/full`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (response.status >= 500 && attempt < JIKAN_MAX_RETRIES) {
                console.warn(`[Jikan] 500 error for anime ${id}, retrying (${attempt + 1}/${JIKAN_MAX_RETRIES})...`);
                await delay(JIKAN_RETRY_DELAY);
                continue;
            }

            if (!response.ok) {
                console.error(`[Jikan] Failed to fetch anime ${id}: ${response.status}`);
                return null;
            }

            const json: JikanResponse = await response.json();
            const anime = json.data;

            if (anime.relations) {
                anime.relations = sortRelations(anime.relations);
            }

            return anime;
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                console.error(`[Jikan] Fetch anime ${id} timed out`);
            } else {
                console.error(`[Jikan] Failed to fetch anime ${id}:`, error);
            }

            if (attempt < JIKAN_MAX_RETRIES) {
                await delay(JIKAN_RETRY_DELAY);
                continue;
            }
            return null;
        }
    }
    return null;
}

export const fetchAnimeFromCdn = fetchAnimeFromJikan;
