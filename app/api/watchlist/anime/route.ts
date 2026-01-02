import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllWatched } from "@/lib/db";
import { WatchStatus } from "@/types/anime";
import { getAnimeFromRedisByIds } from "@/services/animeData";
import { filterAnime, toFilterableItemsFromWatchList, UnifiedSortType } from "@/services/animeFilter";

const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
    const start = Date.now();

    const user = await getCurrentUser();
    const authTime = Date.now() - start;

    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || undefined;
    const sort = (searchParams.get("sort") as UnifiedSortType) || "added";
    const status = searchParams.get("status") as WatchStatus | "all" | null;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10);

    const dbStart = Date.now();
    const items = getAllWatched(user.id);
    const dbTime = Date.now() - dbStart;

    const animeIds = items.map(item => item.anime_id);

    const redisStart = Date.now();
    const animeMap = await getAnimeFromRedisByIds(animeIds);
    const redisTime = Date.now() - redisStart;

    const filterStart = Date.now();
    const watchedItems = items.map(item => ({
        animeId: item.anime_id,
        status: item.status as WatchStatus,
        rating: item.rating ?? undefined,
        dateAdded: item.date_added,
    }));

    const filterableItems = toFilterableItemsFromWatchList(watchedItems, animeMap);
    const filterResult = filterAnime(filterableItems, {
        query,
        searchStrategy: "simple",
        sort,
        sortDirection: sort === "name" ? "asc" : "desc",
        statusFilter: status || "all",
        limit,
        offset: (page - 1) * limit,
    });
    const filterTime = Date.now() - filterStart;

    const resultItems = filterResult.items.map(item => ({
        anime: item.anime,
        watchData: {
            status: item.watchData?.status,
            rating: item.watchData?.rating ?? null,
            dateAdded: item.watchData?.dateAdded,
        },
    }));

    const counts: Record<string, number> = { all: filterableItems.length };
    for (const item of filterableItems) {
        const s = item.watchData?.status;
        if (s) {
            counts[s] = (counts[s] || 0) + 1;
        }
    }

    const totalTime = Date.now() - start;
    console.log(
        `[/api/watchlist/anime] auth=${authTime}ms db=${dbTime}ms redis=${redisTime}ms filter=${filterTime}ms total=${totalTime}ms (${animeIds.length} items)`,
    );

    return NextResponse.json({
        items: resultItems,
        total: filterResult.total,
        filtered: filterResult.filtered,
        page,
        totalPages: Math.ceil(filterResult.filtered / limit),
        counts,
    });
}
