export type WatchStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

export type SortType = "added" | "name" | "rating" | "rating (personal)";

export interface AnimePicture {
    jpg?: {
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

export interface StreamingLink {
    name: string;
    url: string;
}

export interface Anime {
    mal_id: number;
    title: string;
    title_english?: string;
    title_japanese?: string;
    title_synonyms?: string[];
    images?: AnimePicture;
    titles?: Title[];
    synopsis?: string;
    background?: string;
    score?: number;
    rank?: number;
    popularity?: number;
    members?: number;
    scored_by?: number;
    episodes?: number;
    status?: string;
    rating?: string;
    source?: string;
    type?: string;
    aired?: Aired;
    genres?: Omit<GenericMalReference, "type" | "url">[];
    studios?: Omit<GenericMalReference, "type" | "url">[];
    demographics?: GenericMalReference[];
    relations?: AnimeRelation[];
    duration?: string;
    trailer?: {
        youtube_id?: string | null;
        url?: string | null;
        embed_url?: string | null;
    };
    theme?: {
        openings?: string[];
        endings?: string[];
    };
    favorites?: number;
    season?: string;
    year?: number;
    streaming?: StreamingLink[] | null;
}

interface GenericMalReference {
    mal_id: number;
    type: string;
    name: string;
    url: string;
}

export interface AnimeRelation {
    relation: string;
    entry: GenericMalReference[];
}

interface Title {
    type: string;
    title: string;
}

interface Aired {
    from?: string;
    to?: string;
    prop?: Prop;
    string?: string;
}

interface Prop {
    from: From;
    to: From;
}

interface From {
    day: number;
    month: number;
    year: number;
}

export interface PicturesResponse {
    data: AnimePicture[];
}

export interface AnimeRecommendation {
    entry: {
        mal_id: number;
        url: string;
        images: AnimePicture;
        title: string;
    };
    votes: number;
}

export interface RecommendationsResponse {
    data: AnimeRecommendation[];
}

export interface AnimeEpisode {
    mal_id: number;
    url?: string;
    title: string;
    title_japanese?: string;
    title_romanji?: string;
    aired?: string;
    score?: number;
    filler?: boolean;
    recap?: boolean;
    forum_url?: string;
}

export interface EpisodesResponse {
    pagination?: {
        last_visible_page: number;
        has_next_page: boolean;
        items?: {
            count: number;
            total: number;
            per_page: number;
        };
    };
    data: AnimeEpisode[];
}

export interface AnimeEpisodeDetail {
    mal_id: number;
    url?: string;
    title: string;
    title_japanese?: string;
    title_romanji?: string;
    duration?: number;
    aired?: string;
    filler?: boolean;
    recap?: boolean;
    synopsis?: string;
}

export interface EpisodeDetailResponse {
    data: AnimeEpisodeDetail;
}

export interface AnimeCharacter {
    character: {
        mal_id: number;
        url: string;
        images: {
            jpg: {
                image_url: string;
            };
            webp?: {
                image_url: string;
                small_image_url: string;
            };
        };
        name: string;
    };
    role: "Main" | "Supporting";
    favorites: number;
    voice_actors: VoiceActor[];
}

export interface VoiceActor {
    person: {
        mal_id: number;
        url: string;
        images: {
            jpg: {
                image_url: string;
            };
        };
        name: string;
    };
    language: string;
}

export interface CharactersResponse {
    data: AnimeCharacter[];
}

export interface AnimeStatistics {
    watching: number;
    completed: number;
    on_hold: number;
    dropped: number;
    plan_to_watch: number;
    total: number;
    scores: ScoreEntry[];
}

export interface ScoreEntry {
    score: number;
    votes: number;
    percentage: number;
}

export interface StatisticsResponse {
    data: AnimeStatistics;
}

export interface TopReview {
    mal_id: number;
    url: string;
    type: string;
    reactions: {
        overall: number;
        nice: number;
        love_it: number;
        funny: number;
        confusing: number;
        informative: number;
        well_written: number;
        creative: number;
    };
    date: string;
    review: string;
    score: number;
    tags: string[];
    is_spoiler: boolean;
    is_preliminary: boolean;
    entry: {
        mal_id: number;
        url: string;
        images: AnimePicture;
        title: string;
    };
    user: {
        url: string;
        username: string;
        images?: {
            jpg: { image_url: string };
            webp: { image_url: string };
        };
    };
}

export interface TopReviewWithAnime extends Omit<TopReview, "entry"> {
    anime: Anime | null;
    entry: TopReview["entry"];
}

export interface TopReviewsResponse {
    pagination: {
        last_visible_page: number;
        has_next_page: boolean;
    };
    data: TopReview[];
}

export interface WatchedAnime {
    animeId: number;
    status: WatchStatus;
    episodesWatched: number;
    rating?: number;
    notes?: string | null;
    dateAdded: string;
    dateUpdated: string;
}

export interface AnimeWithWatchStatus extends Anime {
    watchData?: WatchedAnime;
}

export const watchStatusLabels: Record<WatchStatus, string> = {
    watching: "Watching",
    completed: "Completed",
    plan_to_watch: "Plan to Watch",
    on_hold: "On Hold",
    dropped: "Dropped",
};

export const watchStatusColors: Record<WatchStatus, string> = {
    watching: "var(--status-watching)",
    completed: "var(--status-completed)",
    plan_to_watch: "var(--status-plan)",
    on_hold: "var(--status-hold)",
    dropped: "var(--status-dropped)",
};

export interface IdList {
    ids: number[];
}

export interface MangaIdList {
    sfw: number[];
    nsfw: number[];
}
