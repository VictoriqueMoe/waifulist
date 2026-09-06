"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DayOfWeek, groupAiringByDay, ScheduleAnime } from "@/types/schedule";
import { AiringInfo } from "@/types/airing";
import { AniListFailureReason } from "@/types/anilist";
import { fetchSchedule } from "@/services/frontend/scheduleClientService";
import { failureReasonOf, upstreamDetailOf } from "@/services/frontend/upstreamError";

export function useSchedule() {
    const [airing, setAiring] = useState<AiringInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorReason, setErrorReason] = useState<AniListFailureReason | null>(null);
    const [errorDetail, setErrorDetail] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const requestId = useRef(0);

    const load = useCallback(async () => {
        const id = ++requestId.current;

        setLoading(true);
        setError(null);
        setErrorReason(null);
        setErrorDetail(null);

        try {
            const data = await fetchSchedule();
            if (requestId.current !== id) {
                return;
            }

            setAiring(data.airing);
            setLastUpdated(data.lastUpdated);
        } catch (err) {
            if (requestId.current !== id) {
                return;
            }

            setError(err instanceof Error ? err.message : "Failed to load schedule");
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

    const schedule = useMemo(() => {
        if (airing.length === 0) {
            return null;
        }
        return groupAiringByDay(airing);
    }, [airing]);

    const getAnimeForDay = (day: DayOfWeek): ScheduleAnime[] => {
        return schedule?.[day] || [];
    };

    const getTotalCount = (): number => {
        if (!schedule) {
            return 0;
        }
        let count = 0;
        for (const day in schedule) {
            count += schedule[day as DayOfWeek].length;
        }
        return count;
    };

    return {
        schedule,
        loading,
        error,
        errorReason,
        errorDetail,
        lastUpdated,
        reload: load,
        getAnimeForDay,
        getTotalCount,
    };
}
