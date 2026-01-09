"use client";

import { useCallback, useState } from "react";
import { resolveCharacterUrl } from "@/services/characterLookupClientService";

export function useCharacterUrl() {
    const [loading, setLoading] = useState(false);

    const getCharacterUrl = useCallback(
        async (characterName: string, malAnimeId: number | null, anilistId: number): Promise<string> => {
            setLoading(true);
            try {
                return await resolveCharacterUrl(characterName, malAnimeId, anilistId);
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    return { getCharacterUrl, loading };
}
