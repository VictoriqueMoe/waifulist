import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redis: Redis | null = null;
let subscriber: Redis | null = null;

export function getRedis(): Redis {
    if (!redis) {
        redis = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                return Math.min(times * 50, 2000);
            },
        });

        redis.on("error", err => {
            console.error("[Redis] Connection error:", err.message);
        });

        redis.on("connect", () => {
            console.log("[Redis] Connected");
        });
    }
    return redis;
}

export function getSubscriber(): Redis {
    if (!subscriber) {
        subscriber = new Redis(REDIS_URL, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                return Math.min(times * 50, 2000);
            },
        });

        subscriber.on("error", err => {
            console.error("[Redis Subscriber] Connection error:", err.message);
        });
    }
    return subscriber;
}

export async function closeRedis(): Promise<void> {
    if (redis) {
        await redis.quit();
        redis = null;
    }
    if (subscriber) {
        await subscriber.quit();
        subscriber = null;
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
    ANIME_SITEMAP: "anime:sitemap",
    LAST_FETCH_TIME: "anime:lastFetchTime",
    REFRESH_CHANNEL: "anime:refresh",
    OG_IMAGE: (uuid: string, hash: string) => `og:${uuid}:${hash}`,
} as const;

export const REDIS_TTL = {
    ANIME_LIST: 60 * 60 * 24 * 7, // 7 days
    ANIME_BY_ID: 60 * 60 * 24, // 24 hours (CDN-fetched)
    OG_IMAGE: 60 * 60, // 1 hour
    ANIME_SITEMAP: 60 * 60 * 24, // 24 hours
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
