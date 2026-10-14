"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Anime, WatchStatus, watchStatusLabels } from "@/types/anime";
import { useWatchList } from "@/contexts/WatchListContext";
import { useTitlePreference } from "@/hooks/useTitlePreference";
import styles from "./AnimeCard.module.scss";
import { formatDate, parseUtcDate } from "@/lib/utils/dateUtils";

export interface AnimeCardWatchData {
    status: WatchStatus;
    rating: number | null;
    notes?: string | null;
    dateAdded: string;
    episodesWatched?: number;
}

interface AnimeCardProps {
    anime: Anime;
    showStatus?: boolean;
    watchData?: AnimeCardWatchData | null;
    ratingLabel?: string;
    showStartDate?: boolean;
    onContextMenu?: (e: React.MouseEvent, animeId: number) => void;
}

function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) {
        return "th";
    }
    switch (day % 10) {
        case 1:
            return "st";
        case 2:
            return "nd";
        case 3:
            return "rd";
        default:
            return "th";
    }
}

function formatStartDate(dateString: string): string {
    const parts = dateString.split("-");
    if (parts.length < 2) {
        return dateString;
    }

    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parts[2] ? parseInt(parts[2], 10) : null;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthName = monthNames[month - 1] || "";

    if (day) {
        return `${day}${getOrdinalSuffix(day)} ${monthName} ${year}`;
    }
    return `${monthName} ${year}`;
}

export function AnimeCard({
    anime,
    showStatus = true,
    watchData: watchDataProp,
    ratingLabel,
    showStartDate = false,
    onContextMenu,
}: AnimeCardProps) {
    const { getWatchData } = useWatchList();
    const { resolveTitles } = useTitlePreference();
    const contextWatchData = getWatchData(anime.mal_id);
    const watchData = watchDataProp !== undefined ? watchDataProp : contextWatchData;
    const [showNotePopover, setShowNotePopover] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [now] = useState(() => Date.now());

    const { mainTitle, subtitle } = resolveTitles({
        title: anime.title,
        titleEnglish: anime.title_english,
    });

    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || "/placeholder.png";
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
        <Link href={`/anime/${anime.mal_id}`} className={styles.card} prefetch={false}>
            <div onContextMenu={onContextMenu ? (e: React.MouseEvent) => onContextMenu(e, anime.mal_id) : undefined}>
                <div className={styles.imageContainer}>
                    <Image
                        src={imageUrl}
                        alt={anime.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                        className={styles.image}
                        loading="lazy"
                    />
                    {anime.score && (
                        <div className={styles.score}>
                            <i className="bi bi-star-fill" />
                            {anime.score.toFixed(1)}
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
                    <div className={styles.titleBlock}>
                        <h3 className={styles.title}>{mainTitle}</h3>
                        {subtitle && (
                            <p className={styles.titleEnglish} title={subtitle}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <div className={styles.meta}>
                        {anime.type && <span className={styles.type}>{anime.type.toUpperCase()}</span>}
                        {anime.source && <span className={styles.type}>{anime.source.toUpperCase()}</span>}
                    </div>
                    {showStatus && watchData && (
                        <span
                            className={`${styles.statusTag} ${styles[watchData.status]}`}
                            title={
                                watchData.status !== "completed" && watchData.episodesWatched
                                    ? `${watchData.episodesWatched} episode${watchData.episodesWatched === 1 ? "" : "s"} watched`
                                    : undefined
                            }
                        >
                            {watchData.status === "completed" ? "Watched" : watchStatusLabels[watchData.status]}
                        </span>
                    )}
                    <div className={styles.episodes}>
                        {anime.episodes
                            ? `${anime.episodes} eps`
                            : anime.status?.toLowerCase().includes("currently")
                              ? "Airing"
                              : anime.status?.toLowerCase().includes("not_yet") || anime.status === "Not yet aired"
                                ? showStartDate
                                    ? "Not aired"
                                    : anime.aired?.from
                                      ? `Airs ${formatStartDate(anime.aired.from)}`
                                      : "Not aired"
                                : "N/A"}
                    </div>
                    {showStartDate && anime.aired?.from && (
                        <div className={styles.dateAdded} title={anime.aired.from}>
                            <i className="bi bi-calendar-event" />
                            <span className={styles.dateLabel}>
                                {Date.parse(anime.aired.from) > now ? "Airs:" : "Aired:"}
                            </span>
                            {formatStartDate(anime.aired.from)}
                        </div>
                    )}
                    {!showStartDate && watchData && (
                        <div className={styles.dateAdded} title={parseUtcDate(watchData.dateAdded).toLocaleString()}>
                            <i className="bi bi-calendar-plus" />
                            <span className={styles.dateLabel}>Added:</span>
                            {formatDate(watchData.dateAdded, true)}
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
            </div>
        </Link>
    );
}
