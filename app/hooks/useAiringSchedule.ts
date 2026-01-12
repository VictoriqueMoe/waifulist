"use client";

import { useCallback, useEffect, useState } from "react";
import { AiringBucket, AiringInfo, GroupedAiring } from "@/types/airing";
import { fetchAiringSchedule } from "@/services/airingClientService";

function getBucket(timeUntilAiring: number): AiringBucket {
    if (timeUntilAiring <= 0) {
        return "airing_now";
    }

    const hours = timeUntilAiring / 3600;

    if (hours < 1) {
        return "next_hour";
    }

    const now = new Date();
    const airingDate = new Date(Date.now() + timeUntilAiring * 1000);

    const isToday =
        now.getDate() === airingDate.getDate() &&
        now.getMonth() === airingDate.getMonth() &&
        now.getFullYear() === airingDate.getFullYear();

    if (isToday) {
        return "today";
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
        tomorrow.getDate() === airingDate.getDate() &&
        tomorrow.getMonth() === airingDate.getMonth() &&
        tomorrow.getFullYear() === airingDate.getFullYear();

    if (isTomorrow) {
        return "tomorrow";
    }

    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    if (airingDate < endOfWeek) {
        return "this_week";
    }

    return "later";
}

function groupAiringByBucket(airing: AiringInfo[]): GroupedAiring[] {
    const buckets: Record<AiringBucket, AiringInfo[]> = {
        airing_now: [],
        next_hour: [],
        today: [],
        tomorrow: [],
        this_week: [],
        later: [],
    };

    const now = Math.floor(Date.now() / 1000);

    for (const item of airing) {
        const timeUntilAiring = item.airingAt - now;
        const bucket = getBucket(timeUntilAiring);
        buckets[bucket].push({
            ...item,
            timeUntilAiring,
        });
    }

    const bucketOrder: AiringBucket[] = ["airing_now", "next_hour", "today", "tomorrow", "this_week", "later"];
    const result: GroupedAiring[] = [];

    for (const bucket of bucketOrder) {
        if (buckets[bucket].length > 0) {
            result.push({
                bucket,
                items: buckets[bucket],
            });
        }
    }

    return result;
}

export function formatTimeUntilAiring(seconds: number): string {
    if (seconds <= 0) {
        const minutesAgo = Math.floor(Math.abs(seconds) / 60);
        if (minutesAgo < 60) {
            return `Started ${minutesAgo}m ago`;
        }
        const hoursAgo = Math.floor(minutesAgo / 60);
        return `Started ${hoursAgo}h ago`;
    }

    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
    }

    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    return `${minutes}m`;
}

export function useAiringSchedule() {
    const [airing, setAiring] = useState<AiringInfo[]>([]);
    const [grouped, setGrouped] = useState<GroupedAiring[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);

    const recalculateGroups = useCallback(() => {
        if (airing.length > 0) {
            setGrouped(groupAiringByBucket(airing));
        }
    }, [airing]);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await fetchAiringSchedule();
                if (cancelled) {
                    return;
                }
                setAiring(data.airing);
                setFetchedAt(data.fetchedAt);
                setGrouped(groupAiringByBucket(data.airing));
            } catch (err) {
                if (cancelled) {
                    return;
                }
                setError(err instanceof Error ? err.message : "Failed to load airing schedule");
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

    useEffect(() => {
        if (airing.length === 0) {
            return;
        }

        const interval = setInterval(() => {
            recalculateGroups();
        }, 60000);

        return () => {
            clearInterval(interval);
        };
    }, [airing, recalculateGroups]);

    return {
        airing,
        grouped,
        loading,
        error,
        fetchedAt,
        recalculateGroups,
    };
}
