import { WatchedAnime, WatchStatus } from "@/types/anime";

export type ImportEntry = {
    animeId: number;
    status: WatchStatus;
    episodesWatched: number;
    rating: number | null;
    notes: string | null;
};

interface WatchlistItem {
    anime_id: number;
    status: string;
    episodes_watched: number;
    rating: number | null;
    notes: string | null;
    date_added: string;
    date_updated: string;
}

function toWatchedAnime(item: WatchlistItem): WatchedAnime {
    return {
        animeId: item.anime_id,
        status: item.status as WatchStatus,
        episodesWatched: item.episodes_watched,
        rating: item.rating ?? undefined,
        notes: item.notes ?? undefined,
        dateAdded: item.date_added,
        dateUpdated: item.date_updated,
    };
}

export async function fetchWatchlist(): Promise<Map<number, WatchedAnime>> {
    const response = await fetch("/api/watchlist");
    if (!response.ok) {
        throw new Error("Failed to fetch watchlist");
    }

    const data = await response.json();
    const map = new Map<number, WatchedAnime>();
    for (const item of data.items) {
        map.set(item.anime_id, toWatchedAnime(item));
    }
    return map;
}

export async function addToWatchlistApi(animeId: number, status: WatchStatus): Promise<WatchedAnime> {
    const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId, status }),
    });

    if (!response.ok) {
        throw new Error("Failed to add to watchlist");
    }

    const data = await response.json();
    return toWatchedAnime(data.item);
}

export async function bulkAddToWatchlistApi(animeIds: number[], status: WatchStatus): Promise<number> {
    const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeIds, status }),
    });

    if (!response.ok) {
        throw new Error("Failed to bulk add to watchlist");
    }

    const data = await response.json();
    return data.added;
}

export async function bulkImportToWatchlistApi(entries: ImportEntry[]): Promise<number> {
    const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importEntries: entries }),
    });

    if (!response.ok) {
        throw new Error("Failed to bulk import to watchlist");
    }

    const data = await response.json();
    return data.added;
}

export async function updateWatchlistItemApi(
    animeId: number,
    updates: Partial<WatchedAnime>,
): Promise<WatchedAnime | null> {
    const response = await fetch(`/api/watchlist/${animeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            status: updates.status,
            episodesWatched: updates.episodesWatched,
            rating: updates.rating,
            notes: updates.notes,
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to update watchlist item");
    }

    const data = await response.json();
    return data.item ? toWatchedAnime(data.item) : null;
}

export async function removeFromWatchlistApi(animeId: number): Promise<void> {
    const response = await fetch(`/api/watchlist/${animeId}`, {
        method: "DELETE",
    });

    if (!response.ok) {
        throw new Error("Failed to remove from watchlist");
    }
}
