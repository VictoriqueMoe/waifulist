import Fuse from "fuse.js";
import { fetchAnimeCharacters, fetchMangaCharacters } from "@/lib/jikanApi";

type MediaType = "anime" | "manga";

interface CharacterEntry {
    character: {
        mal_id: number;
        name: string;
    };
}

export interface CharacterLookupResult {
    found: boolean;
    malCharacterId: number | null;
    mediaId: number;
}

export async function resolveCharacterMalId(
    characterName: string,
    mediaId: number,
    type: MediaType = "anime",
): Promise<CharacterLookupResult> {
    const rawCharacters = type === "manga" ? await fetchMangaCharacters(mediaId) : await fetchAnimeCharacters(mediaId);

    const characters: CharacterEntry[] = rawCharacters.map(c => ({
        character: { mal_id: c.character.mal_id, name: c.character.name },
    }));

    if (characters.length === 0) {
        return { found: false, malCharacterId: null, mediaId };
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
            mediaId,
        };
    }

    return { found: false, malCharacterId: null, mediaId };
}
