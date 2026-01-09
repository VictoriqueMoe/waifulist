"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TierListBuilder } from "@/components/TierList";
import { TierListCharacter, TierListData, TierRank } from "@/types/tierlist";
import { useAnonymousTierList } from "@/hooks/useAnonymousTierList";
import styles from "./page.module.scss";

const emptyTiers: Record<TierRank, TierListCharacter[]> = {
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    F: [],
};

export default function NewTierListPage() {
    const router = useRouter();
    const { status, error: errorMessage, createAnonymousTierList } = useAnonymousTierList();

    const handleShare = useCallback(
        async (name: string, data: TierListData) => {
            const result = await createAnonymousTierList(name, data);
            if (result) {
                router.push(`/tierlist/${result.publicId}`);
            }
        },
        [router, createAnonymousTierList],
    );

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {status === "error" && errorMessage && <div className={styles.errorNotification}>{errorMessage}</div>}
                <div className={styles.notice}>
                    <i className="bi bi-info-circle" />
                    <span>
                        You&apos;re creating a tier list as a guest. Your list won&apos;t appear in the{" "}
                        <Link href="/tierlist/browse">browse</Link> section - only people with the link can view it.{" "}
                        <Link href="/login">Sign in</Link> to save, manage, and publicly share your tier lists.
                    </span>
                </div>
                <TierListBuilder
                    initialName="My Tier List"
                    initialTiers={emptyTiers}
                    onSave={handleShare}
                    saveLabel="Share"
                    savingLabel="Sharing..."
                />
            </div>
        </div>
    );
}
