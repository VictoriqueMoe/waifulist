"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Anime } from "@/types/anime";
import { getPopularAnime, searchAnime } from "@/services/animeService";
import { SearchBar } from "@/components/SearchBar/SearchBar";
import { AnimeCard } from "@/components/AnimeCard/AnimeCard";
import styles from "./page.module.scss";

function BrowseContent() {
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [anime, setAnime] = useState<Anime[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState(initialQuery);
    const searchIdRef = useRef(0);

    const performSearch = useCallback(async (searchQuery: string) => {
        const searchId = ++searchIdRef.current;
        setLoading(true);

        try {
            let results: Anime[];
            if (searchQuery.trim()) {
                results = await searchAnime(searchQuery);
            } else {
                results = await getPopularAnime();
            }

            if (searchId === searchIdRef.current) {
                setAnime(results);
                setLoading(false);
            }
        } catch (error) {
            console.error("Search failed:", error);
            if (searchId === searchIdRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        performSearch(initialQuery);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLiveSearch = useCallback(
        (newQuery: string) => {
            setQuery(newQuery);
            performSearch(newQuery);

            const url = new URL(window.location.href);
            if (newQuery) {
                url.searchParams.set("q", newQuery);
            } else {
                url.searchParams.delete("q");
            }
            window.history.replaceState({}, "", url);
        },
        [performSearch],
    );

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>Browse Anime</h1>
                    <p className={styles.subtitle}>
                        {query ? `Search results for "${query}"` : "Discover top rated anime"}
                    </p>
                </div>

                <div className={styles.searchWrapper}>
                    <SearchBar
                        initialValue={query}
                        onLiveSearch={handleLiveSearch}
                        placeholder="Search anime by title..."
                        debounceMs={250}
                    />
                </div>

                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <p>Searching...</p>
                    </div>
                ) : anime.length > 0 ? (
                    <div className={styles.grid}>
                        {anime.map(item => (
                            <AnimeCard key={item.id} anime={item} />
                        ))}
                    </div>
                ) : (
                    <div className={styles.empty}>
                        <i className="bi bi-search" />
                        <h3>No results found</h3>
                        <p>Try searching with different keywords</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function BrowsePage() {
    return (
        <Suspense
            fallback={
                <div className={styles.page}>
                    <div className={styles.container}>
                        <div className={styles.loading}>
                            <div className={styles.spinner} />
                            <p>Loading...</p>
                        </div>
                    </div>
                </div>
            }
        >
            <BrowseContent />
        </Suspense>
    );
}
