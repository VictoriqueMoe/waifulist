"use client";

import { useCallback, useEffect, useState } from "react";
import { AiringSubscription } from "@/types/subscription";
import {
    addSubscription as addSub,
    fetchSubscriptions,
    removeSubscription as removeSub,
} from "@/services/airingSubscriptionService";

export function useAiringSubscriptions() {
    const [subscriptions, setSubscriptions] = useState<AiringSubscription[]>([]);
    const [subscribedIds, setSubscribedIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await fetchSubscriptions();
                if (cancelled) {
                    return;
                }

                setSubscriptions(data);
                const ids = new Set<number>();
                for (const sub of data) {
                    ids.add(sub.malId);
                }
                setSubscribedIds(ids);
            } catch (err) {
                if (cancelled) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load subscriptions");
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    const isSubscribed = useCallback(
        (malId: number): boolean => {
            return subscribedIds.has(malId);
        },
        [subscribedIds],
    );

    const subscribe = useCallback(async (malId: number, title: string): Promise<boolean> => {
        const success = await addSub(malId, title);
        if (success) {
            setSubscriptions(prev => [{ id: 0, malId, title, createdAt: new Date().toISOString() }, ...prev]);
            setSubscribedIds(prev => new Set([...prev, malId]));
        }
        return success;
    }, []);

    const unsubscribe = useCallback(async (malId: number): Promise<boolean> => {
        const success = await removeSub(malId);
        if (success) {
            setSubscriptions(prev => prev.filter(s => s.malId !== malId));
            setSubscribedIds(prev => {
                const next = new Set(prev);
                next.delete(malId);
                return next;
            });
        }
        return success;
    }, []);

    return {
        subscriptions,
        subscribedIds,
        loading,
        error,
        isSubscribed,
        subscribe,
        unsubscribe,
    };
}
