import { NextRequest, NextResponse } from "next/server";
import { createAnonymousTierList, DatabaseError } from "@/lib/db";
import { TIER_RANKS, TierListData } from "@/types/tierlist";

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body = await request.json();
        const name = body.name || "My Tier List";
        const data = body.data;

        if (!data || !isValidTierListData(data)) {
            return NextResponse.json({ error: "Invalid tier list data" }, { status: 400 });
        }

        const tierList = createAnonymousTierList(name, JSON.stringify(data));

        return NextResponse.json({
            publicId: tierList.public_id,
            name: tierList.name,
        });
    } catch (error) {
        console.error("[AnonymousTierList] Create error:", error);
        if (error instanceof DatabaseError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to create tier list" }, { status: 500 });
    }
}

function isValidTierListData(data: unknown): data is TierListData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    for (const rank of TIER_RANKS) {
        if (!(rank in data)) {
            return false;
        }
        const arr = (data as Record<string, unknown>)[rank];
        if (!Array.isArray(arr)) {
            return false;
        }
        for (const item of arr) {
            if (typeof item !== "number") {
                return false;
            }
        }
    }

    return true;
}
