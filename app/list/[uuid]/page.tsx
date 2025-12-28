"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Anime, WatchStatus } from "@/types/anime";
import { getAnimeBatch } from "@/services/animeService";
import { AnimeListView, WatchedItem } from "@/components/AnimeListView/AnimeListView";
import styles from "@/components/AnimeListView/AnimeListView.module.scss";

interface ApiWatchedItem {
    anime_id: number;
    status: WatchStatus;
    rating: number | null;
    date_added: string;
}

export default function PublicListPage() {
    const params = useParams();
    const uuid = params.uuid as string;

    const [username, setUsername] = useState<string | null>(null);
    const [watchedItems, setWatchedItems] = useState<WatchedItem[]>([]);
    const [animeData, setAnimeData] = useState<Map<number, Anime>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchList() {
            try {
                const response = await fetch(`/api/list/${uuid}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        setError("List not found");
                    } else {
                        setError("Failed to load list");
                    }
                    setLoading(false);
                    return;
                }

                const data = await response.json();
                setUsername(data.username);

                const items: WatchedItem[] = data.items.map((item: ApiWatchedItem) => ({
                    animeId: item.anime_id,
                    status: item.status,
                    rating: item.rating,
                    dateAdded: item.date_added,
                }));
                setWatchedItems(items);

                if (items.length > 0) {
                    const ids = items.map(item => item.animeId);
                    const animeMap = await getAnimeBatch(ids);
                    setAnimeData(animeMap);
                }
            } catch {
                setError("Failed to load list");
            } finally {
                setLoading(false);
            }
        }

        fetchList();
    }, [uuid]);

    if (error) {
        return (
            <div className={styles.page}>
                <div className={styles.empty}>
                    <i className="bi bi-exclamation-circle" />
                    <h3>{error}</h3>
                    <p>The list you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                </div>
            </div>
        );
    }

    return (
        <AnimeListView
            title={`${username ?? "..."}'s Anime List`}
            subtitle={`${watchedItems.length} anime in this list`}
            watchedItems={watchedItems}
            animeData={animeData}
            loading={loading}
            showStatusBadge={false}
        />
    );
}
