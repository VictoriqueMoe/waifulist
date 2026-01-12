"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./SubscribeButton.module.scss";

interface SubscribeButtonProps {
    malId: number;
    title: string;
    isSubscribed: boolean;
    onSubscribe: (malId: number, title: string) => Promise<boolean>;
    onUnsubscribe: (malId: number) => Promise<boolean>;
    size?: "small" | "medium";
}

export function SubscribeButton({
    malId,
    title,
    isSubscribed,
    onSubscribe,
    onUnsubscribe,
    size = "small",
}: SubscribeButtonProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            return;
        }

        setLoading(true);
        try {
            if (isSubscribed) {
                await onUnsubscribe(malId);
            } else {
                await onSubscribe(malId, title);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <button
            className={`subscribeButton ${styles.subscribeButton} ${isSubscribed ? `subscribed ${styles.subscribed}` : ""} ${styles[size]}`}
            onClick={handleClick}
            disabled={loading}
            title={isSubscribed ? "Unsubscribe" : "Subscribe"}
        >
            <i className={`bi ${isSubscribed ? "bi-bell-fill" : "bi-bell"}`} />
        </button>
    );
}
