export interface CharacterLookupResult {
    found: boolean;
    malCharacterId: number | null;
    mediaId: number;
}

export async function resolveCharacterUrl(
    characterName: string,
    mediaId: number | null,
    anilistId: number,
    mediaType: "anime" | "manga" = "anime",
): Promise<string> {
    const anilistFallback = `https://anilist.co/character/${anilistId}`;

    if (!mediaId) {
        return anilistFallback;
    }

    try {
        const response = await fetch(
            `/api/character/resolve?name=${encodeURIComponent(characterName)}&mediaId=${mediaId}&type=${mediaType}`,
        );

        if (!response.ok) {
            return anilistFallback;
        }

        const result: CharacterLookupResult = await response.json();

        if (result.found && result.malCharacterId) {
            return `/character/${result.malCharacterId}`;
        }

        return anilistFallback;
    } catch {
        return anilistFallback;
    }
}
