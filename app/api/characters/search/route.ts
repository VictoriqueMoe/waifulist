import { NextRequest, NextResponse } from "next/server";
import { searchCharacters } from "@/services/anilistData";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = Math.min(parseInt(searchParams.get("perPage") || "20", 10), 50);

    if (!query || query.trim().length === 0) {
        return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    if (query.length < 2) {
        return NextResponse.json({ error: "Search query must be at least 2 characters" }, { status: 400 });
    }

    try {
        const result = await searchCharacters(query.trim(), page, perPage);
        return NextResponse.json(result);
    } catch (error) {
        console.error("[Character Search] Error:", error);
        const message = error instanceof Error ? error.message : "Failed to search characters";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
