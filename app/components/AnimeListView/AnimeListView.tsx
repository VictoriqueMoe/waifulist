"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Anime, SortType, WatchStatus, watchStatusLabels } from "@/types/anime";
import { AnimeCard } from "@/components/AnimeCard/AnimeCard";
import { Button } from "@/components/Button/Button";
import styles from "./AnimeListView.module.scss";

export interface WatchedItem {
    animeId: number;
    status: WatchStatus;
    rating: number | null;
    dateAdded: string;
}

interface AnimeListViewProps {
    title: string;
    subtitle: string;
    watchedItems: WatchedItem[];
    animeData: Map<number, Anime>;
    loading: boolean;
    headerActions?: React.ReactNode;
    showStatusBadge?: boolean;
}

const statusOrder: WatchStatus[] = ["watching", "plan_to_watch", "completed", "on_hold", "dropped"];
const sortByOptions: SortType[] = ["added", "name", "rating", "rating (personal)"];
const PAGE_SIZE = 48;

export function AnimeListView({
    title,
    subtitle,
    watchedItems,
    animeData,
    loading,
    headerActions,
    showStatusBadge = true,
}: AnimeListViewProps) {
    const [activeTab, setActiveTab] = useState<WatchStatus | "all">("all");
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortType>("added");

    const getTabItems = useCallback(() => {
        if (activeTab === "all") {
            return watchedItems;
        }
        return watchedItems.filter(item => item.status === activeTab);
    }, [activeTab, watchedItems]);

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        const items = getTabItems().filter(item => {
            const anime = animeData.get(item.animeId);
            if (!anime) {
                return false;
            }
            return !query || anime.title.toLowerCase().includes(query);
        });

        return items.sort((a, b) => {
            const animeA = animeData.get(a.animeId);
            const animeB = animeData.get(b.animeId);

            if (!animeA || !animeB) {
                return !animeA && !animeB ? 0 : !animeA ? 1 : -1;
            }

            if (sortBy === "rating") {
                return (animeB.mean ?? 0) - (animeA.mean ?? 0);
            }

            if (sortBy === "rating (personal)") {
                return (b.rating ?? 0) - (a.rating ?? 0);
            }

            if (sortBy === "added") {
                return 0;
            }

            return animeA.title.localeCompare(animeB.title);
        });
    }, [getTabItems, searchQuery, sortBy, animeData]);

    const getPagedAnime = useCallback((): Anime[] => {
        const startIndex = (page - 1) * PAGE_SIZE;
        const pageItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
        return pageItems.map(item => animeData.get(item.animeId)).filter((a): a is Anime => !!a);
    }, [filteredItems, page, animeData]);

    const getCounts = useCallback(() => {
        const counts: Record<string, number> = { all: watchedItems.length };
        statusOrder.forEach(status => {
            counts[status] = watchedItems.filter(item => item.status === status).length;
        });
        return counts;
    }, [watchedItems]);

    const counts = getCounts();
    const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
    const pagedAnime = getPagedAnime();

    const handleTabChange = useCallback((tab: WatchStatus | "all") => {
        setActiveTab(tab);
        setPage(1);
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1);
    }, []);

    const handleSortByChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSortBy(e.target.value as SortType);
        setPage(1);
    }, []);

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>{title}</h1>
                    <p className={styles.subtitle}>{subtitle}</p>
                    {headerActions && <div className={styles.headerActions}>{headerActions}</div>}
                </div>

                <div className={styles.searchContainer}>
                    <div className={styles.searchInput}>
                        <i className="bi bi-search" />
                        <input
                            type="text"
                            placeholder="Search this list..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                        {searchQuery && (
                            <button
                                className={styles.clearSearch}
                                onClick={() => {
                                    setSearchQuery("");
                                    setPage(1);
                                }}
                            >
                                <i className="bi bi-x" />
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <span className={styles.searchResults}>
                            {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                <div className={styles.tabs}>
                    <Button
                        variant={activeTab === "all" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => handleTabChange("all")}
                    >
                        All ({counts.all})
                    </Button>
                    {statusOrder.map(status => (
                        <Button
                            key={status}
                            variant={activeTab === status ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => handleTabChange(status)}
                        >
                            {watchStatusLabels[status]} ({counts[status]})
                        </Button>
                    ))}
                    <label style={{ marginLeft: 24, translate: "0px 8px" }}>Sort By:</label>
                    <select value={sortBy} onChange={e => handleSortByChange(e)} style={{ marginLeft: 8 }}>
                        {sortByOptions.map(opt => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                </div>

                {filteredItems.length > 0 ? (
                    <>
                        <div className={styles.grid}>
                            {pagedAnime.map(anime => (
                                <AnimeCard key={anime.id} anime={anime} showStatus={showStatusBadge} />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <i className="bi bi-chevron-left" /> Previous
                                </Button>
                                <span className={styles.pageInfo}>
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next <i className="bi bi-chevron-right" />
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.empty}>
                        <i className={searchQuery ? "bi bi-search" : "bi bi-bookmark"} />
                        <h3>
                            {searchQuery
                                ? "No results found"
                                : activeTab === "all"
                                  ? "This list is empty"
                                  : `No anime ${watchStatusLabels[activeTab].toLowerCase()}`}
                        </h3>
                        <p>
                            {searchQuery
                                ? `No anime matching "${searchQuery}"`
                                : activeTab === "all"
                                  ? "No anime has been added to this list yet"
                                  : "No anime in this category"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
