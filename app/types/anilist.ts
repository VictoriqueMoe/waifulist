export type AniListFailureReason = "disabled" | "rate_limited" | "timeout" | "network" | "http" | "invalid_response";

export interface AniListFailureCopy {
    title: string;
    description: string;
}

export const ANILIST_FAILURE_COPY: Record<AniListFailureReason, AniListFailureCopy> = {
    disabled: {
        title: "AniList has turned its API off",
        description:
            "AniList has disabled its public API, so airing times, countdowns and character data cannot be loaded. Nothing is broken on this end, and everything returns as soon as AniList switch it back on.",
    },
    rate_limited: {
        title: "AniList is rate limiting us",
        description:
            "AniList is refusing requests because too many were made too quickly. This should clear on its own within a minute or two.",
    },
    timeout: {
        title: "AniList is not responding",
        description:
            "AniList took too long to answer. It is usually overloaded rather than offline, so it is worth trying again shortly.",
    },
    network: {
        title: "AniList could not be reached",
        description: "The request to AniList failed before it got a reply. Their API may be offline or unreachable.",
    },
    http: {
        title: "AniList returned an error",
        description: "AniList replied with an unexpected error. This is a problem on their side, not yours.",
    },
    invalid_response: {
        title: "AniList sent an unusable response",
        description: "AniList replied, but the response could not be read. This is a problem on their side, not yours.",
    },
};

const ANILIST_FAILURE_REASONS = Object.keys(ANILIST_FAILURE_COPY) as AniListFailureReason[];

export function isAniListFailureReason(value: unknown): value is AniListFailureReason {
    return typeof value === "string" && ANILIST_FAILURE_REASONS.includes(value as AniListFailureReason);
}

export interface AniListErrorBody {
    error: string;
    source: "anilist";
    reason: AniListFailureReason;
    upstreamMessage: string | null;
}

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
