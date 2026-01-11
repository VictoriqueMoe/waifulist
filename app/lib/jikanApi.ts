import { cache } from "react";
import {
    Anime,
    AnimeCharacter,
    AnimeEpisode,
    AnimeEpisodeDetail,
    AnimePicture,
    AnimeRecommendation,
    AnimeRelation,
    AnimeStatistics,
    CharactersResponse,
    EpisodeDetailResponse,
    EpisodesResponse,
    JikanPaginatedResponse,
    PicturesResponse,
    RecommendationsResponse,
    StatisticsResponse,
    TopReview,
    TopReviewsResponse,
} from "@/types/anime";
import { CharacterFull, CharacterFullResponse } from "@/types/character";
import { PersonFull, PersonFullResponse } from "@/types/person";
import {
    MangaCharacter,
    MangaCharactersResponse,
    MangaFull,
    MangaFullResponse,
    MangaRecommendation,
    MangaRecommendationsResponse,
    MangaStatistics,
    MangaStatisticsResponse,
} from "@/types/manga";
import { DayFilter } from "@/types/schedule";
import { getRequestContext } from "@/lib/requestContext";

const JIKAN_API_URL = process.env.JIKAN_API_URL || "http://jikan:8080/v4";
const JIKAN_TIMEOUT = 10000;
const JIKAN_MAX_RETRIES = 2;
const JIKAN_RETRY_DELAY = 500;

async function jikanLog(level: "warn" | "error", message: string): Promise<void> {
    const ctx = await getRequestContext();
    const timestamp = new Date().toISOString();
    const rsc = ctx.isRsc ? "Y" : "N";
    const prefetch = ctx.isPrefetch ? "Y" : "N";
    const logMessage = `[${timestamp}] [Jikan] [IP: ${ctx.ip}] [Page: ${ctx.page}] [RSC: ${rsc}] [Prefetch: ${prefetch}] ${message}`;

    if (level === "warn") {
        console.warn(logMessage);
    } else {
        console.error(logMessage);
    }
}

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

const fetchFromJikanInternal = async function <T>(endpoint: string, fallback: T): Promise<T> {
    const ctx = await getRequestContext();

    const isAnimeEndpoint = endpoint.startsWith("/anime/");
    if (ctx.isPrefetch && isAnimeEndpoint) {
        return fallback;
    }

    for (let attempt = 0; attempt <= JIKAN_MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), JIKAN_TIMEOUT);
            const response = await fetch(`${JIKAN_API_URL}${endpoint}`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (response.status >= 500 && attempt < JIKAN_MAX_RETRIES) {
                await jikanLog("warn", `500 error for ${endpoint}, retrying (${attempt + 1}/${JIKAN_MAX_RETRIES})...`);
                await delay(JIKAN_RETRY_DELAY);
                continue;
            }

            if (!response.ok) {
                await jikanLog("error", `Failed to fetch ${endpoint}: ${response.status}`);
                return fallback;
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                await jikanLog("error", `Fetch ${endpoint} timed out`);
            } else {
                await jikanLog("error", `Failed to fetch ${endpoint}: ${error}`);
            }

            if (attempt < JIKAN_MAX_RETRIES) {
                await delay(JIKAN_RETRY_DELAY);
                continue;
            }
            return fallback;
        }
    }
    return fallback;
};

const fetchFromJikan = cache(fetchFromJikanInternal);

interface JikanResponse {
    data: Anime;
}

