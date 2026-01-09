"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTierLists } from "@/hooks/useTierList";
import { Spinner } from "@/components/Spinner/Spinner";
import { Button } from "@/components/Button/Button";
import styles from "./page.module.scss";

export default function TierListsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { tierLists, loading, error, refresh, deleteTierList, toggleVisibility, toggleCommentsEnabled } =
        useTierLists();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const handleDelete = async (publicId: string) => {
        if (!confirm("Are you sure you want to delete this tier list?")) {
            return;
        }

        const success = await deleteTierList(publicId);
        if (!success) {
            alert("Failed to delete tier list");
        }
    };

    const handleToggleVisibility = async (publicId: string, currentlyPublic: boolean) => {
        const success = await toggleVisibility(publicId, !currentlyPublic);
        if (!success) {
            alert("Failed to update visibility");
        }
    };

    const handleToggleComments = async (publicId: string, currentlyEnabled: boolean) => {
        const success = await toggleCommentsEnabled(publicId, !currentlyEnabled);
        if (!success) {
            alert("Failed to update comments setting");
        }
    };

    if (authLoading || loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <Spinner text="Loading tier lists..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.error}>
                        <p>{error}</p>
                        <Button onClick={refresh}>Try Again</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>My Tier Lists</h1>
                    <Button onClick={() => router.push("/tierlist/create")}>
                        <i className="bi bi-plus-lg" /> Create New
                    </Button>
                </div>

                {tierLists.length === 0 ? (
                    <div className={styles.empty}>
                        <i className="bi bi-list-ol" />
                        <p>You haven&apos;t created any tier lists yet.</p>
                        <Button onClick={() => router.push("/tierlist/create")}>Create Your First Tier List</Button>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {tierLists.map(tierList => (
                            <div key={tierList.publicId} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <h3>{tierList.name}</h3>
                                    <span className={styles.count}>{tierList.characterCount} characters</span>
                                </div>
                                <div className={styles.cardMeta}>
                                    <span>Updated {formatDate(tierList.updatedAt)}</span>
                                </div>
                                <div className={styles.cardActions}>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => router.push(`/tierlist/${tierList.publicId}/edit`)}
                                    >
                                        <i className="bi bi-pencil" /> Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.push(`/tierlist/${tierList.publicId}`)}
                                    >
                                        <i className="bi bi-eye" /> View
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleDelete(tierList.publicId)}>
                                        <i className="bi bi-trash" />
                                    </Button>
                                </div>
                                <div className={styles.cardToggles}>
                                    <button
                                        className={`${styles.visibilityButton} ${tierList.isPublic ? styles.public : ""}`}
                                        onClick={() => handleToggleVisibility(tierList.publicId, tierList.isPublic)}
                                        title={
                                            tierList.isPublic
                                                ? "Public - click to make private"
                                                : "Private - click to make public"
                                        }
                                    >
                                        <i className={`bi ${tierList.isPublic ? "bi-globe" : "bi-lock"}`} />
                                        <span>{tierList.isPublic ? "Public" : "Private"}</span>
                                    </button>
                                    <button
                                        className={`${styles.commentsButton} ${tierList.commentsEnabled ? styles.enabled : ""}`}
                                        onClick={() =>
                                            handleToggleComments(tierList.publicId, tierList.commentsEnabled)
                                        }
                                        title={
                                            tierList.commentsEnabled
                                                ? "Comments enabled - click to disable"
                                                : "Comments disabled - click to enable"
                                        }
                                    >
                                        <i className={`bi ${tierList.commentsEnabled ? "bi-chat" : "bi-chat-slash"}`} />
                                        <span>
                                            {tierList.commentsEnabled ? "Comments enabled" : "Comments disabled"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
