export interface AiringInfo {
    malId: number;
    anilistId: number;
    title: string;
    titleEnglish: string | null;
    coverImage: string;
    episode: number;
    airingAt: number;
    timeUntilAiring: number;
}

export interface AiringScheduleResponse {
    airing: AiringInfo[];
    fetchedAt: string;
}

export type AiringBucket = "airing_now" | "next_hour" | "today" | "tomorrow" | "this_week" | "later";

export const AIRING_BUCKET_LABELS: Record<AiringBucket, string> = {
    airing_now: "Airing Now",
    next_hour: "Next Hour",
    today: "Today",
    tomorrow: "Tomorrow",
    this_week: "This Week",
    later: "Later",
};

export interface GroupedAiring {
    bucket: AiringBucket;
    items: AiringInfo[];
}
