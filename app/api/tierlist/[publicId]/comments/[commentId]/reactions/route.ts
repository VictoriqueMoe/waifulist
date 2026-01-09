import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCommentById, toggleReaction } from "@/lib/db";
import { REACTION_EMOJIS } from "@/types/tierlist";

interface RouteParams {
    params: Promise<{ publicId: string; commentId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "You must be logged in to react" }, { status: 401 });
    }

    const { commentId } = await params;
    const commentIdNum = parseInt(commentId, 10);

    if (isNaN(commentIdNum)) {
        return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
    }

    const comment = getCommentById(commentIdNum);
    if (!comment) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    try {
        const body = await request.json();
        const { emoji } = body;

        if (!emoji || !REACTION_EMOJIS.includes(emoji)) {
            return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
        }

        const added = toggleReaction(commentIdNum, user.id, emoji);
        return NextResponse.json({ added, emoji });
    } catch {
        return NextResponse.json({ error: "Failed to toggle reaction" }, { status: 500 });
    }
}
