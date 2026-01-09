"use client";

import { useCallback, useState } from "react";
import { AnimeEpisode, AnimeEpisodeDetail } from "@/types/anime";
import { getEpisodeDetail, getEpisodes } from "@/services/animeService";

interface EpisodesData {
    episodes: AnimeEpisode[];
    currentPage: number;
}

export function useEpisodes(animeId: number, initialEpisodes: AnimeEpisode[] = []) {
    const [episodes, setEpisodes] = useState<AnimeEpisode[]>(initialEpisodes);
    const [currentPage, setCurrentPage] = useState(1);
    const [loadingPage, setLoadingPage] = useState(false);
    const [episodeDetailsCache, setEpisodeDetailsCache] = useState<Record<number, AnimeEpisodeDetail>>({});
    const [loadingEpisodes, setLoadingEpisodes] = useState<Set<number>>(new Set());

    const loadPage = useCallback(
        async (page: number): Promise<EpisodesData | null> => {
            if (loadingPage || page === currentPage) {
                return null;
            }
            setLoadingPage(true);
            try {
                const data = await getEpisodes(animeId, page);
                setEpisodes(data.episodes);
                setCurrentPage(page);
                return { episodes: data.episodes, currentPage: page };
            } finally {
                setLoadingPage(false);
            }
        },
        [animeId, currentPage, loadingPage],
    );

    const fetchEpisodeDetail = useCallback(
        async (episodeId: number): Promise<AnimeEpisodeDetail | null> => {
            if (episodeDetailsCache[episodeId] || loadingEpisodes.has(episodeId)) {
                return episodeDetailsCache[episodeId] || null;
            }

            setLoadingEpisodes(prev => new Set(prev).add(episodeId));

            try {
                const detail = await getEpisodeDetail(animeId, episodeId);
                if (detail) {
                    setEpisodeDetailsCache(prev => ({ ...prev, [episodeId]: detail }));
                }
                return detail;
            } finally {
                setLoadingEpisodes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(episodeId);
                    return newSet;
                });
            }
        },
        [animeId, episodeDetailsCache, loadingEpisodes],
    );

    const isLoadingEpisode = useCallback((episodeId: number) => loadingEpisodes.has(episodeId), [loadingEpisodes]);

    const getEpisodeDetail_ = useCallback(
        (episodeId: number) => episodeDetailsCache[episodeId] || null,
        [episodeDetailsCache],
    );

    return {
        episodes,
        currentPage,
        loadingPage,
        loadPage,
        fetchEpisodeDetail,
        isLoadingEpisode,
        getEpisodeDetail: getEpisodeDetail_,
    };
}
