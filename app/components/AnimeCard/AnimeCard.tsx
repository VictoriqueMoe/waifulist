"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Anime, WatchStatus } from "@/types/anime";
import { useWatchList } from "@/contexts/WatchListContext";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import styles from "./AnimeCard.module.scss";

export interface AnimeCardWatchData {
    status: WatchStatus;
    rating: number | null;
    notes?: string | null;
    dateAdded: string;
}

interface AnimeCardProps {
    anime: Anime;
    showStatus?: boolean;
    watchData?: AnimeCardWatchData | null;
    ratingLabel?: string;
}

function parseUtcDate(dateString: string): Date {
    return new Date(dateString.includes("Z") ? dateString : dateString.replace(" ", "T") + "Z");
}

function formatDateAdded(dateString: string): string {
    const date = parseUtcDate(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return "Today";
    }
    if (diffDays === 1) {
        return "Yesterday";
    }
    if (diffDays < 7) {
        return `${diffDays} days ago`;
    }
    if (diffDays < 30) {
        return `${Math.floor(diffDays / 7)} weeks ago`;
    }
    if (diffDays < 365) {
        return `${Math.floor(diffDays / 30)} months ago`;
    }
    return date.toLocaleDateString();
}

export function AnimeCard({ anime, showStatus = true, watchData: watchDataProp, ratingLabel }: AnimeCardProps) {
    const { getWatchData } = useWatchList();
    const contextWatchData = getWatchData(anime.id);
    const watchData = watchDataProp !== undefined ? watchDataProp : contextWatchData;
    const [showNotePopover, setShowNotePopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    const imageUrl = anime.main_picture?.large || anime.main_picture?.medium || "/placeholder.png";
    const hasNote = watchData?.notes && watchData.notes.trim().length > 0;

    useEffect(() => {
        if (!showNotePopover) {
            return;
        }

        function handleClickOutside(event: MouseEvent) {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setShowNotePopover(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showNotePopover]);

    const handleNoteClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowNotePopover(!showNotePopover);
    };

    return (
        <Link href={`/anime/${anime.id}`} className={styles.card}>
            <div className={styles.imageContainer}>
                <Image
                    src={imageUrl}
                    alt={anime.title}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    className={styles.image}
                    loading="lazy"
                />
                {anime.mean && (
                    <div className={styles.score}>
                        <i className="bi bi-star-fill" />
                        {anime.mean.toFixed(1)}
                    </div>
                )}
                {showStatus && watchData && (
                    <div className={styles.statusBadge}>
                        <StatusBadge status={watchData.status} compact />
                    </div>
                )}
                {hasNote && (
                    <button className={styles.noteBanner} onClick={handleNoteClick} aria-label="View note">
                        <i className="bi bi-journal-text" />
                        <span>Note</span>
                    </button>
                )}
                {showNotePopover && hasNote && (
                    <div ref={popoverRef} className={styles.notePopover} onClick={e => e.preventDefault()}>
                        <div className={styles.notePopoverContent}>{watchData?.notes}</div>
                    </div>
                )}
            </div>
            <div className={styles.info}>
                <h3 className={styles.title}>{anime.title}</h3>
                <div className={styles.meta}>
                    {anime.media_type && <span className={styles.type}>{anime.media_type.toUpperCase()}</span>}
                    {anime.source && <span className={styles.type}>{anime.source.toUpperCase()}</span>}
                </div>
                <div className={styles.episodes}>{anime.num_episodes ? `${anime.num_episodes} eps` : "N/A"}</div>
                {watchData && (
                    <div className={styles.dateAdded} title={parseUtcDate(watchData.dateAdded).toLocaleString()}>
                        <i className="bi bi-calendar-plus" />
                        {formatDateAdded(watchData.dateAdded)}
                    </div>
                )}
                {watchData?.rating != null && watchData.rating !== 0 && (
                    <div className={styles.userRatingContainer}>
                        {ratingLabel && <span className={styles.ratingLabel}>{ratingLabel}</span>}
                        <div
                            className={`${styles.userRating} ${watchData.rating === 6 ? styles.masterpiece : ""} ${watchData.rating === -1 ? styles.dogshit : ""}`}
                            title={
                                watchData.rating === 6
                                    ? "Masterpiece"
                                    : watchData.rating === -1
                                      ? "Dogshit"
                                      : `${watchData.rating}/5`
                            }
                        >
                            {watchData.rating === 6 ? (
                                <>
                                    <i className="bi bi-star-fill" />
                                    <span>Masterpiece</span>
                                </>
                            ) : watchData.rating === -1 ? (
                                <span>💩</span>
                            ) : (
                                [...Array(5)].map((_, i) => (
                                    <i key={i} className={`bi bi-star${i < watchData.rating! ? "-fill" : ""}`} />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Link>
    );
}
