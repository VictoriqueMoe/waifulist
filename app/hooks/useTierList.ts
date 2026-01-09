"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { TierListData, TierListWithCharacters } from "@/types/tierlist";
import {
    CharacterPreview,
    createTierListApi,
    deleteTierListApi,
    fetchCharacterPreviews,
    fetchPublicTierLists,
    fetchTierList,
    fetchUserTierLists,
    TierListSummary,
    TierListSummaryPublic,
    updateCommentsEnabled,
    updateTierListApi,
    updateTierListVisibility,
} from "@/services/tierListClientService";

export function useTierLists() {
    const { user } = useAuth();
    const [tierLists, setTierLists] = useState<TierListSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        if (!user) {
            setTierLists([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchUserTierLists();
            setTierLists(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load tier lists");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const deleteTierList = useCallback(async (publicId: string): Promise<boolean> => {
        try {
            await deleteTierListApi(publicId);
            setTierLists(prev => prev.filter(t => t.publicId !== publicId));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete tier list");
            return false;
        }
    }, []);

    const toggleVisibility = useCallback(async (publicId: string, isPublic: boolean): Promise<boolean> => {
        try {
            await updateTierListVisibility(publicId, isPublic);
            setTierLists(prev => prev.map(t => (t.publicId === publicId ? { ...t, isPublic } : t)));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update visibility");
            return false;
        }
    }, []);

    const toggleCommentsEnabled = useCallback(async (publicId: string, commentsEnabled: boolean): Promise<boolean> => {
        try {
            await updateCommentsEnabled(publicId, commentsEnabled);
            setTierLists(prev => prev.map(t => (t.publicId === publicId ? { ...t, commentsEnabled } : t)));
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update comments setting");
            return false;
        }
    }, []);

    return {
        tierLists,
        loading,
        error,
        refresh,
        deleteTierList,
        toggleVisibility,
        toggleCommentsEnabled,
    };
}

export function useTierList(publicId: string | null) {
    const [tierList, setTierList] = useState<TierListWithCharacters | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

    const load = useCallback(async () => {
        if (!publicId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const data = await fetchTierList(publicId);
            setTierList(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load tier list");
        } finally {
            setLoading(false);
        }
    }, [publicId]);

    useEffect(() => {
        load();
    }, [load]);

    const save = useCallback(
        async (name: string, data: TierListData): Promise<boolean> => {
            if (!publicId) {
                return false;
            }

            setSaveStatus("saving");

            try {
                await updateTierListApi(publicId, { name, data });
                setSaveStatus("saved");
                setTimeout(() => setSaveStatus("idle"), 2000);
                return true;
            } catch (err) {
                setSaveStatus("error");
                console.error("Save error:", err);
                setTimeout(() => setSaveStatus("idle"), 3000);
                return false;
            }
        },
        [publicId],
    );

    return {
        tierList,
        loading,
        error,
        saveStatus,
        save,
        refresh: load,
    };
}

export function useCreateTierList() {
    const { user } = useAuth();
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasStarted = useRef(false);

    const create = useCallback(async (): Promise<TierListSummary | null> => {
        if (!user || hasStarted.current) {
            return null;
        }

        hasStarted.current = true;
        setCreating(true);
        setError(null);

        try {
            const tierList = await createTierListApi();
            return tierList;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create tier list");
            hasStarted.current = false;
            return null;
        } finally {
            setCreating(false);
        }
    }, [user]);

    const reset = useCallback(() => {
        hasStarted.current = false;
        setError(null);
    }, []);

    return {
        create,
        creating,
        error,
        reset,
    };
}

export interface PublicTierListsOptions {
    page?: number;
    limit?: number;
    search?: string;
    sort?: "newest" | "oldest" | "name";
}

export function usePublicTierLists(options: PublicTierListsOptions = {}) {
    const [tierLists, setTierLists] = useState<TierListSummaryPublic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await fetchPublicTierLists(options);
            setTierLists(result.tierLists);
            setTotal(result.total);
            setTotalPages(result.totalPages);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load tier lists");
        } finally {
            setLoading(false);
        }
    }, [options]);

    useEffect(() => {
        load();
    }, [load]);

    return {
        tierLists,
        loading,
        error,
        total,
        totalPages,
        refresh: load,
    };
}

export function useCharacterPreviews(characterIds: number[]) {
    const [previews, setPreviews] = useState<CharacterPreview[]>([]);
    const [loading, setLoading] = useState(characterIds.length > 0);

    useEffect(() => {
        if (characterIds.length === 0) {
            return;
        }

        let cancelled = false;

        const load = async () => {
            setLoading(true);
            const data = await fetchCharacterPreviews(characterIds);
            if (!cancelled) {
                setPreviews(data);
                setLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [characterIds]);

    return { previews, loading };
}
