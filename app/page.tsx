"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Anime, TopReviewWithAnime } from "@/types/anime";
import { useAnime } from "@/hooks";
import { useWatchList } from "@/contexts/WatchListContext";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { AnimeCard } from "@/components/AnimeCard/AnimeCard";
import { ReviewCard } from "@/components/ReviewCard/ReviewCard";
import styles from "./page.module.scss";

const FEATURES = [
    {
        icon: "bi-list-check",
        title: "Track Your Anime",
        description:
            "Organise your anime with status tracking, ratings from dogshit to masterpiece, and personal notes others can see",
    },
    {
        icon: "bi-share",
        title: "Share Your List",
        description: "Get a unique public URL to share your anime list with friends",
    },
    {
        icon: "bi-bar-chart-line",
        title: "View Your Stats",
        description: "See total anime watched, episodes, rating distribution, top genres, and activity timeline",
        link: "/profile",
    },
    {
        icon: "bi-bookmark-heart",
        title: "Bookmark Friends",
        description: "Save your friends' lists for quick access from your profile",
    },
    {
        icon: "bi-people",
        title: "Compare Lists",
        description: "See what you have in common with friends and get a compatibility score",
    },
    {
        icon: "bi-search",
        title: "Discover Anime",
        description: "Browse anime, characters, voice actors, and detailed stats on any title",
        link: "/browse",
    },
    {
        icon: "bi-trophy",
        title: "Create Tier Lists",
        description: "Build and share character tier lists, browse community lists and leave comments",
        link: "/tierlist/browse",
    },
    {
        icon: "bi-camera",
        title: "Find Any Anime",
        description: "Upload a screenshot to instantly identify the anime, episode, and timestamp",
        link: "/trace",
    },
];

export default function Home() {
    const router = useRouter();
    const { getHomePageAnime } = useAnime();
    const { ensureLoaded } = useWatchList();
    const [popularAnime, setPopularAnime] = useState<Anime[]>([]);
    const [reviews, setReviews] = useState<TopReviewWithAnime[]>([]);

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
        getHomePageAnime().then(({ popular, reviews }) => {
            setPopularAnime(popular);
            setReviews(reviews);
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

            <section className={styles.features}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2>Everything You Need</h2>
                    </div>
                    <div className={styles.featuresGrid}>
                        {FEATURES.map(feature => {
                            const card = (
                                <div className={styles.featureCard}>
                                    <div className={styles.featureIcon}>
                                        <i className={`bi ${feature.icon}`} />
                                    </div>
                                    <h3>{feature.title}</h3>
                                    <p>{feature.description}</p>
                                </div>
                            );

                            if (feature.link) {
                                return (
                                    <Link key={feature.title} href={feature.link} className={styles.featureLink}>
                                        {card}
                                    </Link>
                                );
                            }

                            return <div key={feature.title}>{card}</div>;
                        })}
                    </div>
                </div>
            </section>

            {reviews.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.container}>
                        <div className={styles.sectionHeader}>
                            <h2>Recent Reviews</h2>
                        </div>
                        <div className={styles.reviewsGrid}>
                            {reviews.map(review => (
                                <ReviewCard key={review.mal_id} review={review} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

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
