import { Metadata } from "next";
import { BrowseTierListsClient } from "./BrowseTierListsClient";

export const metadata: Metadata = {
    title: "Browse Tier Lists | WaifuList",
    description:
        "Discover and explore waifu tier lists created by the community. Find rankings, compare favourites, and get inspired to create your own.",
    openGraph: {
        title: "Browse Tier Lists | WaifuList",
        description:
            "Discover and explore waifu tier lists created by the community. Find rankings, compare favourites, and get inspired to create your own.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Browse Tier Lists | WaifuList",
        description: "Discover and explore waifu tier lists created by the community.",
    },
};

export default function BrowseTierListsPage() {
    return <BrowseTierListsClient />;
}
