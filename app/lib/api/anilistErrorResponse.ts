import { NextResponse } from "next/server";
import { AniListUnavailableError } from "@/lib/anilist";
import { ANILIST_FAILURE_COPY, AniListErrorBody } from "@/types/anilist";

export function anilistErrorResponse(error: unknown): NextResponse | null {
    if (!(error instanceof AniListUnavailableError)) {
        return null;
    }

    const body: AniListErrorBody = {
        error: ANILIST_FAILURE_COPY[error.reason].description,
        source: "anilist",
        reason: error.reason,
        upstreamMessage: error.upstreamMessage,
    };

    return NextResponse.json(body, {
        status: 503,
        headers: {
            "Retry-After": "300",
            "Cache-Control": "no-store",
        },
    });
}
