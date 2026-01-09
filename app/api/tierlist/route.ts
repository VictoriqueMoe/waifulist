import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseError } from "@/lib/db";
import { createUserTierList, getUserTierLists } from "@/services/tierListService";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const tierLists = getUserTierLists(user.id);
    return NextResponse.json({ tierLists });
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const name = body.name || "My Tier List";

        const tierList = createUserTierList(user.id, name);
        return NextResponse.json({ tierList }, { status: 201 });
    } catch (error) {
        console.error("[TierList] Create error:", error);
        if (error instanceof DatabaseError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to create tier list" }, { status: 500 });
    }
}
