export type WatchStatus = "watching" | "completed" | "plan_to_watch" | "on_hold" | "dropped";

export type SortType = "added" | "name" | "rating" | "rating (personal)";

export interface Anime {
    id: number;
    title: string;
    main_picture?: {
        medium: string;
        large: string;
    };
    alternative_titles?: {
        synonyms?: string[];
        en?: string;
        ja?: string;
    };
    start_date?: string;
    end_date?: string;
    synopsis?: string;
    mean?: number;
    rank?: number;
    popularity?: number;
    num_list_users?: number;
    num_scoring_users?: number;
    status?: string;
    genres?: { id: number; name: string }[];
    num_episodes?: number;
    source?: string;
    studios?: { id: number; name: string }[];
    rating?: string;
    media_type?: string;
}

export interface WatchedAnime {
    animeId: number;
    status: WatchStatus;
    episodesWatched: number;
    rating?: number;
    notes?: string;
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
