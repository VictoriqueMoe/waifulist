"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Anime } from "@/types/anime";
import { BrowseSortType, useAnime } from "@/hooks";
import { useLoading } from "@/contexts/LoadingContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useWatchList } from "@/contexts/WatchListContext";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { AnimeCard } from "@/components/AnimeCard/AnimeCard";
import { Pagination } from "@/components/Pagination/Pagination";
import styles from "./page.module.scss";

const PAGE_SIZE = 24;

function BrowseContent() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";
    const initialPage = parseInt(searchParams.get("page") || "1", 10);

    const { searchAnimeSilent, browseAnimeSilent } = useAnime();
    const { isLoading } = useLoading();
    const { settings, loading: settingsLoading, updateBrowseSettings } = useSettings();
    const { ensureLoaded } = useWatchList();

    useEffect(() => {
        ensureLoaded();
    }, [ensureLoaded]);

    const [anime, setAnime] = useState<Anime[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState(initialQuery);
    const [page, setPage] = useState(initialPage);
    const [totalCount, setTotalCount] = useState(0);
    const searchIdRef = useRef(0);
    const lastFetchedSettingsRef = useRef<string | null>(null);

    const { sort, hideSpecials } = settings.browse;

    const isSearching = query.trim().length > 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const performSearch = useCallback(
        async (
            searchQuery: string,
            pageNum: number = 1,
            sortBy: BrowseSortType = "rating",
            filterSpecials: boolean = false,
        ) => {
            const searchId = ++searchIdRef.current;
            setLoading(true);

            try {
                if (searchQuery.trim()) {
                    const results = await searchAnimeSilent(searchQuery, 20, filterSpecials);
                    if (searchId === searchIdRef.current) {
                        setAnime(results);
                        setTotalCount(results.length);
                        setLoading(false);
                    }
                } else {
                    const offset = (pageNum - 1) * PAGE_SIZE;
                    const result = await browseAnimeSilent(PAGE_SIZE, offset, sortBy, filterSpecials);
                    if (searchId === searchIdRef.current) {
                        setAnime(result.anime);
                        setTotalCount(result.total);
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error("Search failed:", error);
                if (searchId === searchIdRef.current) {
                    setLoading(false);
                }
            }
        },
        [searchAnimeSilent, browseAnimeSilent],
    );

    useEffect(() => {
        if (settingsLoading) {
            return;
        }
        const settingsKey = `${settings.browse.sort}-${settings.browse.hideSpecials}`;
        if (lastFetchedSettingsRef.current === settingsKey) {
            return;
        }
        lastFetchedSettingsRef.current = settingsKey;
        performSearch(initialQuery, initialPage, settings.browse.sort, settings.browse.hideSpecials);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settingsLoading, settings.browse.sort, settings.browse.hideSpecials]);

    const handleLiveSearch = useCallback(
        (newQuery: string) => {
            setQuery(newQuery);
            setPage(1);
            performSearch(newQuery, 1, sort, hideSpecials);

            const url = new URL(window.location.href);
            if (newQuery) {
                url.searchParams.set("q", newQuery);
            } else {
                url.searchParams.delete("q");
            }
            url.searchParams.delete("page");
            window.history.replaceState({}, "", url);
        },
        [performSearch, sort, hideSpecials],
    );

    const handlePageChange = useCallback(
        (newPage: number) => {
            setPage(newPage);
            performSearch(query, newPage, sort, hideSpecials);
            window.scrollTo({ top: 0, behavior: "smooth" });

            const url = new URL(window.location.href);
            if (newPage > 1) {
                url.searchParams.set("page", String(newPage));
            } else {
                url.searchParams.delete("page");
            }
            window.history.replaceState({}, "", url);
        },
        [performSearch, query, sort, hideSpecials],
    );

    const handleSortChange = useCallback(
        (newSort: BrowseSortType) => {
            lastFetchedSettingsRef.current = `${newSort}-${hideSpecials}`;
            updateBrowseSettings({ sort: newSort });
            setPage(1);
            performSearch(query, 1, newSort, hideSpecials);
        },
        [performSearch, query, hideSpecials, updateBrowseSettings],
    );

    const handleHideSpecialsChange = useCallback(
        (checked: boolean) => {
            lastFetchedSettingsRef.current = `${sort}-${checked}`;
            updateBrowseSettings({ hideSpecials: checked });
            setPage(1);
            performSearch(query, 1, sort, checked);
        },
        [performSearch, query, sort, updateBrowseSettings],
    );

    const showLoading = (loading || settingsLoading) && !isLoading;

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>Browse Anime</h1>
                    <p className={styles.subtitle}>
                        {query ? `Search results for "${query}"` : "Discover top rated anime"}
                    </p>
                </div>

                <div className={styles.controls}>
                    <div className={styles.searchWrapper}>
                        <SearchBar
                            initialValue={query}
                            onLiveSearch={handleLiveSearch}
                            placeholder="Search anime by title..."
                            debounceMs={250}
                        />
                    </div>
                    <div className={styles.filterWrapper}>
                        <label className={styles.checkbox}>
                            <input
                                type="checkbox"
                                checked={hideSpecials}
                                onChange={e => handleHideSpecialsChange(e.target.checked)}
                            />
                            <span>Hide Specials</span>
                        </label>
                    </div>
                    {!isSearching && (
                        <div className={styles.sortWrapper}>
                            <label htmlFor="sort-select">Sort by:</label>
                            <select
                                id="sort-select"
                                value={sort}
                                onChange={e => handleSortChange(e.target.value as BrowseSortType)}
                                className={styles.sortSelect}
                            >
                                <option value="rating">Top Rated</option>
                                <option value="newest">Newest</option>
                            </select>
                        </div>
                    )}
                </div>

                {showLoading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <p>Searching...</p>
                    </div>
                ) : anime.length > 0 ? (
                    <>
                        <div className={styles.grid}>
                            {anime.map(item => (
                                <AnimeCard key={item.id} anime={item} />
                            ))}
                        </div>

                        {!isSearching && (
                            <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
                        )}
                    </>
                ) : (
                    <div className={styles.empty}>
                        <i className="bi bi-search" />
                        <h3>No results found</h3>
                        <p>Try searching with different keywords</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function BrowsePage() {
    return (
        <Suspense
            fallback={
                <div className={styles.page}>
                    <div className={styles.container}>
                        <div className={styles.loading}>
                            <div className={styles.spinner} />
                            <p>Loading...</p>
                        </div>
                    </div>
                </div>
            }
        >
            <BrowseContent />
        </Suspense>
    );
}
