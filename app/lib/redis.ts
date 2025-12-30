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
            lazyConnect: true,
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
            lazyConnect: true,
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
    LAST_FETCH_TIME: "anime:lastFetchTime",
    REFRESH_CHANNEL: "anime:refresh",
    OG_IMAGE: (uuid: string, hash: string) => `og:${uuid}:${hash}`,
} as const;

export const REDIS_TTL = {
    ANIME_LIST: 60 * 60 * 24 * 7, // 7 days
    ANIME_BY_ID: 60 * 60 * 24, // 24 hours (CDN-fetched)
    OG_IMAGE: 60 * 60, // 1 hour
} as const;
