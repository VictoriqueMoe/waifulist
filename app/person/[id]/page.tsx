import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPersonById } from "@/lib/jikanApi";
import { PersonPageClient } from "./PersonPageClient";

interface PageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const personId = parseInt(id, 10);

    if (isNaN(personId)) {
        return { title: "Invalid Person | WaifuList" };
    }

    const person = await fetchPersonById(personId);

    if (!person) {
        return { title: "Person Not Found | WaifuList" };
    }

    const title = `${person.name} | WaifuList`;
    const description = person.about
        ? person.about.slice(0, 160).replace(/\n/g, " ") + "..."
        : `View ${person.name} voice actor and staff information on WaifuList`;
    const imageUrl = person.images?.jpg?.image_url;

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

export default async function PersonPage({ params }: PageProps) {
    const { id } = await params;
    const personId = parseInt(id, 10);

    if (isNaN(personId)) {
        notFound();
    }

    const person = await fetchPersonById(personId);

    if (!person) {
        notFound();
    }

    return <PersonPageClient person={person} />;
}
