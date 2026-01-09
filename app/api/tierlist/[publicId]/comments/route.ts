import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
    createComment,
    DatabaseError,
    getCommentsByTierListId,
    getReactionsForComments,
    getTierListByPublicId,
} from "@/lib/db";
import { verifyTurnstileToken } from "@/lib/turnstile";

interface RouteParams {
    params: Promise<{ publicId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
    const { publicId } = await params;
    const user = await getCurrentUser();

    const tierList = getTierListByPublicId(publicId);
    if (!tierList) {
        return NextResponse.json({ comments: [], commentsEnabled: false });
    }

    const commentsEnabled = tierList.comments_enabled === 1;
    if (!commentsEnabled) {
        return NextResponse.json({ comments: [], commentsEnabled: false });
    }

    const rows = getCommentsByTierListId(tierList.id);
    const commentIds = rows.map(row => row.id);
    const reactionsMap = getReactionsForComments(commentIds, user?.id ?? null);

    const comments = rows.map(row => ({
        id: row.id,
        tierListId: row.tier_list_id,
        userId: row.user_id,
        username: row.username,
        content: row.content,
        createdAt: row.created_at,
        reactions: reactionsMap.get(row.id) || [],
    }));

    return NextResponse.json({ comments, commentsEnabled: true });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "You must be logged in to comment" }, { status: 401 });
    }

    const { publicId } = await params;

    const tierList = getTierListByPublicId(publicId);
    if (!tierList) {
        return NextResponse.json({ error: "Tier list not found" }, { status: 404 });
    }

    if (tierList.comments_enabled !== 1) {
        return NextResponse.json({ error: "Comments are disabled for this tier list" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { content, turnstileToken } = body;

        if (!content || typeof content !== "string" || content.trim().length === 0) {
            return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
        }

        if (content.length > 1000) {
            return NextResponse.json({ error: "Comment is too long (max 1000 characters)" }, { status: 400 });
        }

        if (!turnstileToken) {
            return NextResponse.json({ error: "Verification token is required" }, { status: 400 });
        }

        const isValidToken = await verifyTurnstileToken(turnstileToken);
        if (!isValidToken) {
            return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
        }

        const row = createComment(tierList.id, user.id, content.trim());
        const comment = {
            id: row.id,
            tierListId: row.tier_list_id,
            userId: row.user_id,
            username: row.username,
            content: row.content,
            createdAt: row.created_at,
            reactions: [],
        };

        return NextResponse.json({ comment });
    } catch (error) {
        console.error("[Comments] Create error:", error);
        if (error instanceof DatabaseError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
    }
}
