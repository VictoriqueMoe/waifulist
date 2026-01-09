"use client";

import { useEffect, useState } from "react";
import { UserStats } from "@/types/stats";
import { fetchUserStats } from "@/services/statsClientService";

export function useStats() {
    const [stats, setStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);

            const result = await fetchUserStats();

            if (cancelled) {
                return;
            }

            if (!result.success) {
                setError(result.error || "Failed to load stats");
            } else {
                setStats(result.data || null);
            }

            setLoading(false);
        };

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    return { stats, loading, error };
}
