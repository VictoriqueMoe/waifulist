import { getRedis, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";
import { fetchScheduleFromJikan } from "@/lib/jikanApi";
import { DayFilter, DayOfWeek, DAYS_OF_WEEK, ScheduleAnime, ScheduleByDay, ScheduleResponse } from "@/types/schedule";
import { scrapeSchedule } from "./scraper";

const WEEKDAYS: DayFilter[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function createEmptySchedule(): ScheduleByDay {
    const schedule: ScheduleByDay = {} as ScheduleByDay;
    for (const day of DAYS_OF_WEEK) {
        schedule[day] = [];
    }
    return schedule;
}

function hasData(schedule: ScheduleByDay): boolean {
    for (const day of DAYS_OF_WEEK) {
        if (schedule[day] && schedule[day].length > 0) {
            return true;
        }
    }
    return false;
}

async function fetchFromJikan(): Promise<ScheduleByDay> {
    const schedule = createEmptySchedule();

    for (const day of WEEKDAYS) {
        try {
            const animeList = await fetchScheduleFromJikan(day);
            if (animeList.length > 0) {
                schedule[day as DayOfWeek] = animeList as ScheduleAnime[];
            }
        } catch (error) {
            console.error(`[ScheduleService] Failed to fetch ${day} from Jikan:`, error);
        }
    }

    return schedule;
}

export async function getSchedule(): Promise<ScheduleResponse> {
    const redis = getRedis();
    try {
        const cached = await redis.get(REDIS_KEYS.SCHEDULE);
        if (cached) {
            console.log("[ScheduleService] Returning cached schedule");
            return JSON.parse(cached) as ScheduleResponse;
        }
    } catch (error) {
        console.error("[ScheduleService] Failed to get cached schedule:", error);
    }
    const scraped = await scrapeSchedule();
    let schedule: ScheduleByDay;

    if (scraped && hasData(scraped)) {
        console.log("[ScheduleService] Using scraped MAL data");
        schedule = scraped;
    } else {
        console.log("[ScheduleService] Scraper returned empty, falling back to Jikan");
        schedule = await fetchFromJikan();
    }

    for (const day of DAYS_OF_WEEK) {
        if (!schedule[day]) {
            schedule[day] = [];
        }
    }

    const response: ScheduleResponse = {
        schedule,
        lastUpdated: new Date().toISOString(),
    };

    try {
        await redis.setex(REDIS_KEYS.SCHEDULE, REDIS_TTL.SCHEDULE, JSON.stringify(response));
        console.log("[ScheduleService] Cached schedule");
    } catch (error) {
        console.error("[ScheduleService] Failed to cache schedule:", error);
    }

    return response;
}

export async function refreshSchedule(): Promise<ScheduleResponse> {
    const redis = getRedis();
    await redis.del(REDIS_KEYS.SCHEDULE);
    return getSchedule();
}
