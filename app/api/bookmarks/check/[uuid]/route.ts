import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserByPublicId, hasBookmark } from "@/lib/db";

interface RouteParams {
    params: Promise<{ uuid: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ isBookmarked: false });
    }

    const { uuid } = await params;
    const targetUser = getUserByPublicId(uuid);
    if (!targetUser) {
        return NextResponse.json({ isBookmarked: false });
    }

    const isBookmarked = hasBookmark(user.id, targetUser.id);
    return NextResponse.json({ isBookmarked });
}
