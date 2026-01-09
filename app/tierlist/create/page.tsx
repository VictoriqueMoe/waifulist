"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateTierList } from "@/hooks/useTierList";
import { Spinner } from "@/components/Spinner/Spinner";
import { Button } from "@/components/Button/Button";
import styles from "./page.module.scss";

export default function CreateTierListPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { create, creating, error, reset } = useCreateTierList();

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace("/tierlist/new");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            create().then(tierList => {
                if (tierList) {
                    router.replace(`/tierlist/${tierList.publicId}/edit`);
                }
            });
        }
    }, [user, create, router]);

    const handleRetry = () => {
        reset();
        create().then(tierList => {
            if (tierList) {
                router.replace(`/tierlist/${tierList.publicId}/edit`);
            }
        });
    };

    if (authLoading || creating) {
        return (
            <div className={styles.page}>
                <Spinner text="Creating tier list..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.page}>
                <div className={styles.error}>
                    <h2>Error</h2>
                    <p>{error}</p>
                    <Button onClick={handleRetry}>Try Again</Button>
                </div>
            </div>
        );
    }

    return null;
}
