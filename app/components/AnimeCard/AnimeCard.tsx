"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Anime } from "@/types/anime";
import { useWatchList } from "@/contexts/WatchListContext";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import styles from "./AnimeCard.module.scss";

interface AnimeCardProps {
    anime: Anime;
    showStatus?: boolean;
}

export function AnimeCard({ anime, showStatus = true }: AnimeCardProps) {
    const { getWatchData } = useWatchList();
    const watchData = getWatchData(anime.id);

    const imageUrl = anime.main_picture?.large || anime.main_picture?.medium || "/placeholder.png";

    return (
        <Link href={`/anime/${anime.id}`} className={styles.card}>
            <div className={styles.imageContainer}>
                <Image
                    src={imageUrl}
                    alt={anime.title}
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                    className={styles.image}
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
            </div>
            <div className={styles.info}>
                <h3 className={styles.title}>{anime.title}</h3>
                <div className={styles.meta}>
                    {anime.media_type && <span className={styles.type}>{anime.media_type.toUpperCase()}</span>}
                    {anime.num_episodes && <span className={styles.episodes}>{anime.num_episodes} eps</span>}
                </div>
            </div>
        </Link>
    );
}
