"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Anime, WatchStatus } from "@/types/anime";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchList } from "@/contexts/WatchListContext";
import { Button } from "@/components/Button/Button";
import { Pill } from "@/components/Pill/Pill";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import styles from "./page.module.scss";

interface AnimePageClientProps {
    anime: Anime;
}

const statusOptions: WatchStatus[] = ["watching", "plan_to_watch", "completed", "on_hold", "dropped"];
const MAX_NOTE_LENGTH = 500;

export function AnimePageClient({ anime }: AnimePageClientProps) {
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [localNoteText, setLocalNoteText] = useState<string | null>(null);
    const [noteSaved, setNoteSaved] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { user } = useAuth();
    const { getWatchData, addToWatchList, updateWatchStatus, removeFromWatchList, isInWatchList, ensureLoaded } =
        useWatchList();

    useEffect(() => {
        ensureLoaded();
    }, [ensureLoaded]);

    const watchData = user ? getWatchData(anime.id) : undefined;

    const noteText = localNoteText !== null ? localNoteText : watchData?.notes || "";

    const saveNote = useCallback(
        (text: string) => {
            const trimmed = text.trim();
            const existingTrimmed = (watchData?.notes || "").trim();
            if (trimmed === existingTrimmed) {
                return;
            }
            updateWatchStatus(anime.id, { notes: trimmed || null });
            setNoteSaved(true);
            if (savedIndicatorTimeoutRef.current) {
                clearTimeout(savedIndicatorTimeoutRef.current);
            }
            savedIndicatorTimeoutRef.current = setTimeout(() => setNoteSaved(false), 2000);
        },
        [anime.id, watchData?.notes, updateWatchStatus],
    );

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value.slice(0, MAX_NOTE_LENGTH);
        setLocalNoteText(text);
        setNoteSaved(false);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => saveNote(text), 500);
    };

    const handleNoteBlur = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        if (noteText !== (watchData?.notes || "")) {
            saveNote(noteText);
        }
    };

    const handleClearNote = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        setLocalNoteText("");
        updateWatchStatus(anime.id, { notes: null });
        setNoteSaved(true);
        if (savedIndicatorTimeoutRef.current) {
            clearTimeout(savedIndicatorTimeoutRef.current);
        }
        savedIndicatorTimeoutRef.current = setTimeout(() => setNoteSaved(false), 2000);
    };

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (savedIndicatorTimeoutRef.current) {
                clearTimeout(savedIndicatorTimeoutRef.current);
            }
        };
    }, []);

    const handleAddToList = (status: WatchStatus) => {
        if (isInWatchList(anime.id)) {
            updateWatchStatus(anime.id, { status });
        } else {
            addToWatchList(anime.id, status);
        }
        setShowStatusMenu(false);
    };

    const handleRemoveFromList = () => {
        removeFromWatchList(anime.id);
        setShowStatusMenu(false);
    };

    const handleEpisodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const episodes = Math.max(0, Math.min(parseInt(e.target.value) || 0, anime.num_episodes || 9999));
        updateWatchStatus(anime.id, { episodesWatched: episodes });
    };

    const handleRatingChange = (rating: number) => {
        updateWatchStatus(anime.id, { rating });
    };

    const imageUrl = anime.main_picture?.large || anime.main_picture?.medium || "/placeholder.png";

    return (
        <div className={styles.page}>
            <div className={styles.backdrop}>
                <Image src={imageUrl} alt="" fill className={styles.backdropImage} />
                <div className={styles.backdropOverlay} />
            </div>

            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.poster}>
                        <Image
                            src={imageUrl}
                            alt={anime.title}
                            width={300}
                            height={450}
                            className={styles.posterImage}
                        />
                    </div>

                    <div className={styles.details}>
                        <div className={styles.titleSection}>
                            <h1 className={styles.title}>{anime.title}</h1>
                            {anime.alternative_titles?.en && anime.alternative_titles.en !== anime.title && (
                                <p className={styles.altTitle}>{anime.alternative_titles.en}</p>
                            )}
                        </div>

                        <div className={styles.meta}>
                            {anime.mean && (
                                <div className={styles.score}>
                                    <i className="bi bi-star-fill" />
                                    <span>{anime.mean.toFixed(2)}</span>
                                </div>
                            )}
                            {anime.media_type && <span className={styles.badge}>{anime.media_type.toUpperCase()}</span>}
                            {anime.status && <span className={styles.badge}>{anime.status.replace(/_/g, " ")}</span>}
                            <span className={styles.badge}>
                                {anime.num_episodes ? `${anime.num_episodes} episodes` : "N/A"}
                            </span>
                            {anime.rating && <span className={styles.badge}>{anime.rating}</span>}
                        </div>

                        {anime.genres && anime.genres.length > 0 && (
                            <div className={styles.genres}>
                                {anime.genres.map(genre => (
                                    <Pill key={genre.id} variant="accent">
                                        {genre.name}
                                    </Pill>
                                ))}
                            </div>
                        )}

                        <div className={styles.actions}>
                            {user ? (
                                <div className={styles.statusDropdown}>
                                    <Button
                                        variant={watchData ? "secondary" : "primary"}
                                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                                    >
                                        {watchData ? (
                                            <>
                                                <StatusBadge status={watchData.status} />
                                                <i className="bi bi-chevron-down" />
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-plus" />
                                                Add to List
                                            </>
                                        )}
                                    </Button>

                                    {showStatusMenu && (
                                        <div className={styles.statusMenu}>
                                            {statusOptions.map(status => (
                                                <button
                                                    key={status}
                                                    className={`${styles.statusOption} ${watchData?.status === status ? styles.active : ""}`}
                                                    onClick={() => handleAddToList(status)}
                                                >
                                                    <StatusBadge status={status} />
                                                </button>
                                            ))}
                                            {watchData && (
                                                <button
                                                    className={`${styles.statusOption} ${styles.remove}`}
                                                    onClick={handleRemoveFromList}
                                                >
                                                    <i className="bi bi-trash" />
                                                    Remove from list
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link href="/login">
                                    <Button variant="primary">
                                        <i className="bi bi-person" />
                                        Sign in to add to list
                                    </Button>
                                </Link>
                            )}
                        </div>

                        {watchData && (
                            <div className={styles.tracking}>
                                {watchData.status !== "completed" && (
                                    <div className={styles.trackingItem}>
                                        <label>Episodes watched</label>
                                        <div className={styles.episodeInput}>
                                            <input
                                                type="number"
                                                min="0"
                                                max={anime.num_episodes || 9999}
                                                value={watchData.episodesWatched}
                                                onChange={handleEpisodeChange}
                                            />
                                            <span>/ {anime.num_episodes || "?"}</span>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.trackingItem}>
                                    <label>Your rating</label>
                                    <div className={styles.ratingInput}>
                                        <button
                                            className={`${styles.star} ${styles.dogshit} ${watchData.rating === -1 ? styles.active : ""}`}
                                            onClick={() => handleRatingChange(watchData.rating === -1 ? 0 : -1)}
                                            title="Dogshit"
                                        >
                                            💩
                                        </button>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                className={`${styles.star} ${(watchData.rating || 0) >= star && watchData.rating !== -1 ? styles.active : ""}`}
                                                onClick={() => handleRatingChange(watchData.rating === star ? 0 : star)}
                                                title={`${star} star${star > 1 ? "s" : ""}`}
                                            >
                                                <i
                                                    className={`bi bi-star${(watchData.rating || 0) >= star && watchData.rating !== -1 ? "-fill" : ""}`}
                                                />
                                            </button>
                                        ))}
                                        <button
                                            className={`${styles.star} ${styles.masterpiece} ${watchData.rating === 6 ? styles.active : ""}`}
                                            onClick={() => handleRatingChange(watchData.rating === 6 ? 0 : 6)}
                                            title="Masterpiece"
                                        >
                                            <i className={`bi bi-star${watchData.rating === 6 ? "-fill" : ""}`} />
                                        </button>
                                        {watchData.rating != null && watchData.rating !== 0 && (
                                            <span className={styles.ratingValue}>
                                                {watchData.rating === 6
                                                    ? "Masterpiece"
                                                    : watchData.rating === -1
                                                      ? "Dogshit"
                                                      : `${watchData.rating}/5`}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.trackingItem}>
                                    <div className={styles.notesHeader}>
                                        <label>Notes</label>
                                        <div className={styles.notesActions}>
                                            {noteSaved && <span className={styles.savedIndicator}>Saved</span>}
                                            {noteText.trim().length > 0 && (
                                                <button
                                                    type="button"
                                                    className={styles.clearNoteButton}
                                                    onClick={handleClearNote}
                                                    title="Clear note"
                                                >
                                                    <i className="bi bi-x-lg" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <textarea
                                        className={styles.notesTextarea}
                                        placeholder="Add a personal note about this anime..."
                                        value={noteText}
                                        onChange={handleNoteChange}
                                        onBlur={handleNoteBlur}
                                        maxLength={MAX_NOTE_LENGTH}
                                        rows={3}
                                    />
                                    <div className={styles.notesFooter}>
                                        <span className={styles.notesHint}>
                                            <i className="bi bi-globe2" /> Visible on your public list
                                        </span>
                                        <span className={styles.charCount}>
                                            {noteText.length}/{MAX_NOTE_LENGTH}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {anime.synopsis && (
                            <div className={styles.synopsis}>
                                <h3>Synopsis</h3>
                                <p>{anime.synopsis}</p>
                            </div>
                        )}

                        <div className={styles.info}>
                            {anime.studios && anime.studios.length > 0 && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Studios</span>
                                    <span className={styles.infoValue}>
                                        {anime.studios.map(s => s.name).join(", ")}
                                    </span>
                                </div>
                            )}
                            {anime.start_date && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Aired</span>
                                    <span className={styles.infoValue}>
                                        {anime.start_date}
                                        {anime.end_date && ` to ${anime.end_date}`}
                                    </span>
                                </div>
                            )}
                            {anime.source && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Source</span>
                                    <span className={styles.infoValue}>{anime.source}</span>
                                </div>
                            )}
                            {anime.rank && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Rank</span>
                                    <span className={styles.infoValue}>#{anime.rank}</span>
                                </div>
                            )}
                            {anime.popularity && (
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Popularity</span>
                                    <span className={styles.infoValue}>#{anime.popularity}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
