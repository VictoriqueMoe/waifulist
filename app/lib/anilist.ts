import { cache } from "react";
import { AniListCharacter, AniListCharacterSearchResponse, AniListMediaCharactersResponse } from "@/types/anilist";
import { AiringInfo } from "@/types/airing";

const ANILIST_API_URL = "https://graphql.anilist.co";
const ANILIST_TIMEOUT = 10000;

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

const AIRING_SCHEDULE_QUERY = `
query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
        pageInfo {
            hasNextPage
            currentPage
        }
        media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
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
            nextAiringEpisode {
                airingAt
                timeUntilAiring
                episode
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

interface AiringScheduleMedia {
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
    nextAiringEpisode: {
        airingAt: number;
        timeUntilAiring: number;
        episode: number;
    } | null;
}

interface AniListAiringScheduleResponse {
    data: {
        Page: {
            pageInfo: {
                hasNextPage: boolean;
                currentPage: number;
            };
            media: AiringScheduleMedia[];
        };
    };
}

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

const fetchFromAniList = async function <T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ANILIST_TIMEOUT);

        const response = await fetch(ANILIST_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query, variables }),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            console.error(`[AniList] Failed to fetch: ${response.status}`);
            return null;
        }

        return await response.json();
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error("[AniList] Request timed out");
        } else {
            console.error(`[AniList] Error: ${error}`);
        }
        return null;
    }
};

export interface SearchResult {
    characters: AniListCharacter[];
    hasNextPage: boolean;
    total: number;
}

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

const fetchAiringScheduleFromAniListInternal = async function (maxPages: number = 3): Promise<AiringInfo[]> {
    const results: AiringInfo[] = [];
    let page = 1;
    let hasNextPage = true;

    while (hasNextPage && page <= maxPages) {
        const response = await fetchFromAniList<AniListAiringScheduleResponse>(AIRING_SCHEDULE_QUERY, {
            page,
            perPage: 50,
        });

        if (!response?.data?.Page?.media) {
            break;
        }

        for (const media of response.data.Page.media) {
            if (media.idMal && media.nextAiringEpisode) {
                results.push({
                    malId: media.idMal,
                    anilistId: media.id,
                    title: media.title.romaji,
                    titleEnglish: media.title.english,
                    coverImage: media.coverImage.large || media.coverImage.medium || "",
                    episode: media.nextAiringEpisode.episode,
                    airingAt: media.nextAiringEpisode.airingAt,
                    timeUntilAiring: media.nextAiringEpisode.timeUntilAiring,
                });
            }
        }

        hasNextPage = response.data.Page.pageInfo.hasNextPage;
        page++;
    }

    results.sort((a, b) => a.airingAt - b.airingAt);

    return results;
};

export const fetchCharactersByMalId = cache(fetchCharactersByMalIdInternal);
export const fetchMangaCharactersByMalId = cache(fetchMangaCharactersByMalIdInternal);
export const fetchCharacterById = cache(fetchCharacterByIdInternal);
export const searchCharactersFromAniList = cache(searchCharactersFromAniListInternal);
export const searchMangaFromAniList = cache(searchMangaFromAniListInternal);
export const fetchAiringScheduleFromAniList = cache(fetchAiringScheduleFromAniListInternal);
export const fetchAnimeStatusByMalIds = cache(fetchAnimeStatusByMalIdsInternal);
