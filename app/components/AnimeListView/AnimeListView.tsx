"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Anime, SortType, WatchStatus, watchStatusLabels } from "@/types/anime";
import { AnimeCard, AnimeCardWatchData } from "@/components/AnimeCard/AnimeCard";
import { Button } from "@/components/Button/Button";
import { Pagination } from "@/components/Pagination/Pagination";
import styles from "./AnimeListView.module.scss";

export interface WatchedItem {
    animeId: number;
    status: WatchStatus;
    rating: number | null;
    notes?: string | null;
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
    initialSort?: SortType;
    onSortChange?: (sort: SortType) => void;
    ratingLabel?: string;
}

const statusOrder: WatchStatus[] = ["watching", "plan_to_watch", "completed", "on_hold", "dropped"];
const sortByOptions: SortType[] = ["added", "name", "rating", "rating (personal)"];
const PAGE_SIZE = 24;

export function AnimeListView({
    title,
    subtitle,
    watchedItems,
    animeData,
    loading,
    headerActions,
    showStatusBadge = true,
    initialSort = "added",
    onSortChange,
    ratingLabel,
}: AnimeListViewProps) {
    const searchParams = useSearchParams();
    const initialPage = parseInt(searchParams.get("page") || "1", 10);

    const [activeTab, setActiveTab] = useState<WatchStatus | "all">("all");
    const [page, setPage] = useState(initialPage);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortType>(initialSort);

    // Sync sortBy when initialSort changes (after settings load)
    useEffect(() => {
        setSortBy(initialSort);
    }, [initialSort]);

    const updatePageUrl = useCallback((newPage: number) => {
        const url = new URL(window.location.href);
        if (newPage > 1) {
            url.searchParams.set("page", String(newPage));
        } else {
            url.searchParams.delete("page");
        }
        window.history.replaceState({}, "", url);
    }, []);

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
                return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
            }

            return animeA.title.localeCompare(animeB.title);
        });
    }, [getTabItems, searchQuery, sortBy, animeData]);

    const getPagedItems = useCallback((): { anime: Anime; watchData: AnimeCardWatchData }[] => {
        const startIndex = (page - 1) * PAGE_SIZE;
        const pageItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
        const result: { anime: Anime; watchData: AnimeCardWatchData }[] = [];
        for (const item of pageItems) {
            const anime = animeData.get(item.animeId);
            if (anime) {
                result.push({
                    anime,
                    watchData: {
                        status: item.status,
                        rating: item.rating,
                        notes: item.notes ?? undefined,
                        dateAdded: item.dateAdded,
                    },
                });
            }
        }
        return result;
    }, [filteredItems, page, animeData]);

    const getCounts = useCallback(() => {
        const counts: Record<string, number> = { all: watchedItems.length };

        for (const status of statusOrder) {
            counts[status] = watchedItems.filter(item => item.status === status).length;
        }

        return counts;
    }, [watchedItems]);

    const counts = getCounts();
    const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
    const pagedItems = getPagedItems();

    const handleTabChange = useCallback(
        (tab: WatchStatus | "all") => {
            setActiveTab(tab);
            setPage(1);
            updatePageUrl(1);
        },
        [updatePageUrl],
    );

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchQuery(e.target.value);
            setPage(1);
            updatePageUrl(1);
        },
        [updatePageUrl],
    );

    const handleSortByChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newSort = e.target.value as SortType;
            setSortBy(newSort);
            setPage(1);
            updatePageUrl(1);
            onSortChange?.(newSort);
        },
        [onSortChange, updatePageUrl],
    );

    const handlePageChange = useCallback(
        (newPage: number) => {
            setPage(newPage);
            updatePageUrl(newPage);
        },
        [updatePageUrl],
    );

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
                                    updatePageUrl(1);
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
                            {pagedItems.map(({ anime, watchData }) => (
                                <AnimeCard
                                    key={anime.id}
                                    anime={anime}
                                    showStatus={showStatusBadge}
                                    watchData={watchData}
                                    ratingLabel={ratingLabel}
                                />
                            ))}
                        </div>

                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
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
