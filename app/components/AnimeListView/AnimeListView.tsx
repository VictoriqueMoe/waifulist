"use client";

import React, { useCallback, useImperativeHandle, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Anime, SortType, WatchStatus, watchStatusLabels } from "@/types/anime";
import { UnifiedSortType } from "@/types/filter";
import { useFilteredList } from "@/hooks/useFilteredList";
import { AnimeCard, AnimeCardWatchData } from "@/components/AnimeCard/AnimeCard";
import { ContextMenu, type ContextMenuItem } from "@/components/ContextMenu";
import { useContextMenu } from "@/hooks/useContextMenu";
import { Button } from "@/components/Button/Button";
import { Pagination } from "@/components/Pagination/Pagination";
import { useWatchList } from "@/contexts/WatchListContext";
import { Spinner } from "@/components/Spinner/Spinner";
import styles from "./AnimeListView.module.scss";

export interface AnimeListViewHandle {
    reload: () => void;
}

interface AnimeListViewProps {
    title: string;
    subtitle: string;
    apiEndpoint: string;
    loading?: boolean;
    headerActions?: React.ReactNode;
    showStatusBadge?: boolean;
    initialSort?: SortType;
    onSortChange?: (sort: SortType) => void;
    ratingLabel?: string;
    genres?: string[];
    sidebar?: React.ReactNode;
    mobileSidebar?: React.ReactNode;
    onAvailableGenresChange?: (genres: string[]) => void;
    ref?: React.Ref<AnimeListViewHandle>;
}

function mapSortToApi(sort: SortType): UnifiedSortType {
    if (sort === "rating (personal)") {
        return "rating_personal";
    }
    return sort;
}

const statusOrder: WatchStatus[] = ["watching", "plan_to_watch", "completed", "on_hold", "dropped"];
const sortByOptions: SortType[] = ["added", "name", "rating", "rating (personal)"];

export function AnimeListView({
    title,
    subtitle,
    apiEndpoint,
    loading: externalLoading = false,
    headerActions,
    showStatusBadge = true,
    initialSort = "added",
    onSortChange,
    ratingLabel,
    genres = [],
    sidebar,
    mobileSidebar,
    onAvailableGenresChange,
    ref,
}: AnimeListViewProps) {
    const searchParams = useSearchParams();
    const initialPage = parseInt(searchParams.get("page") || "1", 10);

    const [activeTab, setActiveTab] = useState<WatchStatus | "all">("all");
    const [page, setPage] = useState(initialPage);
    const [inputValue, setInputValue] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortType>(initialSort);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const { items, counts, filtered, totalPages, loading, reload } = useFilteredList({
        apiEndpoint,
        searchQuery,
        sort: mapSortToApi(sortBy),
        status: activeTab,
        page,
        genres,
        onAvailableGenresChange,
    });

    const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
    const { removeFromWatchList } = useWatchList();

    useImperativeHandle(
        ref,
        () => ({
            reload,
        }),
        [reload],
    );

    const updatePageUrl = useCallback((newPage: number) => {
        const url = new URL(window.location.href);
        if (newPage > 1) {
            url.searchParams.set("page", String(newPage));
        } else {
            url.searchParams.delete("page");
        }
        window.history.replaceState({}, "", url);
    }, []);

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
            const value = e.target.value;
            setInputValue(value);

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }

            debounceRef.current = setTimeout(() => {
                setSearchQuery(value);
                setPage(1);
                updatePageUrl(1);
            }, 300);
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

    const handleContextMenu = useCallback(
        (event: React.MouseEvent, animeId?: number) => {
            event.preventDefault();
            event.stopPropagation();
            const contextMenuItems: ContextMenuItem[] = [];
            if (animeId) {
                contextMenuItems.push({
                    id: "remove",
                    label: "Remove from List",
                    icon: <i className="bi bi-trash"></i>,
                    onClick: () => {
                        removeFromWatchList(animeId).then(() => {
                            reload();
                        });
                    },
                });
                showContextMenu(event.nativeEvent, contextMenuItems);
            }
        },
        [showContextMenu, removeFromWatchList, reload],
    );

    const pagedItems: { anime: Anime; watchData: AnimeCardWatchData }[] = items
        .filter(item => item.watchData.status && item.watchData.dateAdded)
        .map(item => ({
            anime: item.anime,
            watchData: {
                status: item.watchData.status!,
                rating: item.watchData.rating,
                notes: item.watchData.notes,
                dateAdded: item.watchData.dateAdded!,
                episodesWatched: item.watchData.episodesWatched,
            },
        }));

    const isLoading = loading || externalLoading;

    return (
        <div className={sidebar ? styles.pageWithSidebar : styles.page}>
            {sidebar && <aside className={styles.sidebar}>{sidebar}</aside>}
            <div className={sidebar ? styles.main : styles.container}>
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
                            value={inputValue}
                            onChange={handleSearchChange}
                        />
                        {inputValue && (
                            <button
                                className={styles.clearSearch}
                                onClick={() => {
                                    if (debounceRef.current) {
                                        clearTimeout(debounceRef.current);
                                    }
                                    setInputValue("");
                                    setSearchQuery("");
                                    setPage(1);
                                    updatePageUrl(1);
                                }}
                            >
                                <i className="bi bi-x" />
                            </button>
                        )}
                    </div>
                    {searchQuery && !isLoading && (
                        <span className={styles.searchResults}>
                            {filtered} result{filtered !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                <div className={styles.tabs}>
                    <Button
                        variant={activeTab === "all" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => handleTabChange("all")}
                    >
                        All ({counts.all || 0})
                    </Button>
                    {statusOrder.map(status => (
                        <Button
                            key={status}
                            variant={activeTab === status ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => handleTabChange(status)}
                        >
                            {watchStatusLabels[status]} ({counts[status] || 0})
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

                {sidebar && <div className={styles.mobileSidebar}>{mobileSidebar || sidebar}</div>}

                {isLoading ? (
                    <div className={styles.loading}>
                        <Spinner text="Loading..." />
                    </div>
                ) : filtered > 0 ? (
                    <>
                        <div className={sidebar ? styles.gridWithSidebar : styles.grid}>
                            {pagedItems.map(({ anime, watchData }) => (
                                <AnimeCard
                                    key={anime.mal_id}
                                    anime={anime}
                                    showStatus={showStatusBadge}
                                    watchData={watchData}
                                    ratingLabel={ratingLabel}
                                    onContextMenu={handleContextMenu}
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
