"use client";

import React from "react";
import { ANILIST_FAILURE_COPY, AniListFailureReason } from "@/types/anilist";
import styles from "./UpstreamError.module.scss";

interface UpstreamErrorProps {
    title: string;
    message: string | null;
    reason?: AniListFailureReason | null;
    detail?: string | null;
    onRetry?: () => void;
}

export function UpstreamError({ title, message, reason, detail, onRetry }: UpstreamErrorProps) {
    const copy = reason ? ANILIST_FAILURE_COPY[reason] : null;
    const heading = copy?.title ?? title;
    const body = copy?.description ?? message;
    const icon = reason === "disabled" ? "bi-plug" : reason === "rate_limited" ? "bi-hourglass-top" : "bi-cloud-slash";

    return (
        <div className={styles.container}>
            <i className={`bi ${reason ? icon : "bi-exclamation-triangle"}`} />
            <h3>{heading}</h3>
            {body && <p className={styles.message}>{body}</p>}
            {detail && <p className={styles.detail}>AniList replied: {detail}</p>}
            {onRetry && (
                <button type="button" className={styles.retry} onClick={onRetry}>
                    <i className="bi bi-arrow-clockwise" />
                    <span>Try again</span>
                </button>
            )}
        </div>
    );
}
