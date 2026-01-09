"use client";

import { useCallback, useState } from "react";
import { TierListData } from "@/types/tierlist";
import { createAnonymousTierListApi } from "@/services/tierListClientService";

export function useAnonymousTierList() {
    const [status, setStatus] = useState<"idle" | "sharing" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    const createAnonymousTierList = useCallback(
        async (name: string, data: TierListData): Promise<{ publicId: string; name: string } | null> => {
            setStatus("sharing");
            setError(null);

            try {
                const result = await createAnonymousTierListApi(name, data);
                setStatus("idle");
                return result;
            } catch (err) {
                setStatus("error");
                setError(err instanceof Error ? err.message : "Failed to share tier list");
                return null;
            }
        },
        [],
    );

    const reset = useCallback(() => {
        setStatus("idle");
        setError(null);
    }, []);

    return {
        status,
        error,
        createAnonymousTierList,
        reset,
    };
}
