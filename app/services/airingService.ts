import { getRedis, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";
import { fetchAiringScheduleFromAniList } from "@/lib/anilist";
import { AiringScheduleResponse } from "@/types/airing";

export async function getAiringSchedule(): Promise<AiringScheduleResponse> {
    const redis = getRedis();

    try {
        const cached = await redis.get(REDIS_KEYS.AIRING_SCHEDULE);
        if (cached) {
            return JSON.parse(cached) as AiringScheduleResponse;
        }
    } catch {}

    const airing = await fetchAiringScheduleFromAniList(3);

    const response: AiringScheduleResponse = {
        airing,
        fetchedAt: new Date().toISOString(),
    };

    try {
        await redis.setex(REDIS_KEYS.AIRING_SCHEDULE, REDIS_TTL.AIRING_SCHEDULE, JSON.stringify(response));
    } catch {}

    return response;
}
