import Redis from "ioredis";

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

        globalThis.redis.on("error", err => {
            console.error("[Redis] Connection error:", err.message);
        });

        globalThis.redis.on("connect", () => {
            console.log("[Redis] Connected");
        });
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
    ANIME_SEASON: (year: number, season: string) => `anime:season:${year}:${season}`,
    ANIME_SEASON_COUNT: (year: number, season: string) => `anime:season:${year}:${season}:count`,
    ANIME_SITEMAP: (id: number) => `anime:sitemap:${id}`,
    ANIME_PEOPLE_IDS: "anime:peopleIds",
    ANIME_CHARACTER_IDS: "anime:characterIds",
    LAST_FETCH_TIME: "anime:lastFetchTime",
    REFRESH_CHANNEL: "anime:refresh",
    OG_IMAGE: (uuid: string, hash: string) => `og:${uuid}:${hash}`,
} as const;

export const REDIS_TTL = {
    ANIME_LIST: 60 * 60 * 24 * 7, // 7 days
    JIKAN_ENRICHED_ANIME: 60 * 60 * 24, // 24 hours (CDN-fetched)
    OG_IMAGE: 60 * 60, // 1 hour
    ANIME_SITEMAP: 60 * 60 * 24, // 24 hours
    ANIME_PEOPLE_IDS: 60 * 60 * 24 * 7, // 7 days
    ANIME_CHARACTER_IDS: 60 * 60 * 24 * 7, // 7 days
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
