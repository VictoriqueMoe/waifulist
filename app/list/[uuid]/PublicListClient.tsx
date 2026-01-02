"use client";

import React, { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SortType } from "@/types/anime";
import { AnimeListView } from "@/components/AnimeListView/AnimeListView";
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

    const urlSort = searchParams.get("sort");
    const initialSort = isValidSort(urlSort) ? urlSort : getStoredSort();

    const [username] = useState<string>(initialUsername);
    const [sort, setSort] = useState<SortType>(initialSort);

    const handleSortChange = useCallback((newSort: SortType) => {
        setSort(newSort);
        LocalStorage.setString(STORAGE_KEYS.PUBLIC_LIST_SORT, newSort);

        const url = new URL(window.location.href);
        url.searchParams.set("sort", newSort);
        window.history.replaceState({}, "", url.toString());
    }, []);

    return (
        <AnimeListView
            title={`${username}'s Anime List`}
            subtitle={`${username}'s anime collection`}
            apiEndpoint={`/api/list/${uuid}`}
            showStatusBadge={false}
            initialSort={sort}
            onSortChange={handleSortChange}
            ratingLabel={`${username}'s rating`}
        />
    );
}
