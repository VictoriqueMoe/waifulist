import { cache } from "react";
import { StreamingLink } from "@/types/anime";
import { ScheduleByDay } from "@/types/schedule";
import { scraperManager } from "./manager";
import { ScraperType, StreamingScraperArgs } from "./types";

export const scrapeStreaming = cache((malId: number) => {
    return scraperManager.scrape<StreamingLink, StreamingScraperArgs>(ScraperType.STREAMING, { malId });
});

export const scrapeSchedule = cache(async (): Promise<ScheduleByDay | null> => {
    const results = await scraperManager.scrape<ScheduleByDay, void>(ScraperType.SCHEDULE, undefined);
    return results.length > 0 ? results[0] : null;
});

export type { ScraperEngine, ScraperResult, RateLimitConfig } from "./types";
