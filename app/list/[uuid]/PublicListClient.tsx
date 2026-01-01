"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Anime, SortType } from "@/types/anime";
import { PublicListItem, usePublicList } from "@/hooks";
import { AnimeListView, WatchedItem } from "@/components/AnimeListView/AnimeListView";
import { LocalStorage, STORAGE_KEYS } from "@/constants/localStorage";

const VALID_SORTS: SortType[] = ["added", "name", "rating", "rating (personal)"];

function isValidSort(value: string | null): value is SortType {
    return value !== null && VALID_SORTS.includes(value as SortType);
}

function getStoredSort(): SortType {
    const stored = LocalStorage.getString(STORAGE_KEYS.PUBLIC_LIST_SORT);
    if (isValidSort(stored)) {
        return stored;
    }
    return "added";
}

interface PublicListClientProps {
    uuid: string;
    initialUsername: string;
}

export function PublicListClient({ uuid, initialUsername }: PublicListClientProps) {
    const searchParams = useSearchParams();
    const { fetchPublicList } = usePublicList();

    const urlSort = searchParams.get("sort");
    const initialSort = isValidSort(urlSort) ? urlSort : getStoredSort();

    const [username] = useState<string>(initialUsername);
    const [watchedItems, setWatchedItems] = useState<WatchedItem[]>([]);
    const [animeData, setAnimeData] = useState<Map<number, Anime>>(new Map());
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState<SortType>(initialSort);

    const handleSortChange = useCallback((newSort: SortType) => {
        setSort(newSort);
        LocalStorage.setString(STORAGE_KEYS.PUBLIC_LIST_SORT, newSort);

        // Update URL with new sort parameter
        const url = new URL(window.location.href);
        url.searchParams.set("sort", newSort);
        window.history.replaceState({}, "", url.toString());
    }, []);

    useEffect(() => {
        fetchPublicList(uuid).then(result => {
            if (!("error" in result)) {
                setWatchedItems(
                    result.items.map((item: PublicListItem) => ({
                        animeId: item.animeId,
                        status: item.status,
                        rating: item.rating,
                        notes: item.notes,
                        dateAdded: item.dateAdded,
                    })),
                );
                setAnimeData(result.animeData);
            }
            setLoading(false);
        });
    }, [uuid, fetchPublicList]);

    return (
        <AnimeListView
            title={`${username}'s Anime List`}
            subtitle={`${watchedItems.length} anime in this list`}
            watchedItems={watchedItems}
            animeData={animeData}
            loading={loading}
            showStatusBadge={false}
            initialSort={sort}
            onSortChange={handleSortChange}
            ratingLabel={`${username}'s rating`}
        />
    );
}
