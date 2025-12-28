"use client";

import React, { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Anime, WatchStatus } from "@/types/anime";
import { getAnimeById } from "@/services/animeService";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchList } from "@/contexts/WatchListContext";
import { Button } from "@/components/Button/Button";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import styles from "./page.module.scss";

interface AnimePageProps {
    params: Promise<{ id: string }>;
}

const statusOptions: WatchStatus[] = ["watching", "plan_to_watch", "completed", "on_hold", "dropped"];

export default function AnimePage({ params }: AnimePageProps) {
    const { id } = use(params);
    const [anime, setAnime] = useState<Anime | null>(null);
    const [loading, setLoading] = useState(true);
    const [showStatusMenu, setShowStatusMenu] = useState(false);

    const { user } = useAuth();
    const { getWatchData, addToWatchList, updateWatchStatus, removeFromWatchList, isInWatchList } = useWatchList();

    const watchData = user ? getWatchData(parseInt(id)) : undefined;

    useEffect(() => {
        async function loadAnime() {
            try {
                const data = await getAnimeById(parseInt(id));
                setAnime(data);
            } catch (error) {
                console.error("Failed to load anime:", error);
            } finally {
                setLoading(false);
            }
        }

        loadAnime();
    }, [id]);

    const handleAddToList = (status: WatchStatus) => {
        if (isInWatchList(parseInt(id))) {
            updateWatchStatus(parseInt(id), { status });
        } else {
            addToWatchList(parseInt(id), status);
        }
        setShowStatusMenu(false);
    };

    const handleRemoveFromList = () => {
        removeFromWatchList(parseInt(id));
        setShowStatusMenu(false);
    };

    const handleEpisodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const episodes = Math.max(0, Math.min(parseInt(e.target.value) || 0, anime?.num_episodes || 9999));
        updateWatchStatus(parseInt(id), { episodesWatched: episodes });
    };

    const handleRatingChange = (rating: number) => {
        updateWatchStatus(parseInt(id), { rating });
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Loading anime...</p>
                </div>
            </div>
        );
    }

    if (!anime) {
        return (
            <div className={styles.page}>
                <div className={styles.error}>
                    <i className="bi bi-exclamation-triangle" />
                    <h2>Anime not found</h2>
                    <p>The anime you&apos;re looking for doesn&apos;t exist.</p>
                    <Button onClick={() => window.history.back()}>Go Back</Button>
                </div>
            </div>
        );
    }

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
                            {anime.num_episodes && <span className={styles.badge}>{anime.num_episodes} episodes</span>}
                            {anime.rating && <span className={styles.badge}>{anime.rating}</span>}
                        </div>

                        {anime.genres && anime.genres.length > 0 && (
                            <div className={styles.genres}>
                                {anime.genres.map(genre => (
                                    <span key={genre.id} className={styles.genre}>
                                        {genre.name}
                                    </span>
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
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                className={`${styles.star} ${(watchData.rating || 0) >= star ? styles.active : ""}`}
                                                onClick={() => handleRatingChange(watchData.rating === star ? 0 : star)}
                                                title={`${star} star${star > 1 ? "s" : ""}`}
                                            >
                                                <i
                                                    className={`bi bi-star${(watchData.rating || 0) >= star ? "-fill" : ""}`}
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
                                        {watchData.rating && (
                                            <span className={styles.ratingValue}>
                                                {watchData.rating === 6 ? "Masterpiece" : `${watchData.rating}/5`}
                                            </span>
                                        )}
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
