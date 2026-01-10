"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./RecommendationsSection.module.scss";

interface RecommendationEntry {
    mal_id: number;
    title: string;
    images?: {
        jpg?: {
            image_url?: string;
            large_image_url?: string;
        };
    };
}

interface Recommendation {
    entry: RecommendationEntry;
    votes: number;
}

interface RecommendationsSectionProps {
    recommendations: Recommendation[];
    type: "anime" | "manga";
}

export function RecommendationsSection({ recommendations, type }: RecommendationsSectionProps) {
    if (recommendations.length === 0) {
        return null;
    }

    return (
        <div className={styles.section}>
            <div className={styles.grid}>
                {recommendations.map(rec => {
                    const imageUrl = rec.entry.images?.jpg?.large_image_url || rec.entry.images?.jpg?.image_url;
                    return (
                        <Link key={rec.entry.mal_id} href={`/${type}/${rec.entry.mal_id}`} className={styles.item}>
                            <div className={styles.thumb}>
                                {imageUrl ? (
                                    <Image src={imageUrl} alt={rec.entry.title} fill sizes="150px" />
                                ) : (
                                    <div className={styles.noImage}>
                                        <i className="bi bi-image" />
                                    </div>
                                )}
                            </div>
                            <span className={styles.title}>{rec.entry.title}</span>
                            <span className={styles.votes}>{rec.votes} votes</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
