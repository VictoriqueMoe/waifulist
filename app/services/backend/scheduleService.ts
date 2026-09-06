import { getRedis, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";
import { fetchUpcomingAiringSchedule } from "@/lib/anilist";
import { ScheduleResponse } from "@/types/schedule";

async function fetchAndCacheSchedule(): Promise<ScheduleResponse> {
    const airing = await fetchUpcomingAiringSchedule();
    const response: ScheduleResponse = { airing, lastUpdated: new Date().toISOString() };

    try {
        await getRedis().setex(REDIS_KEYS.SCHEDULE, REDIS_TTL.SCHEDULE, JSON.stringify(response));
    } catch (error) {
        console.error("[ScheduleService] Failed to cache the schedule:", error);
    }

    return response;
}

export async function getSchedule(): Promise<ScheduleResponse> {
    try {
        const cached = await getRedis().get(REDIS_KEYS.SCHEDULE);
        if (cached) {
            return JSON.parse(cached) as ScheduleResponse;
        }
    } catch (error) {
        console.error("[ScheduleService] Failed to read the cached schedule:", error);
    }

    return fetchAndCacheSchedule();
}

export async function refreshSchedule(): Promise<ScheduleResponse> {
    return fetchAndCacheSchedule();
}
