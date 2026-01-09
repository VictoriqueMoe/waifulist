"use client";

import React, { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTierList } from "@/hooks/useTierList";
import { TierListBuilder } from "@/components/TierList";
import { Spinner } from "@/components/Spinner/Spinner";
import { Button } from "@/components/Button/Button";
import { TierListData } from "@/types/tierlist";
import styles from "./page.module.scss";

export default function EditTierListPage() {
    const router = useRouter();
    const params = useParams();
    const publicId = params.publicId as string;
    const { user, loading: authLoading } = useAuth();
    const { tierList, loading, error, saveStatus, save } = useTierList(publicId);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const handleSave = useCallback(
        async (name: string, data: TierListData) => {
            const success = await save(name, data);
            if (success) {
                router.push("/tierlist");
            }
        },
        [save, router],
    );

    if (authLoading || loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <Spinner text="Loading tier list..." />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.error}>
                        <h2>Error</h2>
                        <p>{error}</p>
                        <Button onClick={() => router.push("/tierlist")}>Go to Tier Lists</Button>
                    </div>
                </div>
            </div>
        );
    }

    if (!tierList) {
        return null;
    }

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                {saveStatus === "saved" && <div className={styles.saveNotification}>Saved!</div>}
                {saveStatus === "error" && <div className={styles.saveNotificationError}>Failed to save</div>}
                <TierListBuilder
                    publicId={publicId}
                    initialName={tierList.name}
                    initialTiers={tierList.tiers}
                    onSave={handleSave}
                    shareUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/tierlist/${publicId}`}
                />
            </div>
        </div>
    );
}
