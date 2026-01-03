import { Anime, WatchStatus } from "./anime";

export type BrowseSortType = "rating" | "newest";
type ListSortType = "added" | "name" | "rating" | "rating_personal";
export type UnifiedSortType = BrowseSortType | ListSortType;

export type SearchStrategy = "fuzzy" | "simple";

type WatchData = {
    status?: WatchStatus;
    rating?: number | null;
    dateAdded?: string;
    notes?: string | null;
};

export type FilterableItem<T extends Anime = Anime> = {
    anime: T;
    watchData?: WatchData;
};

export interface AnimeFilterOptions {
    query?: string;
    searchStrategy?: SearchStrategy;
    sort?: UnifiedSortType;
    sortDirection?: "asc" | "desc";
    hideSpecials?: boolean;
    statusFilter?: WatchStatus | "all";
    limit?: number;
    offset?: number;
}

export interface AnimeFilterResult<T extends Anime = Anime> {
    items: FilterableItem<T>[];
    total: number;
    filtered: number;
}

export type WatchedItemInput = {
    animeId: number;
    status?: WatchStatus;
    rating?: number | null;
    dateAdded?: string;
    notes?: string | null;
};

export type WatchListQueryParams = {
    query?: string;
    sort: UnifiedSortType;
    status: WatchStatus | "all";
    page: number;
    limit: number;
};

export type WatchListResponse = {
    items: {
        anime: Anime;
        watchData: {
            status?: WatchStatus;
            rating: number | null;
            dateAdded?: string;
        };
    }[];
    total: number;
    filtered: number;
    page: number;
    totalPages: number;
    counts: Record<string, number>;
};
