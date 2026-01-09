"use client";

import { useEffect, useState } from "react";
import { ComparisonData } from "@/types/compare";
import { fetchComparison } from "@/services/compareClientService";

export function useComparison(targetUuid: string) {
    const [data, setData] = useState<ComparisonData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);

            const result = await fetchComparison(targetUuid);

            if (cancelled) {
                return;
            }

            if (!result.success) {
                setError(result.error || "Failed to load comparison");
            } else {
                setData(result.data || null);
            }

            setLoading(false);
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [targetUuid]);

    return { data, loading, error };
}
