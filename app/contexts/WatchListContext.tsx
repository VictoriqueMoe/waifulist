"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { WatchedAnime, WatchStatus } from "@/types/anime";
import { useAuth } from "./AuthContext";

interface WatchListContextType {
    watchedList: Map<number, WatchedAnime>;
    loading: boolean;
    addToWatchList: (animeId: number, status: WatchStatus) => Promise<void>;
    bulkAddToWatchList: (animeIds: number[], status: WatchStatus) => Promise<number>;
    updateWatchStatus: (animeId: number, updates: Partial<WatchedAnime>) => Promise<void>;
    removeFromWatchList: (animeId: number) => Promise<void>;
    getWatchData: (animeId: number) => WatchedAnime | undefined;
    isInWatchList: (animeId: number) => boolean;
    getListByStatus: (status: WatchStatus) => WatchedAnime[];
    getAllWatched: () => WatchedAnime[];
    refreshList: () => Promise<void>;
}

const WatchListContext = createContext<WatchListContextType | undefined>(undefined);

export function WatchListProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [watchedList, setWatchedList] = useState<Map<number, WatchedAnime>>(new Map());
    const [loading, setLoading] = useState(false);

    const refreshList = useCallback(async () => {
        if (!user) {
            setWatchedList(new Map());
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/watchlist");
            if (response.ok) {
                const data = await response.json();
                const map = new Map<number, WatchedAnime>();
                data.items.forEach(
                    (item: {
                        anime_id: number;
                        status: string;
                        episodes_watched: number;
                        rating: number | null;
                        date_added: string;
                        date_updated: string;
                    }) => {
                        map.set(item.anime_id, {
                            animeId: item.anime_id,
                            status: item.status as WatchStatus,
                            episodesWatched: item.episodes_watched,
                            rating: item.rating ?? undefined,
                            dateAdded: item.date_added,
                            dateUpdated: item.date_updated,
                        });
                    },
                );
                setWatchedList(map);
            }
        } catch (error) {
            console.error("Failed to fetch watch list:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        refreshList();
    }, [refreshList]);

    const addToWatchList = useCallback(
        async (animeId: number, status: WatchStatus) => {
            if (!user) {
                return;
            }

            try {
                const response = await fetch("/api/watchlist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ animeId, status }),
                });

                if (response.ok) {
                    const data = await response.json();
                    setWatchedList(prev => {
                        const updated = new Map(prev);
                        updated.set(animeId, {
                            animeId: data.item.anime_id,
                            status: data.item.status as WatchStatus,
                            episodesWatched: data.item.episodes_watched,
                            rating: data.item.rating ?? undefined,
                            dateAdded: data.item.date_added,
                            dateUpdated: data.item.date_updated,
                        });
                        return updated;
                    });
                }
            } catch (error) {
                console.error("Failed to add to watch list:", error);
            }
        },
        [user],
    );

    const bulkAddToWatchList = useCallback(
        async (animeIds: number[], status: WatchStatus): Promise<number> => {
            if (!user) {
                return 0;
            }

            try {
                const response = await fetch("/api/watchlist", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ animeIds, status }),
                });

                if (response.ok) {
                    const data = await response.json();
                    await refreshList();
                    return data.added;
                }
            } catch (error) {
                console.error("Failed to bulk add:", error);
            }
            return 0;
        },
        [user, refreshList],
    );

    const updateWatchStatus = useCallback(
        async (animeId: number, updates: Partial<WatchedAnime>) => {
            if (!user) {
                return;
            }

            try {
                const response = await fetch(`/api/watchlist/${animeId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status: updates.status,
                        episodesWatched: updates.episodesWatched,
                        rating: updates.rating,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.item) {
                        setWatchedList(prev => {
                            const updated = new Map(prev);
                            updated.set(animeId, {
                                animeId: data.item.anime_id,
                                status: data.item.status as WatchStatus,
                                episodesWatched: data.item.episodes_watched,
                                rating: data.item.rating ?? undefined,
                                dateAdded: data.item.date_added,
                                dateUpdated: data.item.date_updated,
                            });
                            return updated;
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to update watch status:", error);
            }
        },
        [user],
    );

    const removeFromWatchList = useCallback(
        async (animeId: number) => {
            if (!user) {
                return;
            }

            try {
                const response = await fetch(`/api/watchlist/${animeId}`, {
                    method: "DELETE",
                });

                if (response.ok) {
                    setWatchedList(prev => {
                        const updated = new Map(prev);
                        updated.delete(animeId);
                        return updated;
                    });
                }
            } catch (error) {
                console.error("Failed to remove from watch list:", error);
            }
        },
        [user],
    );

    const getWatchData = useCallback(
        (animeId: number): WatchedAnime | undefined => {
            return watchedList.get(animeId);
        },
        [watchedList],
    );

    const isInWatchList = useCallback(
        (animeId: number): boolean => {
            return watchedList.has(animeId);
        },
        [watchedList],
    );

    const getListByStatus = useCallback(
        (status: WatchStatus): WatchedAnime[] => {
            return Array.from(watchedList.values()).filter(item => item.status === status);
        },
        [watchedList],
    );

    const getAllWatched = useCallback((): WatchedAnime[] => {
        return Array.from(watchedList.values());
    }, [watchedList]);

    return (
        <WatchListContext.Provider
            value={{
                watchedList,
                loading,
                addToWatchList,
                bulkAddToWatchList,
                updateWatchStatus,
                removeFromWatchList,
                getWatchData,
                isInWatchList,
                getListByStatus,
                getAllWatched,
                refreshList,
            }}
        >
            {children}
        </WatchListContext.Provider>
    );
}

export function useWatchList() {
    const context = useContext(WatchListContext);
    if (context === undefined) {
        throw new Error("useWatchList must be used within a WatchListProvider");
    }
    return context;
}
