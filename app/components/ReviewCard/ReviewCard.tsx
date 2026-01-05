"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { TopReviewWithAnime } from "@/types/anime";
import { formatLongText } from "@/lib/textUtils";
import styles from "./ReviewCard.module.scss";

interface ReviewCardProps {
    review: TopReviewWithAnime;
}

function formatReviewDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function ReviewCard({ review }: ReviewCardProps) {
    const anime = review.anime;
    const imageUrl =
        anime?.images?.jpg?.large_image_url ||
        anime?.images?.jpg?.image_url ||
        review.entry.images?.jpg?.image_url ||
        "/placeholder.png";
    const animeTitle = anime?.title || review.entry.title;

    return (
        <div className={styles.card}>
            <Link href={`/anime/${review.entry.mal_id}`} className={styles.animeLink}>
                <div className={styles.animeImage}>
                    <Image src={imageUrl} alt={animeTitle} fill sizes="80px" className={styles.image} loading="lazy" />
                </div>
                <div className={styles.animeInfo}>
                    <h3 className={styles.animeTitle}>{animeTitle}</h3>
                    <div className={styles.score}>
                        <i className="bi bi-star-fill" />
                        <span>{review.score}/10</span>
                    </div>
                </div>
            </Link>
            <div className={styles.reviewContent}>
                {formatLongText(review.review).map((p, i) => (
                    <p key={i} className={p.isAttribution ? styles.reviewAttribution : styles.reviewText}>
                        {p.text}
                    </p>
                ))}
            </div>
            <div className={styles.footer}>
                <a href={review.user.url} target="_blank" rel="noopener noreferrer" className={styles.user}>
                    {review.user.images?.jpg?.image_url && (
                        <Image
                            src={review.user.images.jpg.image_url}
                            alt={review.user.username}
                            width={24}
                            height={24}
                            className={styles.userAvatar}
                        />
                    )}
                    <span>{review.user.username}</span>
                </a>
                <span className={styles.date}>{formatReviewDate(review.date)}</span>
            </div>
            <div className={styles.tags}>
                {review.tags.slice(0, 2).map(tag => (
                    <span key={tag} className={styles.tag}>
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    );
}
