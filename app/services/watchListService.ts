import { Anime, WatchStatus } from "@/types/anime";
import {
    FilterableItem,
    UnifiedSortType,
    WatchedItemInput,
    WatchListQueryParams,
    WatchListResponse,
} from "@/types/filter";
import { getAllWatched } from "@/lib/db";
import { getAnimeFromRedisByIds } from "@/services/animeData";
import { filterAnime } from "@/services/animeFilter";

const PAGE_SIZE = 24;

export async function getFilteredWatchList(userId: number, url: URL): Promise<WatchListResponse> {
    const { searchParams } = url;
    const query = searchParams.get("q") || undefined;
    const sort = (searchParams.get("sort") as UnifiedSortType) || "added";
    const status = (searchParams.get("status") as WatchStatus | "all") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10);

    const items = getAllWatched(userId);
    const animeIds = items.map(item => item.anime_id);
    const animeMap = await getAnimeFromRedisByIds(animeIds);

    const watchedItems: WatchedItemInput[] = items.map(item => ({
        animeId: item.anime_id,
        status: item.status as WatchStatus,
        rating: item.rating ?? undefined,
        dateAdded: item.date_added,
        notes: item.notes,
    }));

    return filterWatchList(watchedItems, animeMap, { query, sort, status, page, limit });
}

function filterWatchList(
    watchedItems: WatchedItemInput[],
    animeMap: Map<number, Anime>,
    params: WatchListQueryParams,
): WatchListResponse {
    const { query, sort, status, page, limit } = params;

    const filterableItems = toFilterableItemsFromWatchList(watchedItems, animeMap);
    const filterResult = filterAnime(filterableItems, {
        query,
        searchStrategy: "simple",
        sort,
        sortDirection: sort === "name" ? "asc" : "desc",
        statusFilter: status,
        limit,
        offset: (page - 1) * limit,
    });

    const items = filterResult.items.map(item => ({
        anime: item.anime,
        watchData: {
            status: item.watchData?.status,
            rating: item.watchData?.rating ?? null,
            dateAdded: item.watchData?.dateAdded,
            notes: item.watchData?.notes,
        },
    }));

    const counts: Record<string, number> = { all: filterableItems.length };
    for (const item of filterableItems) {
        const s = item.watchData?.status;
        if (s) {
            counts[s] = (counts[s] || 0) + 1;
        }
    }

    return {
        items,
        total: filterResult.total,
        filtered: filterResult.filtered,
        page,
        totalPages: Math.ceil(filterResult.filtered / limit),
        counts,
    };
}

function toFilterableItemsFromWatchList(
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
                    notes: watched.notes,
                },
            });
        }
    }
    return result;
}
