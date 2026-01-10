"use client";

import { useCallback, useState } from "react";
import { resolveCharacterUrl } from "@/services/characterLookupClientService";

export function useCharacterUrl() {
    const [loading, setLoading] = useState(false);

    const getCharacterUrl = useCallback(
        async (
            characterName: string,
            malMediaId: number | null,
            anilistId: number,
            mediaType: "anime" | "manga" = "anime",
        ): Promise<string> => {
            setLoading(true);
            try {
                return await resolveCharacterUrl(characterName, malMediaId, anilistId, mediaType);
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    return { getCharacterUrl, loading };
}
