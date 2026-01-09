"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Turnstile } from "@/components/Turnstile/Turnstile";
import { REACTION_EMOJIS, TierListComment } from "@/types/tierlist";
import { deleteCommentApi, fetchComments, postComment, toggleReactionApi } from "@/services/tierListClientService";
import styles from "./CommentsSection.module.scss";

interface CommentsSectionProps {
    publicId: string;
    isOwner: boolean;
}

export function CommentsSection({ publicId, isOwner }: CommentsSectionProps) {
    const { user, loading: authLoading } = useAuth();
    const [comments, setComments] = useState<TierListComment[]>([]);
    const [commentsEnabled, setCommentsEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [showTurnstile, setShowTurnstile] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const isSubmittingRef = useRef(false);

    const loadComments = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchComments(publicId);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !content.trim()) {
            return;
        }

        if (!turnstileToken) {
            setShowTurnstile(true);
            return;
        }

        if (isSubmittingRef.current) {
            return;
        }
        isSubmittingRef.current = true;
        setSubmitting(true);
        setSubmitError(null);

        try {
            const comment = await postComment(publicId, content.trim(), turnstileToken);
            setComments(prev => [...prev, comment]);
            setContent("");
            setTurnstileToken(null);
            setShowTurnstile(false);
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Failed to post comment");
            setTurnstileToken(null);
            setShowTurnstile(false);
        } finally {
            setSubmitting(false);
            isSubmittingRef.current = false;
        }
    };

    const handleDelete = async (commentId: number) => {
        try {
            await deleteCommentApi(publicId, commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete comment");
        }
    };

    const [openPicker, setOpenPicker] = useState<number | null>(null);

    const handleReaction = async (commentId: number, emoji: string) => {
        if (!user) {
            return;
        }

        setOpenPicker(null);

        try {
            const result = await toggleReactionApi(publicId, commentId, emoji);
            setComments(prev =>
                prev.map(comment => {
                    if (comment.id !== commentId) {
                        return comment;
                    }

                    const existingIndex = comment.reactions.findIndex(r => r.emoji === emoji);
                    let newReactions = [...comment.reactions];
                    const username = user.username;

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
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to toggle reaction");
        }
    };

    const getReactionTooltip = (users: string[], count: number) => {
        if (users.length === 0) {
            return "";
        }
        if (count <= users.length) {
            return users.join(", ");
        }
        return `${users.join(", ")} and ${count - users.length} more`;
    };

    const handleTurnstileVerify = useCallback((token: string) => {
        setTurnstileToken(token);
        setTimeout(() => {
            formRef.current?.requestSubmit();
        }, 100);
    }, []);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + "Z");
        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading || authLoading) {
        return (
            <div className={styles.section}>
                <h3 className={styles.title}>
                    <i className="bi bi-chat" />
                    Comments
                </h3>
                <div className={styles.loading}>Loading comments...</div>
            </div>
        );
    }

    if (!commentsEnabled) {
        return (
            <div className={styles.section}>
                <h3 className={styles.title}>
                    <i className="bi bi-chat-slash" />
                    Comments
                </h3>
                <p className={styles.disabled}>Comments are disabled for this tier list.</p>
            </div>
        );
    }

    return (
        <div className={styles.section}>
            <h3 className={styles.title}>
                <i className="bi bi-chat" />
                Comments ({comments.length})
            </h3>

            {error && <div className={styles.error}>{error}</div>}

            {user ? (
                <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
                    <textarea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Write a comment..."
                        className={styles.textarea}
                        maxLength={1000}
                        disabled={submitting}
                    />
                    {submitError && <div className={styles.submitError}>{submitError}</div>}
                    {showTurnstile && !turnstileToken && (
                        <div className={styles.turnstileContainer}>
                            <Turnstile onVerify={handleTurnstileVerify} />
                        </div>
                    )}
                    <button type="submit" className={styles.submitBtn} disabled={!content.trim() || submitting}>
                        {submitting ? "Posting..." : "Post Comment"}
                    </button>
                </form>
            ) : (
                <p className={styles.signInPrompt}>
                    <Link href="/login">Sign in</Link> to leave a comment.
                </p>
            )}

            <div className={styles.commentsList}>
                {comments.length === 0 ? (
                    <p className={styles.empty}>No comments yet. Be the first to comment!</p>
                ) : (
                    comments.map(comment => {
                        const canDelete = user && (user.id === comment.userId || isOwner);
                        return (
                            <div key={comment.id} className={styles.comment}>
                                <div className={styles.commentHeader}>
                                    <span className={styles.username}>{comment.username}</span>
                                    <span className={styles.date}>{formatDate(comment.createdAt)}</span>
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className={styles.deleteBtn}
                                            title="Delete comment"
                                        >
                                            <i className="bi bi-trash" />
                                        </button>
                                    )}
                                </div>
                                <p className={styles.commentContent}>{comment.content}</p>
                                <div className={styles.reactions}>
                                    {comment.reactions.map(reaction => (
                                        <button
                                            key={reaction.emoji}
                                            className={`${styles.reactionBtn} ${reaction.userReacted ? styles.reacted : ""}`}
                                            onClick={() => user && handleReaction(comment.id, reaction.emoji)}
                                            disabled={!user}
                                            title={getReactionTooltip(reaction.users, reaction.count)}
                                        >
                                            <span>{reaction.emoji}</span>
                                            <span className={styles.reactionCount}>{reaction.count}</span>
                                        </button>
                                    ))}
                                    {user && (
                                        <div className={styles.addReaction}>
                                            <button
                                                className={styles.addReactionBtn}
                                                onClick={() =>
                                                    setOpenPicker(openPicker === comment.id ? null : comment.id)
                                                }
                                                title="Add reaction"
                                            >
                                                <i className="bi bi-emoji-smile" />
                                            </button>
                                            {openPicker === comment.id && (
                                                <div className={styles.emojiPicker}>
                                                    {REACTION_EMOJIS.map(emoji => (
                                                        <button
                                                            key={emoji}
                                                            className={styles.emojiOption}
                                                            onClick={() => handleReaction(comment.id, emoji)}
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
