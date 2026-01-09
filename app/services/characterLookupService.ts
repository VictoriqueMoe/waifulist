import Fuse from "fuse.js";
import { fetchAnimeCharacters } from "@/lib/cdn";

export interface CharacterLookupResult {
    found: boolean;
    malCharacterId: number | null;
    animeId: number;
}

export async function resolveCharacterMalId(characterName: string, animeId: number): Promise<CharacterLookupResult> {
    debugger;
    const characters = await fetchAnimeCharacters(animeId);

    if (characters.length === 0) {
        return { found: false, malCharacterId: null, animeId };
    }

    const fuse = new Fuse(characters, {
        keys: ["character.name"],
        threshold: 0.5,
        includeScore: true,
        ignoreLocation: true,
    });

    let results = fuse.search(characterName);

    if (results.length === 0 || (results[0].score !== undefined && results[0].score > 0.4)) {
        const nameParts = characterName.split(" ");
        if (nameParts.length > 1) {
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];

            results = fuse.search(firstName);
            if (results.length === 0 || (results[0].score !== undefined && results[0].score > 0.3)) {
                results = fuse.search(lastName);
            }
        }
    }

    if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.5) {
        return {
            found: true,
            malCharacterId: results[0].item.character.mal_id,
            animeId,
        };
    }

    return { found: false, malCharacterId: null, animeId };
}
