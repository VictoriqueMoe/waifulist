import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
    fetchMangaById,
    fetchMangaCharacters,
    fetchMangaPictures,
    fetchMangaRecommendations,
    fetchMangaStatistics,
} from "@/lib/jikanApi";
import { MangaPageClient } from "./MangaPageClient";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const mangaId = parseInt(id, 10);

    if (isNaN(mangaId)) {
        return { title: "Invalid Manga | WaifuList" };
    }

    const manga = await fetchMangaById(mangaId);

    if (!manga) {
        return { title: "Manga Not Found | WaifuList" };
    }

    const displayTitle = manga.title_english || manga.title;
    const title = `${displayTitle} | WaifuList`;
    const description = manga.synopsis
        ? manga.synopsis.slice(0, 160).replace(/\n/g, " ") + "..."
        : `View ${displayTitle} manga information on WaifuList`;
    const imageUrl = manga.images?.webp?.large_image_url || manga.images?.jpg?.large_image_url;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: imageUrl ? [{ url: imageUrl }] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: imageUrl ? [imageUrl] : undefined,
        },
    };
}

export default async function MangaPage({ params }: PageProps) {
    const { id } = await params;
    const mangaId = parseInt(id, 10);

    if (isNaN(mangaId)) {
        notFound();
    }

    const [manga, characters, pictures, statistics, recommendations] = await Promise.all([
        fetchMangaById(mangaId),
        fetchMangaCharacters(mangaId),
        fetchMangaPictures(mangaId),
        fetchMangaStatistics(mangaId),
        fetchMangaRecommendations(mangaId),
    ]);

    if (!manga) {
        notFound();
    }

    return (
        <MangaPageClient
            manga={manga}
            characters={characters}
            pictures={pictures}
            statistics={statistics}
            recommendations={recommendations}
        />
    );
}
