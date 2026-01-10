import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnimeById } from "@/services/animeData";
import {
    fetchAnimeCharacters,
    fetchAnimeEpisodes,
    fetchAnimePictures,
    fetchAnimeRecommendations,
    fetchAnimeStatistics,
} from "@/lib/jikanApi";
import { AnimePageClient } from "./AnimePageClient";
import { Anime } from "@/types/anime";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const animeId = parseInt(id, 10);

    if (isNaN(animeId)) {
        return {
            title: "Invalid Anime | WaifuList",
        };
    }

    const anime = await getAnimeById(animeId, true);

    if (!anime) {
        return {
            title: "Anime Not Found | WaifuList",
            description: "The anime you're looking for doesn't exist.",
        };
    }

    const description = anime.synopsis
        ? anime.synopsis.split(" ").slice(0, 20).join(" ") + "..."
        : `Track ${anime.title} on WaifuList`;

    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

    return {
        title: `${anime.title} | WaifuList`,
        description,
        openGraph: {
            title: `${anime.title} | WaifuList`,
            description,
            siteName: "WaifuList",
            images: imageUrl ? [{ url: imageUrl }] : [],
        },
        twitter: {
            card: "summary_large_image",
            title: `${anime.title} | WaifuList`,
            description,
            images: imageUrl ? [imageUrl] : [],
        },
    };
}

export default async function AnimePage({ params }: PageProps) {
    const { id } = await params;
    const animeId = parseInt(id, 10);

    if (isNaN(animeId)) {
        notFound();
    }

    const anime = await getAnimeById(animeId, true);

    if (!anime) {
        notFound();
    }

    const relatedAnime: Record<number, Anime> = {};
    const relatedIds = anime.relations
        ? anime.relations.flatMap(r => r.entry.filter(e => e.type === "anime").map(e => e.mal_id))
        : [];

    const [relatedAnimeResults, pictures, recommendations, episodesData, characters, statistics] = await Promise.all([
        Promise.all(relatedIds.map(id => getAnimeById(id))),
        fetchAnimePictures(animeId),
        fetchAnimeRecommendations(animeId),
        fetchAnimeEpisodes(animeId),
        fetchAnimeCharacters(animeId),
        fetchAnimeStatistics(animeId),
    ]);

    for (let i = 0; i < relatedIds.length; i++) {
        const id = relatedIds[i];
        const result = relatedAnimeResults[i];
        if (result) {
            relatedAnime[id] = result;
        }
    }

    let totalEpisodeCount = anime.episodes;
    if (!totalEpisodeCount && episodesData.lastPage > 1) {
        const lastPageData = await fetchAnimeEpisodes(animeId, episodesData.lastPage);
        totalEpisodeCount = (episodesData.lastPage - 1) * 100 + lastPageData.episodes.length;
    }

    return (
        <AnimePageClient
            anime={anime}
            relatedAnime={relatedAnime}
            pictures={pictures}
            recommendations={recommendations}
            initialEpisodes={episodesData.episodes}
            totalEpisodePages={episodesData.lastPage}
            totalEpisodeCount={totalEpisodeCount || episodesData.episodes.length}
            characters={characters}
            statistics={statistics}
            streaming={anime.streaming ?? undefined}
        />
    );
}
