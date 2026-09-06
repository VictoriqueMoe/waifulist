import { cache } from "react";
import {
    ANILIST_FAILURE_COPY,
    AniListCharacter,
    AniListCharacterSearchResponse,
    AniListFailureReason,
    AniListMediaCharactersResponse,
} from "@/types/anilist";
import { AiringInfo } from "@/types/airing";

export class AniListUnavailableError extends Error {
    public readonly reason: AniListFailureReason;
    public readonly status: number | null;
    public readonly upstreamMessage: string | null;
    public readonly underlyingError: unknown;

    public constructor(
        reason: AniListFailureReason,
        options: { status?: number | null; upstreamMessage?: string | null; underlyingError?: unknown } = {},
    ) {
        super(ANILIST_FAILURE_COPY[reason].description);

        this.name = "AniListUnavailableError";
        this.reason = reason;
        this.status = options.status ?? null;
        this.upstreamMessage = options.upstreamMessage ?? null;
        this.underlyingError = options.underlyingError ?? null;
    }
}

const ANILIST_API_URL = "https://graphql.anilist.co";
const ANILIST_TIMEOUT = 10000;
const ANILIST_MAX_RETRIES = 3;

let rateLimitRemaining = 90;
let rateLimitResetTime = 0;

const CHARACTER_SEARCH_QUERY = `
query ($search: String!, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
        pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
        }
        characters(search: $search, sort: FAVOURITES_DESC) {
            id
            name {
                full
                native
            }
            image {
                large
                medium
            }
            favourites
            gender
            age
            description
            media(sort: POPULARITY_DESC, perPage: 3) {
                nodes {
                    id
                    idMal
                    type
                    title {
                        romaji
                        english
                    }
                }
            }
        }
    }
}
`;

const MEDIA_CHARACTERS_QUERY = `
query ($idMal: Int!, $type: MediaType!, $page: Int, $perPage: Int) {
    Media(idMal: $idMal, type: $type) {
        id
        idMal
        title {
            romaji
            english
        }
        characters(page: $page, perPage: $perPage, sort: FAVOURITES_DESC) {
            pageInfo {
                total
                hasNextPage
            }
            nodes {
                id
                name {
                    full
                    native
                }
                image {
                    large
                    medium
                }
                favourites
                gender
                age
                description
            }
        }
    }
}
`;

const MANGA_SEARCH_QUERY = `
query ($search: String!, $perPage: Int) {
    Page(perPage: $perPage) {
        media(search: $search, type: MANGA, sort: POPULARITY_DESC) {
            id
            idMal
            title {
                romaji
                english
            }
        }
    }
}
`;

const CHARACTER_BY_ID_QUERY = `
query ($id: Int!) {
    Character(id: $id) {
        id
        name {
            full
            native
        }
        image {
            large
            medium
        }
        favourites
        gender
        age
        description
        media(sort: POPULARITY_DESC, perPage: 3) {
            nodes {
                id
                idMal
                type
                title {
                    romaji
                    english
                }
            }
        }
    }
}
`;

const AIRING_SCHEDULES_QUERY = `
query ($page: Int, $perPage: Int, $airingAtGreater: Int, $airingAtLesser: Int, $sort: [AiringSort]) {
    Page(page: $page, perPage: $perPage) {
        pageInfo {
            hasNextPage
            currentPage
        }
        airingSchedules(airingAt_greater: $airingAtGreater, airingAt_lesser: $airingAtLesser, sort: $sort) {
            id
            airingAt
            timeUntilAiring
            episode
            media {
                id
                idMal
                title {
                    romaji
                    english
                }
                coverImage {
                    large
                    medium
                }
                duration
            }
        }
    }
}
`;

const ANIME_STATUS_BY_MAL_IDS_QUERY = `
query ($idMal_in: [Int]) {
    Page(perPage: 50) {
        media(idMal_in: $idMal_in, type: ANIME) {
            idMal
            status
        }
    }
}
`;

type CharacterByIdResponse = {
    data: {
        Character: AniListCharacter | null;
    };
};

