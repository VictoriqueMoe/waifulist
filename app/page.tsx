"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Anime } from "@/types/anime";
import { useAnime } from "@/hooks";
import { useWatchList } from "@/contexts/WatchListContext";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { AnimeCard } from "@/components/AnimeCard/AnimeCard";
import styles from "./page.module.scss";

export default function Home() {
    const router = useRouter();
    const { getHomePageAnime } = useAnime();
    const { ensureLoaded } = useWatchList();
    const [featuredAnime, setFeaturedAnime] = useState<Anime[]>([]);
    const [popularAnime, setPopularAnime] = useState<Anime[]>([]);

    useEffect(() => {
        ensureLoaded();
    }, [ensureLoaded]);

    const handleLiveSearch = useCallback(
        (query: string) => {
            if (query.trim()) {
                router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
            }
        },
        [router],
    );

    useEffect(() => {
        getHomePageAnime().then(({ featured, popular }) => {
            setFeaturedAnime(featured);
            setPopularAnime(popular);
        });
    }, [getHomePageAnime]);

    return (
        <div className={styles.page}>
            <section className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={styles.title}>
                        Track Your <span className={styles.accent}>Anime</span> Journey
                    </h1>
                    <p className={styles.subtitle}>
                        Keep track of what you&apos;re watching, plan your next binge, and never forget where you left
                        off.
                    </p>
                    <div className={styles.searchWrapper}>
                        <SearchBar onLiveSearch={handleLiveSearch} placeholder="Search for anime..." />
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2>Recommendations</h2>
                    </div>
                    <div className={styles.grid}>
                        {featuredAnime.map(anime => (
                            <AnimeCard key={anime.mal_id} anime={anime} />
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2>Top Rated</h2>
                        <a href="/browse" className={styles.viewAll}>
                            View all <i className="bi bi-arrow-right" />
                        </a>
                    </div>
                    <div className={styles.grid}>
                        {popularAnime.map(anime => (
                            <AnimeCard key={anime.mal_id} anime={anime} />
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
