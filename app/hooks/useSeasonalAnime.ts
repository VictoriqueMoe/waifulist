"use client";

import { useEffect, useState } from "react";
import { Anime } from "@/types/anime";
import { fetchSeasonalAnime, SeasonalResponse } from "@/services/seasonalClientService";

interface UseSeasonalAnimeOptions {
    year: number;
    season: string;
    page: number;
    pageSize: number;
    genres?: string[];
}

export function useSeasonalAnime(options: UseSeasonalAnimeOptions) {
    const { year, season, page, pageSize, genres = [] } = options;
    const [anime, setAnime] = useState<Anime[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [filteredCount, setFilteredCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const genresKey = genres.join(",");

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);

            try {
                const offset = (page - 1) * pageSize;
                const genresList = genresKey ? genresKey.split(",") : [];
                const data: SeasonalResponse = await fetchSeasonalAnime(year, season, pageSize, offset, genresList);

                if (cancelled) {
                    return;
                }

                setAnime(data.anime);
                setTotalCount(data.total);
                setFilteredCount(data.filtered);
            } catch (error) {
                console.error("Failed to fetch seasonal anime:", error);
                if (!cancelled) {
                    setAnime([]);
                    setTotalCount(0);
                    setFilteredCount(0);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [year, season, page, pageSize, genresKey]);

    return { anime, totalCount, filteredCount, loading };
}
