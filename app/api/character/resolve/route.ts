import { NextRequest, NextResponse } from "next/server";
import { resolveCharacterMalId } from "@/services/characterLookupService";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name");
    const animeId = searchParams.get("animeId");

    if (!name || !animeId) {
        return NextResponse.json({ error: "Missing name or animeId parameter" }, { status: 400 });
    }

    const animeIdNum = parseInt(animeId, 10);
    if (isNaN(animeIdNum)) {
        return NextResponse.json({ error: "Invalid animeId" }, { status: 400 });
    }

    const result = await resolveCharacterMalId(name, animeIdNum);
    return NextResponse.json(result);
}