export type AnimeStatus = "RELEASING" | "FINISHED" | "NOT_YET_RELEASED" | "CANCELLED" | "HIATUS";

interface AnimeStatusResponse {
    data: {
        Page: {
            media: Array<{
                idMal: number;
                status: AnimeStatus;
            }>;
        };
    };
}

interface AiringScheduleItem {
    id: number;
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
    media: {
        id: number;
        idMal: number | null;
        title: {
            romaji: string;
            english: string | null;
        };
        coverImage: {
            large: string | null;
            medium: string | null;
        };
        duration: number | null;
    };
}

interface AniListAiringSchedulesResponse {
    data: {
        Page: {
            pageInfo: {
                hasNextPage: boolean;
                currentPage: number;
            };
            airingSchedules: AiringScheduleItem[];
        };
    };
}

async function waitForRateLimit(): Promise<void> {
    if (rateLimitRemaining <= 2) {
        const now = Date.now();
        const waitMs = Math.max(rateLimitResetTime - now, 1000);
        console.warn(`[AniList] Rate limit nearly exhausted (${rateLimitRemaining} remaining), waiting ${waitMs}ms`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
    }
}

function updateRateLimitState(response: Response): void {
    const limit = response.headers.get("X-RateLimit-Limit");
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const retryAfter = response.headers.get("Retry-After");
    const resetTimestamp = response.headers.get("X-RateLimit-Reset");

    if (remaining !== null) {
        rateLimitRemaining = parseInt(remaining, 10);
    }
    if (limit !== null && rateLimitRemaining > parseInt(limit, 10)) {
        rateLimitRemaining = parseInt(limit, 10);
    }
    if (retryAfter !== null) {
        rateLimitResetTime = Date.now() + parseInt(retryAfter, 10) * 1000;
    } else if (resetTimestamp !== null) {
        rateLimitResetTime = parseInt(resetTimestamp, 10) * 1000;
    } else if (rateLimitRemaining <= 2) {
        rateLimitResetTime = Date.now() + 60_000;
    }
}

async function readJsonBody(response: Response): Promise<unknown> {
    const text = await response.text();

    if (text.length === 0) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function extractUpstreamMessage(payload: unknown): string | null {
    if (typeof payload !== "object" || payload === null) {
        return null;
    }

    const errors = (payload as { errors?: unknown }).errors;
    if (!Array.isArray(errors) || errors.length === 0) {
        return null;
    }

    const message = (errors[0] as { message?: unknown })?.message;

    return typeof message === "string" && message.length > 0 ? message : null;
}

const fetchFromAniList = async function <T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
    for (let attempt = 0; attempt <= ANILIST_MAX_RETRIES; attempt++) {
        try {
            await waitForRateLimit();

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), ANILIST_TIMEOUT);

            let response: Response;
            try {
                response = await fetch(ANILIST_API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({ query, variables }),
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeout);
            }

            updateRateLimitState(response);

            const payload = await readJsonBody(response);
            const upstreamMessage = extractUpstreamMessage(payload);

            if (response.status === 429) {
                const retryAfter = response.headers.get("Retry-After");
                const resetTimestamp = response.headers.get("X-RateLimit-Reset");
                let waitMs = 60_000;
                if (retryAfter) {
                    waitMs = parseInt(retryAfter, 10) * 1000;
                } else if (resetTimestamp) {
                    waitMs = Math.max(parseInt(resetTimestamp, 10) * 1000 - Date.now(), 1000);
                }
                console.warn(
                    `[AniList] 429 rate limited, retry ${attempt + 1}/${ANILIST_MAX_RETRIES}, waiting ${waitMs}ms`,
                );

                if (attempt < ANILIST_MAX_RETRIES) {
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                    continue;
                }

                throw new AniListUnavailableError("rate_limited", { status: 429, upstreamMessage });
            }

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                const reason: AniListFailureReason =
                    response.status === 403 && upstreamMessage !== null ? "disabled" : "http";
                console.error(`[AniList] Request rejected with ${response.status}: ${upstreamMessage ?? "no detail"}`);

                throw new AniListUnavailableError(reason, { status: response.status, upstreamMessage });
            }

            const data = (payload as { data?: unknown } | null)?.data;
            if (data === null || data === undefined) {
                console.error(`[AniList] Response carried no data: ${upstreamMessage ?? "no detail"}`);

                throw new AniListUnavailableError("invalid_response", {
                    status: response.status,
                    upstreamMessage,
                });
            }

            return payload as T;
        } catch (error) {
            if (error instanceof AniListUnavailableError) {
                throw error;
            }

            const timedOut = error instanceof Error && error.name === "AbortError";
            if (timedOut) {
                console.error("[AniList] Request timed out");
            } else {
                console.error(`[AniList] Request failed: ${error}`);
            }

            if (attempt < ANILIST_MAX_RETRIES) {
                continue;
            }

            throw new AniListUnavailableError(timedOut ? "timeout" : "network", { underlyingError: error });
        }
    }

    throw new AniListUnavailableError("network");
};

