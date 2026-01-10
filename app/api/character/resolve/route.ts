import { NextRequest, NextResponse } from "next/server";
import { resolveCharacterMalId } from "@/services/characterLookupService";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name");
    const mediaId = searchParams.get("mediaId") || searchParams.get("animeId");
    const type = searchParams.get("type") as "anime" | "manga" | null;

    if (!name || !mediaId) {
        return NextResponse.json({ error: "Missing name or mediaId parameter" }, { status: 400 });
    }

    const mediaIdNum = parseInt(mediaId, 10);
    if (isNaN(mediaIdNum)) {
        return NextResponse.json({ error: "Invalid mediaId" }, { status: 400 });
    }

    const mediaType = type === "manga" ? "manga" : "anime";
    const result = await resolveCharacterMalId(name, mediaIdNum, mediaType);
    return NextResponse.json(result);
}
