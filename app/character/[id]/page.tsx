import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchCharacterById } from "@/lib/cdn";
import { CharacterPageClient } from "./CharacterPageClient";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const characterId = parseInt(id, 10);

    if (isNaN(characterId)) {
        return { title: "Invalid Character | WaifuList" };
    }

    const character = await fetchCharacterById(characterId);

    if (!character) {
        return { title: "Character Not Found | WaifuList" };
    }

    const title = `${character.name} | WaifuList`;
    const description = character.about
        ? character.about.slice(0, 160).replace(/\n/g, " ") + "..."
        : `View ${character.name} character information on WaifuList`;
    const imageUrl = character.images?.webp?.image_url || character.images?.jpg?.image_url;

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

export default async function CharacterPage({ params }: PageProps) {
    const { id } = await params;
    const characterId = parseInt(id, 10);

    if (isNaN(characterId)) {
        notFound();
    }

    const character = await fetchCharacterById(characterId);

    if (!character) {
        notFound();
    }

    return <CharacterPageClient character={character} />;
}
