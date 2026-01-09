"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { WatchedAnime, WatchStatus } from "@/types/anime";
import { useAuth } from "./AuthContext";
import {
    addToWatchlistApi,
    bulkAddToWatchlistApi,
    bulkImportToWatchlistApi,
    fetchWatchlist,
    ImportEntry,
    removeFromWatchlistApi,
    updateWatchlistItemApi,
} from "@/services/watchlistClientService";

export type { ImportEntry };

interface WatchListContextType {
    watchedList: Map<number, WatchedAnime>;
    loading: boolean;
    loaded: boolean;
    addToWatchList: (animeId: number, status: WatchStatus) => Promise<void>;
    bulkAddToWatchList: (animeIds: number[], status: WatchStatus) => Promise<number>;
    bulkImportToWatchList: (entries: ImportEntry[]) => Promise<number>;
    updateWatchStatus: (animeId: number, updates: Partial<WatchedAnime>) => void;
    removeFromWatchList: (animeId: number) => Promise<void>;
    getWatchData: (animeId: number) => WatchedAnime | undefined;
    isInWatchList: (animeId: number) => boolean;
    getListByStatus: (status: WatchStatus) => WatchedAnime[];
    getAllWatched: () => WatchedAnime[];
    refreshList: () => Promise<void>;
    ensureLoaded: () => void;
}

const WatchListContext = createContext<WatchListContextType | undefined>(undefined);

const DEBOUNCE_DELAY = 300;

export function WatchListProvider({ children }: React.PropsWithChildren) {
    const { user } = useAuth();
    const [watchedList, setWatchedList] = useState<Map<number, WatchedAnime>>(new Map());
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const loadingRef = React.useRef(false);

    const pendingUpdatesRef = useRef<Map<number, { updates: Partial<WatchedAnime>; timeout: NodeJS.Timeout }>>(
        new Map(),
    );

    const refreshList = useCallback(async () => {
        if (!user) {
            setWatchedList(new Map());
            setLoaded(false);
            return;
        }

        if (loadingRef.current) {
            return;
        }
        loadingRef.current = true;
        setLoading(true);

        try {
            const map = await fetchWatchlist();
            setWatchedList(map);
            setLoaded(true);
        } catch (error) {
            console.error("Failed to fetch watch list:", error);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setWatchedList(new Map());
            setLoaded(false);
        }
    }, [user]);

    useEffect(() => {
        const pendingUpdates = pendingUpdatesRef.current;
        return () => {
            for (const [, { timeout }] of pendingUpdates) {
                clearTimeout(timeout);
            }
            pendingUpdates.clear();
        };
    }, []);

    const addToWatchList = useCallback(
        async (animeId: number, status: WatchStatus) => {
            if (!user) {
                return;
            }

            try {
                const item = await addToWatchlistApi(animeId, status);
                setWatchedList(prev => {
                    const updated = new Map(prev);
                    updated.set(animeId, item);
                    return updated;
                });
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
                const added = await bulkAddToWatchlistApi(animeIds, status);
                await refreshList();
                return added;
            } catch (error) {
                console.error("Failed to bulk add:", error);
            }
            return 0;
        },
        [user, refreshList],
    );

    const bulkImportToWatchList = useCallback(
        async (entries: ImportEntry[]): Promise<number> => {
            if (!user) {
                return 0;
            }

            try {
                const added = await bulkImportToWatchlistApi(entries);
                await refreshList();
                return added;
            } catch (error) {
                console.error("Failed to bulk import:", error);
            }
            return 0;
        },
        [user, refreshList],
    );

    const sendUpdate = useCallback(
        async (animeId: number, updates: Partial<WatchedAnime>, previousData: WatchedAnime | undefined) => {
            try {
                const item = await updateWatchlistItemApi(animeId, updates);
                if (item) {
                    setWatchedList(prev => {
                        const updated = new Map(prev);
                        updated.set(animeId, item);
                        return updated;
                    });
                }
            } catch (error) {
                console.error("Failed to update watch status:", error);
                if (previousData) {
                    setWatchedList(prev => {
                        const updated = new Map(prev);
                        updated.set(animeId, previousData);
                        return updated;
                    });
                }
            }
        },
        [],
    );

    const updateWatchStatus = useCallback(
        (animeId: number, updates: Partial<WatchedAnime>) => {
            if (!user) {
                return;
            }

            const currentData = watchedList.get(animeId);
            if (!currentData) {
                return;
            }

            setWatchedList(prev => {
                const updated = new Map(prev);
                const existing = prev.get(animeId);
                if (existing) {
                    updated.set(animeId, {
                        ...existing,
                        ...updates,
                    });
                }
                return updated;
            });

            const pending = pendingUpdatesRef.current.get(animeId);
            if (pending) {
                clearTimeout(pending.timeout);
            }

            const mergedUpdates = pending ? { ...pending.updates, ...updates } : updates;

            const timeout = setTimeout(() => {
                pendingUpdatesRef.current.delete(animeId);
                sendUpdate(animeId, mergedUpdates, currentData);
            }, DEBOUNCE_DELAY);

            pendingUpdatesRef.current.set(animeId, { updates: mergedUpdates, timeout });
        },
        [user, watchedList, sendUpdate],
    );

    const removeFromWatchList = useCallback(
        async (animeId: number) => {
            if (!user) {
                return;
            }

            try {
                await removeFromWatchlistApi(animeId);
                setWatchedList(prev => {
                    const updated = new Map(prev);
                    updated.delete(animeId);
                    return updated;
                });
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

    const ensureLoaded = useCallback(() => {
        if (!loaded && !loadingRef.current && user) {
            refreshList();
        }
    }, [loaded, user, refreshList]);

    return (
        <WatchListContext.Provider
            value={{
                watchedList,
                loading,
                loaded,
                addToWatchList,
                bulkAddToWatchList,
                bulkImportToWatchList,
                updateWatchStatus,
                removeFromWatchList,
                getWatchData,
                isInWatchList,
                getListByStatus,
                getAllWatched,
                refreshList,
                ensureLoaded,
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
