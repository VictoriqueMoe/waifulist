export interface AniListCharacterName {
    full: string;
    native: string | null;
}

export interface AniListCharacterImage {
    large: string;
    medium: string;
}

export interface AniListMediaTitle {
    romaji: string;
    english: string | null;
}

export interface AniListMedia {
    id: number;
    idMal: number | null;
    type?: "ANIME" | "MANGA";
    title: AniListMediaTitle;
}

export interface AniListCharacter {
    id: number;
    name: AniListCharacterName;
    image: AniListCharacterImage;
    favourites: number;
    gender: string | null;
    age: string | null;
    description: string | null;
    media: {
        nodes: AniListMedia[];
    };
}

export interface AniListPageInfo {
    total: number;
    currentPage: number;
    lastPage: number;
    hasNextPage: boolean;
    perPage: number;
}

export interface AniListCharacterSearchResponse {
    data: {
        Page: {
            pageInfo: AniListPageInfo;
            characters: AniListCharacter[];
        };
    };
}

export interface AniListCharacterNode {
    id: number;
    name: AniListCharacterName;
    image: AniListCharacterImage;
    favourites: number;
    gender: string | null;
    age: string | null;
    description: string | null;
}

export interface AniListMediaCharactersResponse {
    data: {
        Media: {
            id: number;
            idMal: number | null;
            title: AniListMediaTitle;
            characters: {
                pageInfo: {
                    total: number;
                    hasNextPage: boolean;
                };
                nodes: AniListCharacterNode[];
            };
        } | null;
    };
}
