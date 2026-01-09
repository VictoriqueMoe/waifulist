import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseError, deleteComment, getCommentById, getTierListByPublicId } from "@/lib/db";

interface RouteParams {
    params: Promise<{ publicId: string; commentId: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "You must be logged in to delete comments" }, { status: 401 });
    }

    const { publicId, commentId } = await params;
    const commentIdNum = parseInt(commentId, 10);

    if (isNaN(commentIdNum)) {
        return NextResponse.json({ error: "Invalid comment ID" }, { status: 400 });
    }

    const tierList = getTierListByPublicId(publicId);
    if (!tierList) {
        return NextResponse.json({ error: "Tier list not found" }, { status: 404 });
    }

    const comment = getCommentById(commentIdNum);
    if (!comment) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    if (comment.tier_list_id !== tierList.id) {
        return NextResponse.json({ error: "Comment does not belong to this tier list" }, { status: 400 });
    }

    const isOwner = tierList.user_id === user.id;
    const isCommentAuthor = comment.user_id === user.id;

    if (!isOwner && !isCommentAuthor) {
        return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
    }

    try {
        const deleted = deleteComment(commentIdNum, user.id, tierList.user_id);
        if (!deleted) {
            return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Comments] Delete error:", error);
        if (error instanceof DatabaseError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
    }
}
