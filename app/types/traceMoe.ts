export type TraceMoeAnilistInfo = {
    id: number;
    idMal: number | null;
    title: {
        native: string | null;
        romaji: string | null;
        english: string | null;
    };
    synonyms: string[];
    isAdult: boolean;
};

export type TraceMoeResult = {
    anilist: TraceMoeAnilistInfo;
    filename: string;
    episode: number | string | null;
    duration: number;
    from: number;
    to: number;
    at: number;
    similarity: number;
    video: string;
    image: string;
};

export type TraceMoeResponse = {
    frameCount: number;
    error: string;
    result: TraceMoeResult[];
};

export type TraceSearchOptions = {
    cutBorders?: boolean;
};

export type TraceRateLimitInfo = {
    limit: number;
    remaining: number;
    reset: number;
};

export type TraceSearchResult = {
    response: TraceMoeResponse;
    rateLimit: TraceRateLimitInfo | null;
};

export type TraceApiError = {
    error: string;
    code: "RATE_LIMITED" | "QUOTA_EXCEEDED" | "CONCURRENCY_LIMIT" | "SERVER_ERROR" | "UNKNOWN";
    retryAfter?: number;
};
