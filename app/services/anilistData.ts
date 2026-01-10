import { getRedis, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";
import {
    fetchCharacterById,
    fetchCharactersByMalId,
    fetchMangaCharactersByMalId,
    searchCharactersFromAniList,
    SearchResult,
} from "@/lib/anilist";
import { AniListCharacter } from "@/types/anilist";
import { TierListCharacter } from "@/types/tierlist";

type MediaType = "anime" | "manga";

function toTierListCharacter(char: AniListCharacter): TierListCharacter {
    return {
        anilistId: char.id,
        name: char.name.full,
        image: char.image.large || char.image.medium,
        anime:
            char.media?.nodes?.map(m => ({
                malId: m.idMal ?? null,
                title: m.title?.english || m.title?.romaji || "Unknown",
                type: m.type?.toLowerCase() as "anime" | "manga" | undefined,
            })) || [],
    };
}

export async function searchCharacters(query: string, page: number = 1, perPage: number = 20): Promise<SearchResult> {
    const redis = getRedis();
    const cacheKey = REDIS_KEYS.ANILIST_SEARCH(query, page);

    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached) as SearchResult;
    }

    const result = await searchCharactersFromAniList(query, page, perPage);

    if (result.characters.length > 0) {
        await redis.setex(cacheKey, REDIS_TTL.ANILIST_SEARCH, JSON.stringify(result));

        const pipeline = redis.pipeline();
        for (const character of result.characters) {
            pipeline.setex(
                REDIS_KEYS.ANILIST_CHARACTER(character.id),
                REDIS_TTL.ANILIST_CHARACTER,
                JSON.stringify(character),
            );
        }
        await pipeline.exec();
    }

    return result;
}

export async function getCharactersForTierList(anilistIds: number[]): Promise<TierListCharacter[]> {
    if (anilistIds.length === 0) {
        return [];
    }

    const redis = getRedis();
    const keys = anilistIds.map(id => REDIS_KEYS.ANILIST_CHARACTER(id));
    const results = await redis.mget(...keys);

    const characterMap = new Map<number, TierListCharacter>();
    const missingIds: number[] = [];

    for (let i = 0; i < anilistIds.length; i++) {
        const data = results[i];
        if (data) {
            const char = JSON.parse(data) as AniListCharacter;
            characterMap.set(anilistIds[i], toTierListCharacter(char));
        } else {
            missingIds.push(anilistIds[i]);
        }
    }

    if (missingIds.length > 0) {
        const fetched = await Promise.all(missingIds.map(id => fetchCharacterById(id)));

        const pipeline = redis.pipeline();
        for (let i = 0; i < missingIds.length; i++) {
            const char = fetched[i];
            if (char) {
                characterMap.set(missingIds[i], toTierListCharacter(char));
                pipeline.setex(
                    REDIS_KEYS.ANILIST_CHARACTER(char.id),
                    REDIS_TTL.ANILIST_CHARACTER,
                    JSON.stringify(char),
                );
            }
        }
        await pipeline.exec();
    }

    const characters: TierListCharacter[] = [];
    for (const id of anilistIds) {
        const char = characterMap.get(id);
        if (char) {
            characters.push(char);
        }
    }

    return characters;
}

export async function getCharactersByMedia(
    malId: number,
    type: MediaType,
    page: number = 1,
    perPage: number = 20,
): Promise<SearchResult> {
    const redis = getRedis();
    const cacheKey =
        type === "anime"
            ? REDIS_KEYS.ANILIST_ANIME_CHARACTERS(malId, page)
            : REDIS_KEYS.ANILIST_MANGA_CHARACTERS(malId, page);
    const ttl = type === "anime" ? REDIS_TTL.ANILIST_ANIME_CHARACTERS : REDIS_TTL.ANILIST_MANGA_CHARACTERS;

    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached) as SearchResult;
    }

    const fetchFn = type === "anime" ? fetchCharactersByMalId : fetchMangaCharactersByMalId;
    const result = await fetchFn(malId, page, perPage);

    if (result.characters.length > 0) {
        await redis.setex(cacheKey, ttl, JSON.stringify(result));

        const pipeline = redis.pipeline();
        for (const character of result.characters) {
            pipeline.setex(
                REDIS_KEYS.ANILIST_CHARACTER(character.id),
                REDIS_TTL.ANILIST_CHARACTER,
                JSON.stringify(character),
            );
        }
        await pipeline.exec();
    }

    return result;
}
