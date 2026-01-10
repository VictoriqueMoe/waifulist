import { NextRequest, NextResponse } from "next/server";
import { getCharactersByMedia } from "@/services/anilistData";

interface RouteParams {
    params: Promise<{ type: string; malId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const { type, malId: malIdStr } = await params;

    if (type !== "anime" && type !== "manga") {
        return NextResponse.json({ error: "Invalid media type. Must be 'anime' or 'manga'" }, { status: 400 });
    }

    const malId = parseInt(malIdStr, 10);
    if (isNaN(malId) || malId <= 0) {
        return NextResponse.json({ error: "Invalid MAL ID" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = Math.min(parseInt(searchParams.get("perPage") || "20", 10), 50);

    try {
        const result = await getCharactersByMedia(malId, type, page, perPage);
        return NextResponse.json(result);
    } catch (error) {
        console.error(`[Characters by ${type}] Error:`, error);
        const message = error instanceof Error ? error.message : "Failed to fetch characters";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
