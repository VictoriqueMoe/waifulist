"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Anime, AnimePicture, AnimeRecommendation, AnimeRelation, WatchStatus } from "@/types/anime";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchList } from "@/contexts/WatchListContext";
import { Button } from "@/components/Button/Button";
import { Pill } from "@/components/Pill/Pill";
import { PictureGallery } from "@/components/PictureGallery/PictureGallery";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import { Tab, Tabs } from "@/components/Tabs/Tabs";
import styles from "./page.module.scss";

interface AnimePageClientProps {
    anime: Anime;
    relatedAnime?: Record<number, Anime>;
    pictures?: AnimePicture[];
    recommendations?: AnimeRecommendation[];
}

interface RelatedAnimeSectionProps {
    relations: AnimeRelation[];
    relatedAnime?: Record<number, Anime>;
}

interface ContentTabsProps {
    anime: Anime;
    pictures?: AnimePicture[];
    relatedAnime?: Record<number, Anime>;
    recommendations?: AnimeRecommendation[];
}

interface SynopsisParagraph {
    text: string;
    isAttribution: boolean;
}

const statusOptions: WatchStatus[] = ["watching", "plan_to_watch", "completed", "on_hold", "dropped"];
const MAX_NOTE_LENGTH = 500;

function RelatedAnimeSection({ relations, relatedAnime }: RelatedAnimeSectionProps) {
    const animeRelations = relations
        .map(r => ({
            ...r,
            entry: r.entry.filter(e => e.type === "anime"),
        }))
        .filter(r => r.entry.length > 0);

    const [activeTab, setActiveTab] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    if (animeRelations.length === 0) {
        return null;
    }

    const activeRelation = animeRelations[activeTab];

    const handleTabChange = (index: number) => {
        if (index === activeTab) {
            return;
        }
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveTab(index);
            setIsTransitioning(false);
        }, 150);
    };

    return (
        <div className={styles.relatedSection}>
            <div className={styles.relationTabs}>
                {animeRelations.map((relation, index) => (
                    <button
                        key={relation.relation}
                        className={`${styles.relationTab} ${index === activeTab ? styles.active : ""}`}
                        onClick={() => handleTabChange(index)}
                    >
                        {relation.relation}
                        <span className={styles.tabCount}>{relation.entry.length}</span>
                    </button>
                ))}
            </div>
            <div className={`${styles.relatedGrid} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>
                {activeRelation.entry.map(entry => {
                    const relatedData = relatedAnime?.[entry.mal_id];
                    const imageUrl = relatedData?.images?.jpg?.large_image_url || relatedData?.images?.jpg?.image_url;
                    return (
                        <Link key={entry.mal_id} href={`/anime/${entry.mal_id}`} className={styles.relatedItem}>
                            <div className={styles.relatedThumb}>
                                {imageUrl ? (
                                    <Image src={imageUrl} alt={entry.name} fill sizes="150px" />
                                ) : (
                                    <div className={styles.noImage} />
                                )}
                            </div>
                            <span className={styles.relatedTitle}>{entry.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

function RecommendationsSection({ recommendations }: { recommendations: AnimeRecommendation[] }) {
    if (recommendations.length === 0) {
        return null;
    }

    return (
        <div className={styles.recommendationsSection}>
            <div className={styles.recommendationsGrid}>
                {recommendations.map(rec => {
                    const imageUrl = rec.entry.images?.jpg?.large_image_url;
                    if (!imageUrl) {
                        return null;
                    }
                    return (
                        <Link
                            key={rec.entry.mal_id}
                            href={`/anime/${rec.entry.mal_id}`}
                            className={styles.recommendationItem}
                        >
                            <div className={styles.recommendationThumb}>
                                <Image src={imageUrl} alt={rec.entry.title} fill sizes="150px" />
                            </div>
                            <span className={styles.recommendationTitle}>{rec.entry.title}</span>
                            <span className={styles.recommendationVotes}>{rec.votes} votes</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

function formatSynopsis(text: string): SynopsisParagraph[] {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());

    if (paragraphs.length === 1 && text.length > 400) {
        const result: SynopsisParagraph[] = [];
        let remaining = text;

        const attributionMatch = remaining.match(/\s*\[([^\]]+)]\s*$/);
        let attribution = "";
        if (attributionMatch) {
            attribution = `[${attributionMatch[1]}]`;
            remaining = remaining.slice(0, attributionMatch.index).trim();
        }

        const sentences = remaining.split(/(?<=[.!?])\s+(?=[A-Z])/);
        let currentParagraph = "";

        for (const sentence of sentences) {
            if (currentParagraph.length + sentence.length > 350 && currentParagraph.length > 200) {
                result.push({ text: currentParagraph.trim(), isAttribution: false });
                currentParagraph = sentence;
            } else {
                currentParagraph += (currentParagraph ? " " : "") + sentence;
            }
        }

        if (currentParagraph.trim()) {
            result.push({ text: currentParagraph.trim(), isAttribution: false });
        }

        if (attribution) {
            result.push({ text: attribution, isAttribution: true });
        }

        return result;
    }

    return paragraphs.map((p, i) => ({
        text: p,
        isAttribution: i === paragraphs.length - 1 && p.startsWith("["),
    }));
}

function OverviewContent({ anime }: { anime: Anime }) {
    const synopsisParagraphs = anime.synopsis ? formatSynopsis(anime.synopsis) : [];

    return (
        <div className={styles.overviewTab}>
            {synopsisParagraphs.length > 0 && (
                <div className={styles.synopsis}>
                    {synopsisParagraphs.map((paragraph, index) => (
                        <p key={index} className={paragraph.isAttribution ? styles.synopsisAttribution : undefined}>
                            {paragraph.text}
                        </p>
                    ))}
                </div>
            )}
            <div className={styles.infoGrid}>
                {anime.studios && anime.studios.length > 0 && (
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Studios</span>
                        <span className={styles.infoValue}>{anime.studios.map(s => s.name).join(", ")}</span>
                    </div>
                )}
                {anime.aired?.from && (
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Aired</span>
                        <span className={styles.infoValue}>{anime.aired.string || anime.aired.from}</span>
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
                {anime.duration && (
                    <div className={styles.infoItem}>
                        <span className={styles.infoLabel}>Duration</span>
                        <span className={styles.infoValue}>{anime.duration}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function TrailerContent({ trailerId, title }: { trailerId: string; title: string }) {
    return (
        <div className={styles.trailerContent}>
            <div className={styles.trailerWrapper}>
                <iframe
                    src={`https://www.youtube.com/embed/${trailerId}`}
                    title={`${title} Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>
    );
}

function MediaContent({ anime, pictures }: { anime: Anime; pictures?: AnimePicture[] }) {
    const trailerId = anime.trailer?.youtube_id;
    const hasTrailer = !!trailerId;
    const hasPictures = pictures && pictures.length > 0;

    const mediaTabs: Tab[] = [];

    if (hasTrailer) {
        mediaTabs.push({
            id: "trailer",
            label: "Trailer",
            content: <TrailerContent trailerId={trailerId} title={anime.title} />,
        });
    }

    if (hasPictures) {
        mediaTabs.push({
            id: "gallery",
            label: "Gallery",
            content: <PictureGallery pictures={pictures} />,
        });
    }

    if (mediaTabs.length === 0) {
        return null;
    }

    return <Tabs tabs={mediaTabs} />;
}

function ContentTabs({ anime, pictures, relatedAnime, recommendations }: ContentTabsProps) {
    const hasMedia = anime.trailer?.youtube_id || (pictures && pictures.length > 0);
    const hasRelated = anime.relations && anime.relations.some(r => r.entry.some(e => e.type === "anime"));
    const hasRecommendations = recommendations && recommendations.length > 0;

    const tabs: Tab[] = [
        {
            id: "overview",
            label: "Overview",
            content: <OverviewContent anime={anime} />,
        },
    ];

    if (hasMedia) {
        tabs.push({
            id: "media",
            label: "Media",
            content: <MediaContent anime={anime} pictures={pictures} />,
        });
    }

    if (hasRelated) {
        tabs.push({
            id: "related",
            label: "Related",
            content: <RelatedAnimeSection relations={anime.relations!} relatedAnime={relatedAnime} />,
        });
    }

    if (hasRecommendations) {
        tabs.push({
            id: "recommendations",
            label: "Recommendations",
            content: <RecommendationsSection recommendations={recommendations} />,
        });
    }

    return <Tabs tabs={tabs} />;
}

export function AnimePageClient({ anime, relatedAnime, pictures, recommendations }: AnimePageClientProps) {
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

    const watchData = user ? getWatchData(anime.mal_id) : undefined;

    const noteText = localNoteText !== null ? localNoteText : watchData?.notes || "";

    const saveNote = useCallback(
        (text: string) => {
            const trimmed = text.trim();
            const existingTrimmed = (watchData?.notes || "").trim();
            if (trimmed === existingTrimmed) {
                return;
            }
            updateWatchStatus(anime.mal_id, { notes: trimmed || null });
            setNoteSaved(true);
            if (savedIndicatorTimeoutRef.current) {
                clearTimeout(savedIndicatorTimeoutRef.current);
            }
            savedIndicatorTimeoutRef.current = setTimeout(() => setNoteSaved(false), 2000);
        },
        [anime.mal_id, watchData?.notes, updateWatchStatus],
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
        updateWatchStatus(anime.mal_id, { notes: null });
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
        if (isInWatchList(anime.mal_id)) {
            updateWatchStatus(anime.mal_id, { status });
        } else {
            addToWatchList(anime.mal_id, status);
        }
        setShowStatusMenu(false);
    };

    const handleRemoveFromList = () => {
        removeFromWatchList(anime.mal_id);
        setShowStatusMenu(false);
    };

    const handleEpisodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const episodes = Math.max(0, Math.min(parseInt(e.target.value) || 0, anime.episodes || 9999));
        updateWatchStatus(anime.mal_id, { episodesWatched: episodes });
    };

    const handleRatingChange = (rating: number) => {
        updateWatchStatus(anime.mal_id, { rating });
    };

    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || "/placeholder.png";

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
                            {anime.title_english && anime.title_english !== anime.title && (
                                <p className={styles.altTitle}>{anime.title_english}</p>
                            )}
                        </div>

                        <div className={styles.meta}>
                            {anime.score && (
                                <div className={styles.score}>
                                    <i className="bi bi-star-fill" />
                                    <span>{anime.score.toFixed(2)}</span>
                                </div>
                            )}
                            {anime.type && <span className={styles.badge}>{anime.type.toUpperCase()}</span>}
                            {anime.status && <span className={styles.badge}>{anime.status.replace(/_/g, " ")}</span>}
                            <span className={styles.badge}>
                                {anime.episodes ? `${anime.episodes} episodes` : "N/A"}
                            </span>
                            {anime.rating && <span className={styles.badge}>{anime.rating}</span>}
                        </div>

                        {anime.genres && anime.genres.length > 0 && (
                            <div className={styles.genres}>
                                {anime.genres.map(genre => (
                                    <Pill key={genre.mal_id} variant="accent">
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
                                                max={anime.episodes || 9999}
                                                value={watchData.episodesWatched}
                                                onChange={handleEpisodeChange}
                                            />
                                            <span>/ {anime.episodes || "?"}</span>
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

                        <ContentTabs
                            anime={anime}
                            pictures={pictures}
                            relatedAnime={relatedAnime}
                            recommendations={recommendations}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
