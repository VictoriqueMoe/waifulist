import { NextRequest, NextResponse } from "next/server";
import { getAllWatched, getUserByPublicId } from "@/lib/db";
import { WatchStatus } from "@/types/anime";
import { getAnimeFromRedisByIds } from "@/services/animeData";
import { filterAnime, toFilterableItemsFromWatchList, UnifiedSortType } from "@/services/animeFilter";

const PAGE_SIZE = 24;

export async function GET(request: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
    const { uuid } = await params;

    const user = getUserByPublicId(uuid);
    if (!user) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || undefined;
    const sort = (searchParams.get("sort") as UnifiedSortType) || "added";
    const status = searchParams.get("status") as WatchStatus | "all" | null;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10);

    const items = getAllWatched(user.id);
    const animeIds = items.map(item => item.anime_id);
    const animeMap = await getAnimeFromRedisByIds(animeIds);

    const watchedItems = items.map(item => ({
        animeId: item.anime_id,
        status: item.status as WatchStatus,
        rating: item.rating ?? undefined,
        notes: item.notes,
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

    return NextResponse.json({
        username: user.username,
        items: resultItems,
        total: filterResult.total,
        filtered: filterResult.filtered,
        page,
        totalPages: Math.ceil(filterResult.filtered / limit),
        counts,
    });
}
