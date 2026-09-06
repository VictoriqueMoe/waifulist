"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AiringBucket, AiringInfo, GroupedAiring } from "@/types/airing";
import { AniListFailureReason } from "@/types/anilist";
import { fetchAiringSchedule } from "@/services/frontend/airingClientService";
import { failureReasonOf, upstreamDetailOf } from "@/services/frontend/upstreamError";

function getBucket(airingAt: number, timeUntilAiring: number, duration: number | null): AiringBucket {
    if (timeUntilAiring <= 0) {
        const minutesAgo = Math.abs(timeUntilAiring) / 60;
        const episodeDuration = duration ?? 24;
        if (minutesAgo <= episodeDuration) {
            return "airing_now";
        }
        return "aired_today";
    }

    const hours = timeUntilAiring / 3600;

    if (hours < 1) {
        return "next_hour";
    }

    const now = new Date();
    const airingDate = new Date(airingAt * 1000);

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

function groupAiringByBucket(airing: AiringInfo[], airedToday: AiringInfo[]): GroupedAiring[] {
    const buckets: Record<AiringBucket, AiringInfo[]> = {
        airing_now: [],
        aired_today: [],
        next_hour: [],
        today: [],
        tomorrow: [],
        this_week: [],
        later: [],
    };

    const now = Math.floor(Date.now() / 1000);
    const activeEpisodeKeys = new Set<string>();

    for (const item of airing) {
        const timeUntilAiring = item.airingAt - now;
        const bucket = getBucket(item.airingAt, timeUntilAiring, item.duration);
        const key = `${item.malId}-${item.episode}`;
        activeEpisodeKeys.add(key);
        buckets[bucket].push({
            ...item,
            timeUntilAiring,
        });
    }

    for (const item of airedToday) {
        const key = `${item.malId}-${item.episode}`;
        if (activeEpisodeKeys.has(key)) {
            continue;
        }
        const timeUntilAiring = item.airingAt - now;
        buckets.aired_today.push({
            ...item,
            timeUntilAiring,
        });
    }

    buckets.aired_today.sort((a, b) => b.airingAt - a.airingAt);

    const bucketOrder: AiringBucket[] = [
        "airing_now",
        "aired_today",
        "next_hour",
        "today",
        "tomorrow",
        "this_week",
        "later",
    ];
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
    const [airedToday, setAiredToday] = useState<AiringInfo[]>([]);
    const [grouped, setGrouped] = useState<GroupedAiring[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorReason, setErrorReason] = useState<AniListFailureReason | null>(null);
    const [errorDetail, setErrorDetail] = useState<string | null>(null);
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);
    const requestId = useRef(0);

    const recalculateGroups = useCallback(() => {
        if (airing.length > 0 || airedToday.length > 0) {
            setGrouped(groupAiringByBucket(airing, airedToday));
        }
    }, [airing, airedToday]);

    const load = useCallback(async () => {
        const id = ++requestId.current;

        setLoading(true);
        setError(null);
        setErrorReason(null);
        setErrorDetail(null);

        try {
            const data = await fetchAiringSchedule();
            if (requestId.current !== id) {
                return;
            }

            setAiring(data.airing);
            setAiredToday(data.airedToday);
            setFetchedAt(data.fetchedAt);
            setGrouped(groupAiringByBucket(data.airing, data.airedToday));
        } catch (err) {
            if (requestId.current !== id) {
                return;
            }

            setError(err instanceof Error ? err.message : "Failed to load airing schedule");
            setErrorReason(failureReasonOf(err));
            setErrorDetail(upstreamDetailOf(err));
        } finally {
            if (requestId.current === id) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (airing.length === 0 && airedToday.length === 0) {
            return;
        }

        const interval = setInterval(() => {
            recalculateGroups();
        }, 60000);

        return () => {
            clearInterval(interval);
        };
    }, [airing, airedToday, recalculateGroups]);

    return {
        airing,
        grouped,
        loading,
        error,
        errorReason,
        errorDetail,
        fetchedAt,
        reload: load,
        recalculateGroups,
    };
}
