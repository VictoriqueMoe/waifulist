"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WatchStatus } from "@/types/anime";
import { UnifiedSortType, WatchListResponse } from "@/types/filter";
import { fetchFilteredList } from "@/services/filterClientService";

interface FilteredItem {
    anime: WatchListResponse["items"][0]["anime"];
    watchData: WatchListResponse["items"][0]["watchData"];
}

interface UseFilteredListOptions {
    apiEndpoint: string;
    searchQuery: string;
    sort: UnifiedSortType;
    status: WatchStatus | "all";
    page: number;
    genres: string[];
    onAvailableGenresChange?: (genres: string[]) => void;
}

export function useFilteredList(options: UseFilteredListOptions) {
    const { apiEndpoint, searchQuery, sort, status, page, genres, onAvailableGenresChange } = options;

    const [items, setItems] = useState<FilteredItem[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({ all: 0 });
    const [filtered, setFiltered] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(true);

    const onAvailableGenresChangeRef = useRef(onAvailableGenresChange);
    onAvailableGenresChangeRef.current = onAvailableGenresChange;

    const genresKey = genres.join(",");

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const genresList = genresKey ? genresKey.split(",") : [];
            const data: WatchListResponse = await fetchFilteredList(apiEndpoint, {
                query: searchQuery.trim() || undefined,
                sort,
                status,
                page,
                genres: genresList,
            });
            setItems(data.items);
            setCounts(data.counts);
            setFiltered(data.filtered);
            setTotalPages(data.totalPages);
            if (data.availableGenres) {
                onAvailableGenresChangeRef.current?.(data.availableGenres);
            }
        } catch (error) {
            console.error("Failed to fetch list:", error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [apiEndpoint, searchQuery, sort, status, page, genresKey]);

    useEffect(() => {
        reload();
    }, [reload]);

    return { items, counts, filtered, totalPages, loading, reload };
}
