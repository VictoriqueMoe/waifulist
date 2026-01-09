import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseError, getTierListByPublicId } from "@/lib/db";
import { deleteUserTierList, getTierListWithCharacters, updateUserTierList } from "@/services/tierListService";
import { TIER_RANKS, TierListData } from "@/types/tierlist";

interface RouteParams {
    params: Promise<{ publicId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const { publicId } = await params;

    const tierList = await getTierListWithCharacters(publicId);
    if (!tierList) {
        return NextResponse.json({ error: "Tier list not found" }, { status: 404 });
    }

    return NextResponse.json({ tierList });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { publicId } = await params;

    const existing = getTierListByPublicId(publicId);
    if (!existing) {
        return NextResponse.json({ error: "Tier list not found" }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
        return NextResponse.json({ error: "Not authorised to edit this tier list" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const updates: { name?: string; data?: TierListData; isPublic?: boolean; commentsEnabled?: boolean } = {};

        if (body.name !== undefined) {
            updates.name = body.name;
        }

        if (body.data !== undefined) {
            if (!isValidTierListData(body.data)) {
                return NextResponse.json({ error: "Invalid tier list data" }, { status: 400 });
            }
            updates.data = body.data;
        }

        if (body.isPublic !== undefined) {
            updates.isPublic = Boolean(body.isPublic);
        }

        if (body.commentsEnabled !== undefined) {
            updates.commentsEnabled = Boolean(body.commentsEnabled);
        }

        const tierList = updateUserTierList(existing.id, user.id, updates);
        return NextResponse.json({ tierList });
    } catch (error) {
        console.error("[TierList] Update error:", error);
        if (error instanceof DatabaseError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to update tier list" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { publicId } = await params;

    const existing = getTierListByPublicId(publicId);
    if (!existing) {
        return NextResponse.json({ error: "Tier list not found" }, { status: 404 });
    }

    if (existing.user_id !== user.id) {
        return NextResponse.json({ error: "Not authorised to delete this tier list" }, { status: 403 });
    }

    try {
        const deleted = deleteUserTierList(existing.id, user.id);
        if (!deleted) {
            return NextResponse.json({ error: "Failed to delete tier list" }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[TierList] Delete error:", error);
        if (error instanceof DatabaseError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to delete tier list" }, { status: 500 });
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
