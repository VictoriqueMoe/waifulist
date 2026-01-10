import { AnimePicture } from "@/types/anime";

export interface MangaImage {
    jpg: {
        image_url: string;
        small_image_url: string;
        large_image_url: string;
    };
    webp?: {
        image_url: string;
        small_image_url: string;
        large_image_url: string;
    };
}

export interface MangaTitle {
    type: string;
    title: string;
}

export interface MangaPublished {
    from: string | null;
    to: string | null;
    prop: {
        from: { day: number | null; month: number | null; year: number | null };
        to: { day: number | null; month: number | null; year: number | null };
    };
    string: string;
}

export interface MangaAuthor {
    mal_id: number;
    type: string;
    name: string;
    url: string;
}

export interface MangaSerialization {
    mal_id: number;
    type: string;
    name: string;
    url: string;
}

export interface MangaGenre {
    mal_id: number;
    type: string;
    name: string;
    url: string;
}

export interface MangaRelationEntry {
    mal_id: number;
    type: "anime" | "manga";
    name: string;
    url: string;
}

export interface MangaRelation {
    relation: string;
    entry: MangaRelationEntry[];
}

export interface MangaCharacterEntry {
    mal_id: number;
    url: string;
    images: AnimePicture;
    name: string;
}

export interface MangaCharacter {
    character: MangaCharacterEntry;
    role: "Main" | "Supporting";
}

export interface MangaFull {
    mal_id: number;
    url: string;
    images: MangaImage;
    approved: boolean;
    titles: MangaTitle[];
    title: string;
    title_english: string | null;
    title_japanese: string | null;
    title_synonyms: string[];
    type: string | null;
    chapters: number | null;
    volumes: number | null;
    status: string;
    publishing: boolean;
    published: MangaPublished;
    score: number | null;
    scored: number | null;
    scored_by: number | null;
    rank: number | null;
    popularity: number | null;
    members: number | null;
    favorites: number | null;
    synopsis: string | null;
    background: string | null;
    authors: MangaAuthor[];
    serializations: MangaSerialization[];
    genres: MangaGenre[];
    explicit_genres: MangaGenre[];
    themes: MangaGenre[];
    demographics: MangaGenre[];
    relations: MangaRelation[];
    external: { name: string; url: string }[] | null;
}

export interface MangaFullResponse {
    data: MangaFull;
}

export interface MangaCharactersResponse {
    data: MangaCharacter[];
}

export interface MangaScoreEntry {
    score: number;
    votes: number;
    percentage: number;
}

export interface MangaStatistics {
    reading: number;
    completed: number;
    on_hold: number;
    dropped: number;
    plan_to_read: number;
    total: number;
    scores: MangaScoreEntry[];
}

export interface MangaStatisticsResponse {
    data: MangaStatistics;
}

export interface MangaRecommendationEntry {
    mal_id: number;
    url: string;
    images: MangaImage;
    title: string;
}

export interface MangaRecommendation {
    entry: MangaRecommendationEntry;
    url: string;
    votes: number;
}

export interface MangaRecommendationsResponse {
    data: MangaRecommendation[];
}
