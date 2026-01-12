import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasAiringSubscription } from "@/lib/db";

interface RouteParams {
    params: Promise<{ malId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ isSubscribed: false });
    }

    const { malId } = await params;
    const malIdNum = parseInt(malId, 10);

    if (isNaN(malIdNum)) {
        return NextResponse.json({ isSubscribed: false });
    }

    const isSubscribed = hasAiringSubscription(user.id, malIdNum);
    return NextResponse.json({ isSubscribed });
}
