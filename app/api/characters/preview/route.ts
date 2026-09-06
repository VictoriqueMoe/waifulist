import { NextRequest, NextResponse } from "next/server";
import { getCharactersForTierList } from "@/services/backend/anilistData";
import { anilistErrorResponse } from "@/lib/api/anilistErrorResponse";

export async function GET(request: NextRequest): Promise<NextResponse> {
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
        return NextResponse.json({ characters: [] });
    }

    const ids = idsParam
        .split(",")
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id));

    if (ids.length === 0) {
        return NextResponse.json({ characters: [] });
    }

    const limitedIds = ids.slice(0, 10);

    try {
        const characters = await getCharactersForTierList(limitedIds);

        return NextResponse.json({
            characters: characters.map(c => ({
                id: c.anilistId,
                name: c.name,
                image: c.image,
            })),
        });
    } catch (error) {
        console.error("[Character Preview] Error:", error);

        const upstream = anilistErrorResponse(error);
        if (upstream) {
            return upstream;
        }

        return NextResponse.json({ error: "Failed to fetch character previews" }, { status: 500 });
    }
}