const searchCharactersFromAniListInternal = async function (
    query: string,
    page: number = 1,
    perPage: number = 20,
): Promise<SearchResult> {
    const response = await fetchFromAniList<AniListCharacterSearchResponse>(CHARACTER_SEARCH_QUERY, {
        search: query,
        page,
        perPage,
    });

    if (!response?.data?.Page) {
        return { characters: [], hasNextPage: false, total: 0 };
    }

    return {
        characters: response.data.Page.characters,
        hasNextPage: response.data.Page.pageInfo.hasNextPage,
        total: response.data.Page.pageInfo.total,
    };
};

const fetchCharacterByIdInternal = async function (id: number): Promise<AniListCharacter | null> {
    const response = await fetchFromAniList<CharacterByIdResponse>(CHARACTER_BY_ID_QUERY, { id });
    return response?.data?.Character ?? null;
};

type MediaType = "ANIME" | "MANGA";

const fetchCharactersByMediaMalIdInternal = async function (
    malId: number,
    mediaType: MediaType,
    page: number = 1,
    perPage: number = 20,
): Promise<SearchResult> {
    const response = await fetchFromAniList<AniListMediaCharactersResponse>(MEDIA_CHARACTERS_QUERY, {
        idMal: malId,
        type: mediaType,
        page,
        perPage,
    });

    if (!response?.data?.Media?.characters) {
        return { characters: [], hasNextPage: false, total: 0 };
    }

    const media = response.data.Media;
    const mediaInfo = {
        id: media.id,
        idMal: media.idMal,
        type: mediaType,
        title: media.title,
    };

    const characters: AniListCharacter[] = response.data.Media.characters.nodes.map(node => ({
        ...node,
        media: {
            nodes: [mediaInfo],
        },
    }));

    return {
        characters,
        hasNextPage: response.data.Media.characters.pageInfo.hasNextPage,
        total: response.data.Media.characters.pageInfo.total,
    };
};

const fetchCharactersByMalIdInternal = (malId: number, page?: number, perPage?: number) =>
    fetchCharactersByMediaMalIdInternal(malId, "ANIME", page, perPage);

const fetchMangaCharactersByMalIdInternal = (malId: number, page?: number, perPage?: number) =>
    fetchCharactersByMediaMalIdInternal(malId, "MANGA", page, perPage);

export interface MangaSearchResult {
    id: number;
    idMal: number | null;
    title: string;
}

interface AniListMangaSearchResponse {
    data: {
        Page: {
            media: Array<{
                id: number;
                idMal: number | null;
                title: {
                    romaji: string;
                    english: string | null;
                };
            }>;
        };
    };
}

const searchMangaFromAniListInternal = async function (
    query: string,
    perPage: number = 10,
): Promise<MangaSearchResult[]> {
    const response = await fetchFromAniList<AniListMangaSearchResponse>(MANGA_SEARCH_QUERY, {
        search: query,
        perPage,
    });

    if (!response?.data?.Page?.media) {
        return [];
    }

    return response.data.Page.media
        .filter(m => m.idMal !== null)
        .map(m => ({
            id: m.id,
            idMal: m.idMal,
            title: m.title.english || m.title.romaji,
        }));
};

