import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AniListCharacter } from "@/types/anilist";

export interface AnimeFilter {
    malId: number;
    title: string;
}

interface UseCharacterSearchReturn {
    query: string;
    setQuery: (query: string) => void;
    results: AniListCharacter[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    loadMore: () => void;
    search: (query: string) => void;
    clear: () => void;
    animeFilter: AnimeFilter | null;
    setAnimeFilter: (filter: AnimeFilter | null) => void;
}

export function useCharacterSearch(debounceMs: number = 300): UseCharacterSearchReturn {
    const [query, setQuery] = useState("");
    const [allResults, setAllResults] = useState<AniListCharacter[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [animeFilter, setAnimeFilterState] = useState<AnimeFilter | null>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const currentQuery = useRef("");

    const filteredResults = useMemo(() => {
        if (!animeFilter || query.length < 2) {
            return allResults;
        }
        const lowerQuery = query.toLowerCase();
        return allResults.filter(
            char =>
                char.name.full.toLowerCase().includes(lowerQuery) ||
                (char.name.native && char.name.native.toLowerCase().includes(lowerQuery)),
        );
    }, [allResults, query, animeFilter]);

    const fetchCharacters = useCallback(
        async (searchQuery: string, pageNum: number, append: boolean = false) => {
            if (!animeFilter && searchQuery.length < 2) {
                setAllResults([]);
                setHasMore(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                let url: string;
                if (animeFilter) {
                    url = `/api/characters/by-anime/${animeFilter.malId}?page=${pageNum}&perPage=20`;
                } else {
                    url = `/api/characters/search?q=${encodeURIComponent(searchQuery)}&page=${pageNum}&perPage=20`;
                }

                const response = await fetch(url);

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || "Failed to fetch characters");
                }

                const data = await response.json();

                if (append) {
                    setAllResults(prev => [...prev, ...data.characters]);
                } else {
                    setAllResults(data.characters);
                }
                setHasMore(data.hasNextPage);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to fetch characters");
                if (!append) {
                    setAllResults([]);
                }
            } finally {
                setIsLoading(false);
            }
        },
        [animeFilter],
    );

    const search = useCallback(
        (searchQuery: string) => {
            currentQuery.current = searchQuery;
            setPage(1);
            fetchCharacters(searchQuery, 1, false);
        },
        [fetchCharacters],
    );

    const loadMore = useCallback(() => {
        if (!isLoading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchCharacters(currentQuery.current, nextPage, true);
        }
    }, [isLoading, hasMore, page, fetchCharacters]);

    const clear = useCallback(() => {
        setQuery("");
        setAllResults([]);
        setHasMore(false);
        setPage(1);
        currentQuery.current = "";
    }, []);

    const setAnimeFilter = useCallback((filter: AnimeFilter | null) => {
        setAnimeFilterState(filter);
        setAllResults([]);
        setHasMore(false);
        setPage(1);
        setQuery("");
        currentQuery.current = "";
    }, []);

    useEffect(() => {
        if (animeFilter) {
            fetchCharacters("", 1, false);
        }
    }, [animeFilter, fetchCharacters]);

    useEffect(() => {
        if (animeFilter) {
            return;
        }

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        if (query.length < 2) {
            setAllResults([]);
            setHasMore(false);
            return;
        }

        debounceTimer.current = setTimeout(() => {
            search(query);
        }, debounceMs);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [query, debounceMs, search, animeFilter]);

    return {
        query,
        setQuery,
        results: animeFilter ? filteredResults : allResults,
        isLoading,
        error,
        hasMore,
        loadMore,
        search,
        clear,
        animeFilter,
        setAnimeFilter,
    };
}
