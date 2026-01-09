export interface CharacterLookupResult {
    found: boolean;
    malCharacterId: number | null;
    animeId: number;
}

export async function resolveCharacterUrl(
    characterName: string,
    animeId: number | null,
    anilistId: number,
): Promise<string> {
    const anilistFallback = `https://anilist.co/character/${anilistId}`;

    if (!animeId) {
        return anilistFallback;
    }

    try {
        const response = await fetch(
            `/api/character/resolve?name=${encodeURIComponent(characterName)}&animeId=${animeId}`,
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