async function fetchAnimeStatusByMalIdsInternal(malIds: number[]): Promise<Map<number, AnimeStatus>> {
    const statusMap = new Map<number, AnimeStatus>();

    for (let i = 0; i < malIds.length; i += 50) {
        const batch = malIds.slice(i, i + 50);
        const response = await fetchFromAniList<AnimeStatusResponse>(ANIME_STATUS_BY_MAL_IDS_QUERY, {
            idMal_in: batch,
        });

        if (response?.data?.Page?.media) {
            for (const media of response.data.Page.media) {
                statusMap.set(media.idMal, media.status);
            }
        }
    }

    return statusMap;
}

interface FetchAiringOptions {
    airingAtGreater: number;
    airingAtLesser?: number;
    sort: "TIME" | "TIME_DESC";
    maxPages?: number;
}

async function fetchAiringSchedulesInternal(options: FetchAiringOptions): Promise<AiringInfo[]> {
    const { airingAtGreater, airingAtLesser, sort, maxPages = 3 } = options;
    const results: AiringInfo[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage && page <= maxPages) {
        const response = await fetchFromAniList<AniListAiringSchedulesResponse>(AIRING_SCHEDULES_QUERY, {
            page,
            perPage: 50,
            airingAtGreater,
            airingAtLesser,
            sort: [sort],
        });

        if (!response?.data?.Page?.airingSchedules) {
            break;
        }

        for (const schedule of response.data.Page.airingSchedules) {
            if (schedule.media.idMal) {
                results.push({
                    malId: schedule.media.idMal,
                    anilistId: schedule.media.id,
                    title: schedule.media.title.romaji,
                    titleEnglish: schedule.media.title.english,
                    coverImage: schedule.media.coverImage.large || schedule.media.coverImage.medium || "",
                    duration: schedule.media.duration,
                    episode: schedule.episode,
                    airingAt: schedule.airingAt,
                    timeUntilAiring: schedule.timeUntilAiring,
                });
            }
        }

        hasNextPage = response.data.Page.pageInfo.hasNextPage;
        page++;
    }

    return results;
}

async function fetchUpcomingAiringScheduleInternal(): Promise<AiringInfo[]> {
    const now = Math.floor(Date.now() / 1000);
    const oneWeekFromNow = now + 60 * 60 * 24 * 7;

    return fetchAiringSchedulesInternal({
        airingAtGreater: now,
        airingAtLesser: oneWeekFromNow,
        sort: "TIME",
        maxPages: 3,
    });
}

async function fetchAiringSchedulesFromAniListInternal(): Promise<{ airing: AiringInfo[]; airedToday: AiringInfo[] }> {
    const now = Math.floor(Date.now() / 1000);
    const twentyFourHoursAgo = now - 60 * 60 * 24;

    const [airing, airedToday] = await Promise.all([
        fetchUpcomingAiringScheduleInternal(),
        fetchAiringSchedulesInternal({
            airingAtGreater: twentyFourHoursAgo,
            airingAtLesser: now,
            sort: "TIME_DESC",
            maxPages: 2,
        }),
    ]);

    return { airing, airedToday };
}

export const fetchCharactersByMalId = cache(fetchCharactersByMalIdInternal);
export const fetchMangaCharactersByMalId = cache(fetchMangaCharactersByMalIdInternal);
export const fetchCharacterById = cache(fetchCharacterByIdInternal);
export const searchCharactersFromAniList = cache(searchCharactersFromAniListInternal);
export const searchMangaFromAniList = cache(searchMangaFromAniListInternal);
export const fetchAnimeStatusByMalIds = cache(fetchAnimeStatusByMalIdsInternal);
export const fetchUpcomingAiringSchedule = cache(fetchUpcomingAiringScheduleInternal);
export const fetchAiringSchedules = cache(fetchAiringSchedulesFromAniListInternal);
export interface SearchResult {
    characters: AniListCharacter[];
    hasNextPage: boolean;
    total: number;
}
