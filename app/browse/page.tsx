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
import { ContextMenu, type ContextMenuItem } from "@/components/ContextMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/Spinner/Spinner";
import { GenreFilter } from "@/components/GenreFilter/GenreFilter";
import { PAGE_SIZE } from "@/constants/pagination";
import styles from "./page.module.scss";

function BrowseContent() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";
    const initialPage = parseInt(searchParams.get("page") || "1", 10);
    const initialGenres =
        searchParams
            .get("genres")
            ?.split(",")
            .filter(g => g.trim()) || [];

    const { searchAnimeSilent, browseAnimeSilent, getGenres } = useAnime();
    const { isLoading } = useLoading();
    const { settings, loading: settingsLoading, updateBrowseSettings } = useSettings();
    const { ensureLoaded, removeFromWatchList, addToWatchList, isInWatchList, getAllWatched, refreshList } =
        useWatchList();
    const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
    const { user } = useAuth();

    const [anime, setAnime] = useState<Anime[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState(initialQuery);
    const [page, setPage] = useState(initialPage);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedGenres, setSelectedGenres] = useState<string[]>(initialGenres);
    const [allGenres, setAllGenres] = useState<string[]>([]);
    const [genresLoading, setGenresLoading] = useState(true);
    const searchIdRef = useRef(0);
    const lastFetchedSettingsRef = useRef<string | null>(null);

    useEffect(() => {
        getAllWatched();
        ensureLoaded();
    }, [ensureLoaded, getAllWatched]);

    useEffect(() => {
        getGenres().then(genres => {
            setAllGenres(genres);
            setGenresLoading(false);
        });
    }, [getGenres]);

    const { sort, hideSpecials } = settings.browse;

    const isSearching = query.trim().length > 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const performSearch = useCallback(
        async (
            searchQuery: string,
            pageNum: number = 1,
            sortBy: BrowseSortType = "rating",
            filterSpecials: boolean = false,
            genres: string[] = [],
        ) => {
            const searchId = ++searchIdRef.current;
            setLoading(true);

            try {
                if (searchQuery.trim()) {
                    const results = await searchAnimeSilent(searchQuery, 20, filterSpecials, genres);
                    if (searchId === searchIdRef.current) {
                        setAnime(results);
                        setTotalCount(results.length);
                        setLoading(false);
                    }
                } else {
                    const offset = (pageNum - 1) * PAGE_SIZE;
                    const result = await browseAnimeSilent(PAGE_SIZE, offset, sortBy, filterSpecials, genres);
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
        const settingsKey = `${settings.browse.sort}-${settings.browse.hideSpecials}-${selectedGenres.join(",")}`;
        if (lastFetchedSettingsRef.current === settingsKey) {
            return;
        }
        lastFetchedSettingsRef.current = settingsKey;
        performSearch(initialQuery, initialPage, settings.browse.sort, settings.browse.hideSpecials, selectedGenres);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settingsLoading, settings.browse.sort, settings.browse.hideSpecials, selectedGenres]);

    const handleLiveSearch = useCallback(
        (newQuery: string) => {
            setQuery(newQuery);
            setPage(1);
            performSearch(newQuery, 1, sort, hideSpecials, selectedGenres);

            const url = new URL(window.location.href);
            if (newQuery) {
                url.searchParams.set("q", newQuery);
            } else {
                url.searchParams.delete("q");
            }
            url.searchParams.delete("page");
            window.history.replaceState({}, "", url);
        },
        [performSearch, sort, hideSpecials, selectedGenres],
    );

    const handlePageChange = useCallback(
        (newPage: number) => {
            setPage(newPage);
            performSearch(query, newPage, sort, hideSpecials, selectedGenres);
            window.scrollTo({ top: 0, behavior: "smooth" });

            const url = new URL(window.location.href);
            if (newPage > 1) {
                url.searchParams.set("page", String(newPage));
            } else {
                url.searchParams.delete("page");
            }
            window.history.replaceState({}, "", url);
        },
        [performSearch, query, sort, hideSpecials, selectedGenres],
    );

    const handleSortChange = useCallback(
        (newSort: BrowseSortType) => {
            lastFetchedSettingsRef.current = `${newSort}-${hideSpecials}-${selectedGenres.join(",")}`;
            updateBrowseSettings({ sort: newSort });
            setPage(1);
            performSearch(query, 1, newSort, hideSpecials, selectedGenres);
        },
        [performSearch, query, hideSpecials, selectedGenres, updateBrowseSettings],
    );

    const handleHideSpecialsChange = useCallback(
        (checked: boolean) => {
            lastFetchedSettingsRef.current = `${sort}-${checked}-${selectedGenres.join(",")}`;
            updateBrowseSettings({ hideSpecials: checked });
            setPage(1);
            performSearch(query, 1, sort, checked, selectedGenres);
        },
        [performSearch, query, sort, selectedGenres, updateBrowseSettings],
    );

    const handleGenreChange = useCallback(
        (genres: string[]) => {
            setSelectedGenres(genres);
            setPage(1);
            lastFetchedSettingsRef.current = `${sort}-${hideSpecials}-${genres.join(",")}`;
            performSearch(query, 1, sort, hideSpecials, genres);

            const url = new URL(window.location.href);
            if (genres.length > 0) {
                url.searchParams.set("genres", genres.join(","));
            } else {
                url.searchParams.delete("genres");
            }
            url.searchParams.delete("page");
            window.history.replaceState({}, "", url);
        },
        [performSearch, query, sort, hideSpecials],
    );

    const handleContextMenu = useCallback(
        (event: React.MouseEvent, animeId?: number) => {
            event.preventDefault();
            event.stopPropagation();
            const contextMenuItems: ContextMenuItem[] = [];
            if (animeId && user) {
                refreshList().then(() => {
                    if (!isInWatchList(animeId)) {
                        contextMenuItems.push({
                            id: "add-complete",
                            label: "Add as Complete",
                            icon: <i className="bi bi-check-circle"></i>,
                            onClick: () => {
                                addToWatchList(animeId, "completed").then(() => {
                                    performSearch(query, page, sort, hideSpecials, selectedGenres);
                                });
                            },
                        });
                        contextMenuItems.push({
                            id: "add-watching",
                            label: "Add as Watching",
                            icon: <i className="bi bi-play-circle"></i>,
                            onClick: () => {
                                addToWatchList(animeId, "watching").then(() => {
                                    performSearch(query, page, sort, hideSpecials, selectedGenres);
                                });
                            },
                        });
                        contextMenuItems.push({
                            id: "add-plan",
                            label: "Add as Plan to Watch",
                            icon: <i className="bi bi-clock"></i>,
                            onClick: () => {
                                addToWatchList(animeId, "plan_to_watch").then(() => {
                                    performSearch(query, page, sort, hideSpecials, selectedGenres);
                                });
                            },
                        });
                        contextMenuItems.push({
                            id: "add-hold",
                            label: "Add as On Hold",
                            icon: <i className="bi bi-pause-circle"></i>,
                            onClick: () => {
                                addToWatchList(animeId, "on_hold").then(() => {
                                    performSearch(query, page, sort, hideSpecials, selectedGenres);
                                });
                            },
                        });
                        contextMenuItems.push({
                            id: "add-dropped",
                            label: "Add as Dropped",
                            icon: <i className="bi bi-x-circle"></i>,
                            onClick: () => {
                                addToWatchList(animeId, "dropped").then(() => {
                                    performSearch(query, page, sort, hideSpecials, selectedGenres);
                                });
                            },
                        });
                    }
                    if (isInWatchList(animeId)) {
                        contextMenuItems.push({
                            id: "remove",
                            label: "Remove from List",
                            icon: <i className="bi bi-trash"></i>,
                            onClick: () => {
                                removeFromWatchList(animeId).then(() => {
                                    performSearch(query, page, sort, hideSpecials, selectedGenres);
                                });
                            },
                        });
                    }
                    showContextMenu(event.nativeEvent, contextMenuItems);
                });
            }
        },
        [
            showContextMenu,
            addToWatchList,
            removeFromWatchList,
            performSearch,
            sort,
            hideSpecials,
            selectedGenres,
            query,
            page,
            refreshList,
            isInWatchList,
            user,
        ],
    );

    const showLoading = (loading || settingsLoading) && !isLoading;

    return (
        <div className={styles.page}>
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

            <div className={styles.genreFilterWrapper}>
                <GenreFilter
                    genres={allGenres}
                    selected={selectedGenres}
                    onChangeAction={handleGenreChange}
                    loading={genresLoading}
                    defaultCollapsed
                />
            </div>

            {showLoading ? (
                <div className={styles.loading}>
                    <Spinner text="Searching..." />
                </div>
            ) : anime.length > 0 ? (
                <>
                    <div className={styles.grid}>
                        {anime.map(item => (
                            <AnimeCard key={item.mal_id} anime={item} onContextMenu={handleContextMenu} />
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
            <ContextMenu
                visible={contextMenu.visible}
                x={contextMenu.x}
                y={contextMenu.y}
                items={contextMenu.items}
                onClose={hideContextMenu}
            />
        </div>
    );
}

export default function BrowsePage() {
    return (
        <Suspense
            fallback={
                <div className={styles.page}>
                    <div className={styles.loading}>
                        <Spinner text="Loading..." />
                    </div>
                </div>
            }
        >
            <BrowseContent />
        </Suspense>
    );
}
