import {
    TraceApiError,
    TraceMoeResponse,
    TraceRateLimitInfo,
    TraceSearchOptions,
    TraceSearchResult,
} from "@/types/traceMoe";

const TRACE_MOE_API = "https://api.trace.moe/search";

function parseRateLimitHeaders(headers: Headers): TraceRateLimitInfo | null {
    const limit = headers.get("x-ratelimit-limit");
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");

    if (limit && remaining && reset) {
        return {
            limit: parseInt(limit, 10),
            remaining: parseInt(remaining, 10),
            reset: parseInt(reset, 10),
        };
    }
    return null;
}

function getErrorCode(status: number, errorMessage: string): TraceApiError["code"] {
    if (status === 429) {
        return "RATE_LIMITED";
    }
    if (status === 402) {
        if (errorMessage.toLowerCase().includes("concurrency")) {
            return "CONCURRENCY_LIMIT";
        }
        return "QUOTA_EXCEEDED";
    }
    if (status >= 500) {
        return "SERVER_ERROR";
    }
    return "UNKNOWN";
}

function getUserFriendlyError(code: TraceApiError["code"], retryAfter?: number): string {
    switch (code) {
        case "RATE_LIMITED":
            return retryAfter
                ? `Rate limited. Please wait ${retryAfter} seconds before trying again.`
                : "Rate limited. Please wait a moment before trying again.";
        case "QUOTA_EXCEEDED":
            return "Monthly search quota exceeded. The free tier allows 1000 searches per month.";
        case "CONCURRENCY_LIMIT":
            return "Server is busy processing another request. Please wait a moment and try again.";
        case "SERVER_ERROR":
            return "trace.moe server is experiencing issues. Please try again later.";
        default:
            return "An unexpected error occurred. Please try again.";
    }
}

export async function searchByImage(
    imageData: Uint8Array,
    contentType: string,
    options?: TraceSearchOptions,
): Promise<TraceSearchResult> {
    const params = new URLSearchParams();
    params.set("anilistInfo", "");
    if (options?.cutBorders) {
        params.set("cutBorders", "");
    }

    const response = await fetch(`${TRACE_MOE_API}?${params.toString()}`, {
        method: "POST",
        body: imageData as BodyInit,
        headers: {
            "Content-Type": contentType,
        },
    });

    const rateLimit = parseRateLimitHeaders(response.headers);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        const errorMessage = errorData.error || `trace.moe API error: ${response.status}`;
        const code = getErrorCode(response.status, errorMessage);

        const retryAfter =
            response.status === 429
                ? rateLimit?.reset
                    ? rateLimit.reset - Math.floor(Date.now() / 1000)
                    : 60
                : undefined;

        const apiError: TraceApiError = {
            error: getUserFriendlyError(code, retryAfter),
            code,
            retryAfter,
        };

        throw apiError;
    }

    const data: TraceMoeResponse = await response.json();
    return { response: data, rateLimit };
}

export function formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatSimilarity(similarity: number): string {
    return `${(similarity * 100).toFixed(1)}%`;
}
