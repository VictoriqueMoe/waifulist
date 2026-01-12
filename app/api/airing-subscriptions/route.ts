import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addAiringSubscription, getAiringSubscriptions, removeAiringSubscription } from "@/lib/db";
import { AiringSubscription } from "@/types/subscription";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const rows = getAiringSubscriptions(user.id);
    const subscriptions: AiringSubscription[] = rows.map(row => ({
        id: row.id,
        malId: row.mal_id,
        title: row.title,
        createdAt: row.created_at,
    }));

    return NextResponse.json({ success: true, subscriptions });
}

export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { malId, title } = body;

        if (!malId || !title) {
            return NextResponse.json({ error: "malId and title required" }, { status: 400 });
        }

        const added = addAiringSubscription(user.id, malId, title);
        if (!added) {
            return NextResponse.json({ error: "Already subscribed" }, { status: 409 });
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
        console.error("Add subscription error:", error);
        return NextResponse.json({ error: "Failed to add subscription" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { malId } = body;

        if (!malId) {
            return NextResponse.json({ error: "malId required" }, { status: 400 });
        }

        const removed = removeAiringSubscription(user.id, malId);
        if (!removed) {
            return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Remove subscription error:", error);
        return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
    }
}