async function fetchAnimeFromJikan(id: number): Promise<Anime | null> {
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

export async function fetchAnimeEpisodes(
    id: number,
    page: number = 1,
): Promise<{ episodes: AnimeEpisode[]; hasNextPage: boolean; lastPage: number }> {
    const response = await fetchFromJikan<EpisodesResponse | null>(`/anime/${id}/episodes?page=${page}`, null);
    return {
        episodes: response?.data || [],
        hasNextPage: response?.pagination?.has_next_page ?? false,
        lastPage: response?.pagination?.last_visible_page ?? 1,
    };
}

export async function fetchAnimeEpisodeDetail(animeId: number, episodeId: number): Promise<AnimeEpisodeDetail | null> {
    const response = await fetchFromJikan<EpisodeDetailResponse | null>(
        `/anime/${animeId}/episodes/${episodeId}`,
        null,
    );
    return response?.data || null;
}

export async function fetchAnimeCharacters(id: number): Promise<AnimeCharacter[]> {
    const response = await fetchFromJikan<CharactersResponse | null>(`/anime/${id}/characters`, null);
    if (!response?.data) {
        return [];
    }
    return response.data.sort((a, b) => {
        if (a.role === "Main" && b.role !== "Main") {
            return -1;
        }
        if (a.role !== "Main" && b.role === "Main") {
            return 1;
        }
        return b.favorites - a.favorites;
    });
}

export async function fetchAnimeStatistics(id: number): Promise<AnimeStatistics | null> {
    const response = await fetchFromJikan<StatisticsResponse | null>(`/anime/${id}/statistics`, null);
    return response?.data || null;
}

export async function fetchTopReviews(limit: number = 6): Promise<TopReview[]> {
    const response = await fetchFromJikan<TopReviewsResponse | null>(`/top/reviews`, null);
    if (!response?.data) {
        return [];
    }
    return response.data.filter(review => review.type === "anime" && !review.is_spoiler).slice(0, limit);
}

export const fetchAnimeFromCdn = fetchAnimeFromJikan;

export async function fetchCharacterById(id: number): Promise<CharacterFull | null> {
    const response = await fetchFromJikan<CharacterFullResponse | null>(`/characters/${id}/full`, null);
    return response?.data || null;
}

export async function fetchPersonById(id: number): Promise<PersonFull | null> {
    const response = await fetchFromJikan<PersonFullResponse | null>(`/people/${id}/full`, null);
    return response?.data || null;
}

export async function fetchMangaById(id: number): Promise<MangaFull | null> {
    const response = await fetchFromJikan<MangaFullResponse | null>(`/manga/${id}/full`, null);
    return response?.data || null;
}

export async function fetchMangaCharacters(id: number): Promise<MangaCharacter[]> {
    const response = await fetchFromJikan<MangaCharactersResponse | null>(`/manga/${id}/characters`, null);
    if (!response?.data) {
        return [];
    }
    return response.data.sort((a, b) => {
        if (a.role === "Main" && b.role !== "Main") {
            return -1;
        }
        if (a.role !== "Main" && b.role === "Main") {
            return 1;
        }
        return 0;
    });
}

export async function fetchMangaPictures(id: number): Promise<AnimePicture[]> {
    const response = await fetchFromJikan<PicturesResponse | null>(`/manga/${id}/pictures`, null);
    return response?.data || [];
}

export async function fetchMangaStatistics(id: number): Promise<MangaStatistics | null> {
    const response = await fetchFromJikan<MangaStatisticsResponse | null>(`/manga/${id}/statistics`, null);
    return response?.data || null;
}

export async function fetchMangaRecommendations(id: number): Promise<MangaRecommendation[]> {
    const response = await fetchFromJikan<MangaRecommendationsResponse | null>(`/manga/${id}/recommendations`, null);
    return response?.data || [];
}

async function fetchSchedulePages(day: DayFilter, includeKids: boolean): Promise<Anime[]> {
    const anime: Anime[] = [];
    let page = 1;
    let hasNextPage = true;
    const kidsParam = includeKids ? "&kids=true" : "";

    while (hasNextPage) {
        const response = await fetchFromJikan<JikanPaginatedResponse<Anime> | null>(
            `/schedules?filter=${day}&page=${page}${kidsParam}`,
            null,
        );

        if (!response?.data) {
            break;
        }

        anime.push(...response.data);
        hasNextPage = response.pagination?.has_next_page ?? false;
        page++;
    }

    return anime;
}

export async function fetchScheduleFromJikan(day: DayFilter): Promise<Anime[]> {
    const [regular, kids] = await Promise.all([fetchSchedulePages(day, false), fetchSchedulePages(day, true)]);

    const seen = new Set<number>();
    const allAnime: Anime[] = [];

    for (const anime of regular) {
        if (!seen.has(anime.mal_id)) {
            seen.add(anime.mal_id);
            allAnime.push(anime);
        }
    }

    for (const anime of kids) {
        if (!seen.has(anime.mal_id)) {
            seen.add(anime.mal_id);
            allAnime.push(anime);
        }
    }

    return allAnime;
}
