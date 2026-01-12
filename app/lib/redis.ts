import Redis from "ioredis";
import { RateLimitType } from "@/types/rateLimit";
import { isBuildPhase } from "@/lib/utils/runtimeUtils";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

declare global {
    var redis: Redis | undefined;
    var subscriber: Redis | undefined;
}

export function getRedis(): Redis {
    if (!globalThis.redis) {
        globalThis.redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                return Math.min(times * 50, 2000);
            },
        });

        if (!isBuildPhase) {
            globalThis.redis.on("error", err => {
                console.error("[Redis] Connection error:", err.message);
            });

            globalThis.redis.on("connect", () => {
                console.log("[Redis] Connected");
            });
        }
    }
    return globalThis.redis;
}

export function getSubscriber(): Redis {
    if (!globalThis.subscriber) {
        globalThis.subscriber = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                return Math.min(times * 50, 2000);
            },
        });

        globalThis.subscriber.on("error", err => {
            console.error("[Redis Subscriber] Connection error:", err.message);
        });
    }
    return globalThis.subscriber;
}

export async function closeRedis(): Promise<void> {
    if (globalThis.redis) {
        await globalThis.redis.quit();
        globalThis.redis = undefined;
    }
    if (globalThis.subscriber) {
        await globalThis.subscriber.quit();
        globalThis.subscriber = undefined;
    }
}

export const REDIS_KEYS = {
    ANIME_LIST: "anime:list",
    ANIME_BY_ID: (id: number) => `anime:id:${id}`,
    ANIME_TITLE_INDEX: "anime:titles",
    ANIME_SORTED_RATING: "anime:sorted:rating",
    ANIME_SORTED_NEWEST: "anime:sorted:newest",
    ANIME_BROWSE_COUNT: "anime:browse:count",
    ANIME_GENRES: "anime:genres",
    ANIME_SEASON: (year: number, season: string) => `anime:season:${year}:${season}`,
    ANIME_SEASON_COUNT: (year: number, season: string) => `anime:season:${year}:${season}:count`,
    ANIME_SITEMAP: (id: number) => `anime:sitemap:${id}`,
    ANIME_PEOPLE_IDS: "anime:peopleIds",
    ANIME_CHARACTER_IDS: "anime:characterIds",
    ANIME_MANGA_IDS: "anime:mangaIds",
    LAST_FETCH_TIME: "anime:lastFetchTime",
    REFRESH_CHANNEL: "anime:refresh",
    OG_IMAGE: (uuid: string, hash: string) => `og:${uuid}:${hash}`,
    RATE_LIMIT: (ip: string, type: RateLimitType) => `ratelimit:${ip}:${type}`,
    ANILIST_CHARACTER: (id: number) => `anilist:character:${id}`,
    ANILIST_SEARCH: (query: string, page: number) => `anilist:search:${query.toLowerCase()}:${page}`,
    ANILIST_ANIME_CHARACTERS: (malId: number, page: number) => `anilist:anime:${malId}:characters:${page}`,
    ANILIST_MANGA_CHARACTERS: (malId: number, page: number) => `anilist:manga:${malId}:characters:${page}`,
    VSBATTLES: (characterName: string) => `vsbattles:${characterName.toLowerCase()}`,
    SCHEDULE: "anime:schedule",
    AIRING_SCHEDULE: "anime:airing",
} as const;

export const REDIS_TTL = {
    ANIME_LIST: 60 * 60 * 24 * 7, // 7 days
    JIKAN_ENRICHED_ANIME: 60 * 60 * 24, // 24 hours (CDN-fetched)
    OG_IMAGE: 60 * 60, // 1 hour
    ANIME_SITEMAP: 60 * 60 * 24, // 24 hours
    ANIME_PEOPLE_IDS: 60 * 60 * 24 * 7, // 7 days
    ANIME_CHARACTER_IDS: 60 * 60 * 24 * 7, // 7 days
    ANIME_MANGA_IDS: 60 * 60 * 24 * 7, // 7 days
    ANILIST_CHARACTER: 60 * 60 * 24 * 30, // 30 days
    ANILIST_SEARCH: 60 * 60, // 1 hour
    ANILIST_ANIME_CHARACTERS: 60 * 60 * 24, // 24 hours
    ANILIST_MANGA_CHARACTERS: 60 * 60 * 24, // 24 hours
    VSBATTLES: 60 * 60 * 24, // 24 hours
    SCHEDULE: 60 * 60 * 12, // 12 hours
    AIRING_SCHEDULE: 60 * 60, // 1 hour
} as const;

export async function invalidateOgImageCache(uuid: string): Promise<number> {
    const redis = getRedis();
    const pattern = `og:${uuid}:*`;
    let deletedCount = 0;
    let cursor = "0";

    do {
        const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
        cursor = nextCursor;

        if (keys.length > 0) {
            const deleted = await redis.del(...keys);
            deletedCount += deleted;
        }
    } while (cursor !== "0");

    return deletedCount;
}
