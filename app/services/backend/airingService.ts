import { getRedis, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";
import { fetchAiringSchedules } from "@/lib/anilist";
import { AiringScheduleResponse } from "@/types/airing";

export async function getAiringSchedule(): Promise<AiringScheduleResponse> {
    const redis = getRedis();

    try {
        const cached = await redis.get(REDIS_KEYS.AIRING_SCHEDULE);
        if (cached) {
            return JSON.parse(cached) as AiringScheduleResponse;
        }
    } catch (error) {
        console.error("[AiringService] Failed to read the cached airing schedule:", error);
    }

    const { airing, airedToday } = await fetchAiringSchedules();
    const result: AiringScheduleResponse = { airing, airedToday, fetchedAt: new Date().toISOString() };

    if (airing.length === 0 && airedToday.length === 0) {
        console.warn("[AiringService] AniList returned no schedules, refusing to cache an empty airing schedule");
        return result;
    }

    try {
        await redis.setex(REDIS_KEYS.AIRING_SCHEDULE, REDIS_TTL.AIRING_SCHEDULE, JSON.stringify(result));
    } catch (error) {
        console.error("[AiringService] Failed to cache the airing schedule:", error);
    }

    return result;
}
