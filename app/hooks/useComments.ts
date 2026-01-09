"use client";

import { useCallback, useEffect, useState } from "react";
import { TierListComment } from "@/types/tierlist";
import {
    CommentsResponse,
    deleteCommentApi,
    fetchComments,
    postComment,
    toggleReactionApi,
} from "@/services/tierListClientService";

export function useComments(publicId: string) {
    const [comments, setComments] = useState<TierListComment[]>([]);
    const [commentsEnabled, setCommentsEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadComments = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data: CommentsResponse = await fetchComments(publicId);
            setComments(data.comments);
            setCommentsEnabled(data.commentsEnabled);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load comments");
        } finally {
            setLoading(false);
        }
    }, [publicId]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const addComment = useCallback(
        async (content: string, turnstileToken: string): Promise<TierListComment | null> => {
            try {
                const comment = await postComment(publicId, content.trim(), turnstileToken);
                setComments(prev => [...prev, comment]);
                return comment;
            } catch (err) {
                throw err;
            }
        },
        [publicId],
    );

    const deleteComment = useCallback(
        async (commentId: number) => {
            try {
                await deleteCommentApi(publicId, commentId);
                setComments(prev => prev.filter(c => c.id !== commentId));
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to delete comment");
            }
        },
        [publicId],
    );

    const toggleReaction = useCallback(
        async (commentId: number, emoji: string, username: string) => {
            try {
                const result = await toggleReactionApi(publicId, commentId, emoji);
                setComments(prev =>
                    prev.map(comment => {
                        if (comment.id !== commentId) {
                            return comment;
                        }

                        const existingIndex = comment.reactions.findIndex(r => r.emoji === emoji);
                        let newReactions = [...comment.reactions];

                        if (result.added) {
                            if (existingIndex >= 0) {
                                const existing = newReactions[existingIndex];
                                newReactions[existingIndex] = {
                                    ...existing,
                                    count: existing.count + 1,
                                    userReacted: true,
                                    users: [...existing.users, username].slice(0, 10),
                                };
                            } else {
                                newReactions.push({ emoji, count: 1, userReacted: true, users: [username] });
                            }
                        } else {
                            if (existingIndex >= 0) {
                                const existing = newReactions[existingIndex];
                                const newCount = existing.count - 1;
                                if (newCount <= 0) {
                                    newReactions = newReactions.filter(r => r.emoji !== emoji);
                                } else {
                                    newReactions[existingIndex] = {
                                        ...existing,
                                        count: newCount,
                                        userReacted: false,
                                        users: existing.users.filter(u => u !== username),
                                    };
                                }
                            }
                        }

                        return { ...comment, reactions: newReactions };
                    }),
                );
                return result;
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to toggle reaction");
                throw err;
            }
        },
        [publicId],
    );

    return {
        comments,
        commentsEnabled,
        loading,
        error,
        setError,
        addComment,
        deleteComment,
        toggleReaction,
        reload: loadComments,
    };
}
