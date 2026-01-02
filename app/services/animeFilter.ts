import Fuse, { IFuseOptions } from "fuse.js";
import { Anime, WatchStatus } from "@/types/anime";

export type BrowseSortType = "rating" | "newest";
export type ListSortType = "added" | "name" | "rating" | "rating_personal";
export type UnifiedSortType = BrowseSortType | ListSortType;

export interface WatchData {
    status?: WatchStatus;
    rating?: number | null;
    dateAdded?: string;
}

export interface FilterableItem<T extends Anime = Anime> {
    anime: T;
    watchData?: WatchData;
}

export type SearchStrategy = "fuzzy" | "simple";

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

const FUSE_OPTIONS: IFuseOptions<FilterableItem> = {
    keys: [
        { name: "anime.title", weight: 0.4 },
        { name: "anime.alternative_titles.en", weight: 0.3 },
        { name: "anime.alternative_titles.ja", weight: 0.2 },
        { name: "anime.genres.name", weight: 0.1 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 2,
};

let cachedFuseIndex: Fuse<FilterableItem> | null = null;

export function initializeFuseIndex(items: FilterableItem[]): void {
    cachedFuseIndex = new Fuse(items, FUSE_OPTIONS);
    console.log(`[AnimeFilter] Built Fuse index with ${items.length} entries`);
}

export function clearFuseIndex(): void {
    cachedFuseIndex = null;
}

export function hasFuseIndex(): boolean {
    return cachedFuseIndex !== null;
}

export function fuzzySearchOne(query: string): Anime | null {
    if (!cachedFuseIndex) {
        return null;
    }
    const results = cachedFuseIndex.search(query, { limit: 1 });
    if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.35) {
        return results[0].item.anime;
    }
    return null;
}

function getSortComparator<T extends Anime>(
    sort: UnifiedSortType,
    direction: "asc" | "desc",
): (a: FilterableItem<T>, b: FilterableItem<T>) => number {
    const multiplier = direction === "desc" ? 1 : -1;

    switch (sort) {
        case "rating":
            return (a, b) => multiplier * ((b.anime.mean ?? 0) - (a.anime.mean ?? 0));

        case "newest":
            return (a, b) => multiplier * (b.anime.start_date ?? "").localeCompare(a.anime.start_date ?? "");

        case "added":
            return (a, b) =>
                multiplier *
                (new Date(b.watchData?.dateAdded ?? 0).getTime() - new Date(a.watchData?.dateAdded ?? 0).getTime());

        case "name":
            return (a, b) => (direction === "asc" ? 1 : -1) * a.anime.title.localeCompare(b.anime.title);

        case "rating_personal":
            return (a, b) => multiplier * ((b.watchData?.rating ?? 0) - (a.watchData?.rating ?? 0));

        default:
            return () => 0;
    }
}

function applyStatusFilter<T extends Anime>(
    items: FilterableItem<T>[],
    statusFilter: WatchStatus | "all",
): FilterableItem<T>[] {
    if (statusFilter === "all") {
        return items;
    }
    return items.filter(item => item.watchData?.status === statusFilter);
}

function applyHideSpecials<T extends Anime>(items: FilterableItem<T>[]): FilterableItem<T>[] {
    return items.filter(item => item.anime.media_type !== "special");
}

function searchSimple<T extends Anime>(items: FilterableItem<T>[], query: string): FilterableItem<T>[] {
    const lowerQuery = query.toLowerCase();
    return items.filter(item => {
        const title = item.anime.title.toLowerCase();
        const enTitle = item.anime.alternative_titles?.en?.toLowerCase() || "";
        const jaTitle = item.anime.alternative_titles?.ja?.toLowerCase() || "";
        return title.includes(lowerQuery) || enTitle.includes(lowerQuery) || jaTitle.includes(lowerQuery);
    });
}

function searchFuzzy<T extends Anime>(items: FilterableItem<T>[], query: string): FilterableItem<T>[] {
    if (cachedFuseIndex) {
        const results = cachedFuseIndex.search(query);
        const itemsById = new Map(items.map(item => [item.anime.id, item]));
        const matched: FilterableItem<T>[] = [];
        for (const result of results) {
            const item = itemsById.get(result.item.anime.id);
            if (item) {
                matched.push(item);
            }
        }
        return matched;
    }
    const fuse = new Fuse(items, FUSE_OPTIONS as IFuseOptions<FilterableItem<T>>);
    const results = fuse.search(query);
    return results.map(result => result.item);
}

function searchItems<T extends Anime>(
    items: FilterableItem<T>[],
    query: string,
    strategy: SearchStrategy = "fuzzy",
): FilterableItem<T>[] {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        return items;
    }

    if (strategy === "simple") {
        return searchSimple(items, trimmedQuery);
    }
    return searchFuzzy(items, trimmedQuery);
}

export function filterAnime<T extends Anime = Anime>(
    items: FilterableItem<T>[],
    options: AnimeFilterOptions,
): AnimeFilterResult<T> {
    const {
        query,
        searchStrategy = "fuzzy",
        sort = "rating",
        sortDirection = "desc",
        hideSpecials = false,
        statusFilter,
        limit,
        offset = 0,
    } = options;

    const total = items.length;
    let result = [...items];

    if (statusFilter && statusFilter !== "all") {
        result = applyStatusFilter(result, statusFilter);
    }

    if (hideSpecials) {
        result = applyHideSpecials(result);
    }

    if (query) {
        result = searchItems(result, query, searchStrategy);
    }

    const comparator = getSortComparator<T>(sort, sortDirection);
    result.sort(comparator);

    const filtered = result.length;

    if (limit !== undefined) {
        result = result.slice(offset, offset + limit);
    } else if (offset > 0) {
        result = result.slice(offset);
    }

    return {
        items: result,
        total,
        filtered,
    };
}

export function toFilterableItems<T extends Anime = Anime>(anime: T[]): FilterableItem<T>[] {
    return anime.map(a => ({ anime: a }));
}

interface WatchedItemInput {
    animeId: number;
    status?: WatchStatus;
    rating?: number | null;
    dateAdded?: string;
}

export function toFilterableItemsFromWatchList(
    watchedItems: WatchedItemInput[],
    animeData: Map<number, Anime>,
): FilterableItem[] {
    const result: FilterableItem[] = [];

    for (const watched of watchedItems) {
        const anime = animeData.get(watched.animeId);
        if (anime) {
            result.push({
                anime,
                watchData: {
                    status: watched.status,
                    rating: watched.rating ?? undefined,
                    dateAdded: watched.dateAdded,
                },
            });
        }
    }

    return result;
}
