import Fuse, { IFuseOptions } from "fuse.js";
import { Anime, WatchStatus } from "@/types/anime";
import { AnimeFilterOptions, AnimeFilterResult, FilterableItem, SearchStrategy, UnifiedSortType } from "@/types/filter";

export type { BrowseSortType, FilterableItem, UnifiedSortType } from "@/types/filter";

const FUSE_OPTIONS: IFuseOptions<FilterableItem> = {
    keys: [
        { name: "anime.title", weight: 0.4 },
        { name: "anime.title_english", weight: 0.3 },
        { name: "anime.title_japanese", weight: 0.2 },
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
    if (results.length > 0 && results[0].score !== undefined) {
        return results[0].item.anime;
    }
    return null;
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

    return { items: result, total, filtered };
}

export function toFilterableItems<T extends Anime = Anime>(anime: T[]): FilterableItem<T>[] {
    return anime.map(a => ({ anime: a }));
}

function searchItems<T extends Anime>(
    items: FilterableItem<T>[],
    query: string,
    strategy: SearchStrategy,
): FilterableItem<T>[] {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        return items;
    }
    return strategy === "simple" ? searchSimple(items, trimmedQuery) : searchFuzzy(items, trimmedQuery);
}

function getSortComparator<T extends Anime>(
    sort: UnifiedSortType,
    direction: "asc" | "desc",
): (a: FilterableItem<T>, b: FilterableItem<T>) => number {
    const multiplier = direction === "desc" ? 1 : -1;

    switch (sort) {
        case "rating":
            return (a, b) => multiplier * ((b.anime.score ?? 0) - (a.anime.score ?? 0));
        case "newest":
            return (a, b) => multiplier * (b.anime.aired?.from ?? "").localeCompare(a.anime.aired?.from ?? "");
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
    return items.filter(item => item.anime.type?.toLowerCase() !== "special");
}

function searchSimple<T extends Anime>(items: FilterableItem<T>[], query: string): FilterableItem<T>[] {
    const lowerQuery = query.toLowerCase();
    return items.filter(item => {
        const title = item.anime.title.toLowerCase();
        const enTitle = item.anime.title_english?.toLowerCase() || "";
        const jaTitle = item.anime.title_japanese?.toLowerCase() || "";
        return title.includes(lowerQuery) || enTitle.includes(lowerQuery) || jaTitle.includes(lowerQuery);
    });
}

function searchFuzzy<T extends Anime>(items: FilterableItem<T>[], query: string): FilterableItem<T>[] {
    if (cachedFuseIndex) {
        const results = cachedFuseIndex.search(query);
        const itemsById = new Map(items.map(item => [item.anime.mal_id, item]));
        const matched: FilterableItem<T>[] = [];
        for (const result of results) {
            const item = itemsById.get(result.item.anime.mal_id);
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
