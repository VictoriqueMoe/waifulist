import { NextRequest, NextResponse } from "next/server";
import { getRedis, REDIS_KEYS } from "@/lib/redis";
import { RateLimitType } from "@/types/rateLimit";
import { getClientIP } from "@/lib/ipUtils";

const RATE_LIMITS: Record<RateLimitType, Record<string, number>> = {
    page: { requests: 60, window: 60 },
    api: { requests: 120, window: 60 },
} as const;

async function checkRateLimit(
    ip: string,
    type: RateLimitType,
): Promise<{ allowed: boolean; remaining: number; resetIn: number; limit: number }> {
    const redis = getRedis();
    const { requests, window } = RATE_LIMITS[type];
    const key = REDIS_KEYS.RATE_LIMIT(ip, type);

    const count = await redis.incr(key);

    if (count === 1) {
        await redis.expire(key, window);
    }

    const ttl = await redis.ttl(key);
    const resetIn = ttl > 0 ? ttl : window;

    if (count > requests) {
        return { allowed: false, remaining: 0, resetIn, limit: requests };
    }

    return { allowed: true, remaining: requests - count, resetIn, limit: requests };
}

export async function proxy(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;
    const rscHeader = request.headers.get("rsc") || request.headers.get("Rsc") || request.headers.get("RSC");
    const hasRscParam = searchParams.has("_rsc") || request.nextUrl.search.includes("_rsc=");

    const nextUrl = request.headers.get("next-url");
    const isPrefetch = nextUrl !== null && nextUrl !== pathname;
    const isAuthEndpoint = pathname.startsWith("/api/auth/");
    const ip = getClientIP(request);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-request-page", pathname);

    const isRsc = hasRscParam || rscHeader === "1";
    if (isRsc) {
        requestHeaders.set("x-request-rsc", "1");
    }
    if (isPrefetch) {
        requestHeaders.set("x-request-prefetch", "1");
    }

    if (isRsc || isPrefetch || isAuthEndpoint) {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }
    const type: RateLimitType = pathname.startsWith("/api/") ? "api" : "page";
    const { allowed, remaining, resetIn, limit } = await checkRateLimit(ip, type);

    if (!allowed) {
        console.warn(
            `[RateLimit] ${type} limit exceeded | IP: ${ip} | URL: ${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`,
        );
        return new NextResponse("Too Many Requests", {
            status: 429,
            headers: {
                "Retry-After": String(resetIn),
                "X-RateLimit-Limit": String(limit),
                "X-RateLimit-Remaining": "0",
            },
        });
    }

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("X-RateLimit-Limit", String(limit));
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    return response;
}

export const config = {
    matcher: ["/anime/:path*", "/character/:path*", "/person/:path*", "/api/:path*"],
};
