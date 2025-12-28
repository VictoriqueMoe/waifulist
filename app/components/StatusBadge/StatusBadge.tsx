"use client";

import React from "react";
import { WatchStatus, watchStatusLabels } from "@/types/anime";
import styles from "./StatusBadge.module.scss";

interface StatusBadgeProps {
    status: WatchStatus;
    compact?: boolean;
}

const statusIcons: Record<WatchStatus, string> = {
    watching: "bi-play-circle",
    completed: "bi-check-circle",
    plan_to_watch: "bi-clock",
    on_hold: "bi-pause-circle",
    dropped: "bi-x-circle",
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
    return (
        <span className={`${styles.badge} ${styles[status]} ${compact ? styles.compact : ""}`}>
            <i className={`bi ${statusIcons[status]}`} />
            {!compact && <span>{watchStatusLabels[status]}</span>}
        </span>
    );
}
