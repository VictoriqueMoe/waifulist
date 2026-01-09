import { cache } from "react";
import { AniListCharacter, AniListCharacterSearchResponse, AniListMediaCharactersResponse } from "@/types/anilist";

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
query ($idMal: Int!, $page: Int, $perPage: Int) {
    Media(idMal: $idMal, type: ANIME) {
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
                title {
                    romaji
                    english
                }
            }
        }
    }
}
`;

type CharacterByIdResponse = {
    data: {
        Character: AniListCharacter | null;
    };
};

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

const fetchCharactersByMalIdInternal = async function (
    malId: number,
    page: number = 1,
    perPage: number = 20,
): Promise<SearchResult> {
    const response = await fetchFromAniList<AniListMediaCharactersResponse>(MEDIA_CHARACTERS_QUERY, {
        idMal: malId,
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

export const fetchCharactersByMalId = cache(fetchCharactersByMalIdInternal);
export const fetchCharacterById = cache(fetchCharacterByIdInternal);
export const searchCharactersFromAniList = cache(searchCharactersFromAniListInternal);
