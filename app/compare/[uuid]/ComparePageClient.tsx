"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CompareAnimeItem } from "@/types/compare";
import { useComparison } from "@/hooks/useComparison";
import { Spinner } from "@/components/Spinner/Spinner";
import styles from "./page.module.scss";

interface ComparePageClientProps {
    targetUuid: string;
}

function RatingDisplay({ rating, label }: { rating: number | null; label: string }) {
    if (rating == null || rating === 0) {
        return (
            <div className={styles.ratingRow}>
                <span className={styles.ratingLabel}>{label}:</span>
                <span className={styles.noRating}>Not rated</span>
            </div>
        );
    }

    if (rating === 6) {
        return (
            <div className={styles.ratingRow}>
                <span className={styles.ratingLabel}>{label}:</span>
                <span className={`${styles.ratingStars} ${styles.masterpiece}`}>
                    <i className="bi bi-star-fill" /> Masterpiece
                </span>
            </div>
        );
    }

    if (rating === -1) {
        return (
            <div className={styles.ratingRow}>
                <span className={styles.ratingLabel}>{label}:</span>
                <span className={styles.ratingStars}>💩</span>
            </div>
        );
    }

    return (
        <div className={styles.ratingRow}>
            <span className={styles.ratingLabel}>{label}:</span>
            <span className={styles.ratingStars}>
                {[...Array(5)].map((_, i) => (
                    <i key={i} className={`bi bi-star${i < rating ? "-fill" : ""}`} />
                ))}
            </span>
        </div>
    );
}

function CompareCard({
    item,
    theirUsername,
    section,
}: {
    item: CompareAnimeItem;
    theirUsername: string;
    section: "shared" | "youOnly" | "theyOnly";
}) {
    const { anime, yourData, theirData } = item;
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || "/placeholder.png";

    return (
        <Link href={`/anime/${anime.mal_id}`} className={styles.compareCard} prefetch={false}>
            <div className={styles.cardImage}>
                <Image src={imageUrl} alt={anime.title} fill sizes="120px" loading="lazy" />
                {anime.score && (
                    <div className={styles.score}>
                        <i className="bi bi-star-fill" />
                        {anime.score.toFixed(1)}
                    </div>
                )}
            </div>
            <div className={styles.cardInfo}>
                <h4 className={styles.cardTitle}>{anime.title}</h4>
                <div className={styles.cardMeta}>
                    {anime.type && <span>{anime.type.toUpperCase()}</span>}
                    {anime.episodes && <span>{anime.episodes} eps</span>}
                </div>
                <div className={styles.ratings}>
                    {section === "shared" && (
                        <>
                            <RatingDisplay rating={yourData?.rating ?? null} label="You" />
                            <RatingDisplay rating={theirData?.rating ?? null} label={theirUsername} />
                        </>
                    )}
                    {section === "youOnly" && <RatingDisplay rating={yourData?.rating ?? null} label="Your rating" />}
                    {section === "theyOnly" && (
                        <RatingDisplay rating={theirData?.rating ?? null} label={`${theirUsername}'s rating`} />
                    )}
                </div>
            </div>
        </Link>
    );
}

function VennSection({
    title,
    count,
    items,
    theirUsername,
    section,
    icon,
    defaultExpanded = true,
}: {
    title: string;
    count: number;
    items: CompareAnimeItem[];
    theirUsername: string;
    section: "shared" | "youOnly" | "theyOnly";
    icon: string;
    defaultExpanded?: boolean;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [visibleCount, setVisibleCount] = useState(12);
    const gridRef = useRef<HTMLDivElement>(null);

    const visibleItems = items.slice(0, visibleCount);
    const hasMore = items.length > visibleCount;

    const handleShowMore = useCallback(() => {
        setVisibleCount(prev => prev + 24);
        setTimeout(() => {
            if (gridRef.current) {
                gridRef.current.scrollTo({ top: gridRef.current.scrollHeight, behavior: "smooth" });
            }
        }, 50);
    }, []);

    return (
        <div className={styles.vennSection}>
            <button className={styles.sectionHeader} onClick={() => setExpanded(!expanded)}>
                <div className={styles.sectionTitle}>
                    <i className={`bi bi-${icon}`} />
                    <span>{title}</span>
                    <span className={styles.sectionCount}>({count})</span>
                </div>
                <i className={`bi bi-chevron-${expanded ? "up" : "down"}`} />
            </button>
            {expanded && (
                <div className={styles.sectionContent}>
                    {items.length === 0 ? (
                        <p className={styles.emptySection}>No anime in this section</p>
                    ) : (
                        <>
                            <div ref={gridRef} className={styles.cardGrid}>
                                {visibleItems.map(item => (
                                    <CompareCard
                                        key={item.anime.mal_id}
                                        item={item}
                                        theirUsername={theirUsername}
                                        section={section}
                                    />
                                ))}
                            </div>
                            {hasMore && (
                                <button className={styles.showMoreButton} onClick={handleShowMore}>
                                    Show more ({items.length - visibleCount} remaining)
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export function ComparePageClient({ targetUuid }: ComparePageClientProps) {
    const { data, loading, error } = useComparison(targetUuid);

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.loading}>
                        <Spinner text="Loading comparison..." />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.error}>
                        <i className="bi bi-exclamation-circle" />
                        <p>{error || "Failed to load comparison"}</p>
                    </div>
                </div>
            </div>
        );
    }

    const { stats, shared, youOnly, theyOnly, yourUsername, theirUsername } = data;

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>
                        <i className="bi bi-arrow-left-right" />
                        List Comparison
                    </h1>
                    <p className={styles.subtitle}>
                        Comparing <strong>{yourUsername}</strong> with <strong>{theirUsername}</strong>
                    </p>
                </div>

                <div className={styles.statsCard}>
                    <div className={styles.statRow}>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{stats.yourTotal}</span>
                            <span className={styles.statLabel}>Your anime</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{stats.theirTotal}</span>
                            <span className={styles.statLabel}>{theirUsername}&apos;s anime</span>
                        </div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>{stats.sharedCount}</span>
                            <span className={styles.statLabel}>Shared</span>
                        </div>
                    </div>

                    <div className={styles.compatibilitySection}>
                        <div className={styles.compatibilityHeader}>
                            <span>Compatibility</span>
                            <span className={styles.compatibilityValue}>{stats.compatibilityScore}%</span>
                        </div>
                        <div className={styles.compatibilityBar}>
                            <div
                                className={styles.compatibilityFill}
                                style={{ width: `${stats.compatibilityScore}%` }}
                            />
                        </div>
                        {stats.avgRatingDiff !== null && (
                            <p className={styles.ratingDiffNote}>
                                Average rating difference on shared anime:{" "}
                                <strong>
                                    {stats.avgRatingDiff > 0 ? "+" : ""}
                                    {stats.avgRatingDiff}
                                </strong>
                            </p>
                        )}
                    </div>
                </div>

                <VennSection
                    title="Both Watched"
                    count={stats.sharedCount}
                    items={shared}
                    theirUsername={theirUsername}
                    section="shared"
                    icon="intersect"
                />

                <VennSection
                    title="Only You"
                    count={stats.youOnlyCount}
                    items={youOnly}
                    theirUsername={theirUsername}
                    section="youOnly"
                    icon="person"
                    defaultExpanded={false}
                />

                <VennSection
                    title={`Only ${theirUsername}`}
                    count={stats.theyOnlyCount}
                    items={theyOnly}
                    theirUsername={theirUsername}
                    section="theyOnly"
                    icon="person-fill"
                    defaultExpanded={false}
                />
            </div>
        </div>
    );
}
