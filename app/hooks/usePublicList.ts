"use client";

import { useCallback } from "react";
import { Anime, WatchStatus } from "@/types/anime";
import { useLoading } from "@/contexts/LoadingContext";

interface ApiWatchedItem {
    anime_id: number;
    status: WatchStatus;
    rating: number | null;
    notes: string | null;
    date_added: string;
}

export interface PublicListItem {
    animeId: number;
    status: WatchStatus;
    rating: number | null;
    notes: string | null;
    dateAdded: string;
}

export interface PublicListData {
    username: string;
    items: PublicListItem[];
    animeData: Map<number, Anime>;
}

export function usePublicList() {
    const { withLoading } = useLoading();

    const fetchPublicList = useCallback(
        async (uuid: string): Promise<PublicListData | { error: string }> => {
            return withLoading(async () => {
                const response = await fetch(`/api/list/${uuid}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        return { error: "List not found" };
                    }
                    return { error: "Failed to load list" };
                }

                const data = await response.json();

                const items: PublicListItem[] = data.items.map((item: ApiWatchedItem) => ({
                    animeId: item.anime_id,
                    status: item.status,
                    rating: item.rating,
                    notes: item.notes,
                    dateAdded: item.date_added,
                }));

                const animeData = new Map<number, Anime>(
                    Object.entries(data.animeData || {}).map(([id, anime]) => [Number(id), anime as Anime]),
                );

                return {
                    username: data.username,
                    items,
                    animeData,
                };
            });
        },
        [withLoading],
    );

    return { fetchPublicList };
}
