import type { MetadataRoute } from "next";
import { getAllAnimeIds } from "@/services/animeData";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.BASE_URL ?? "http://localhost";
    const staticLinks: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
        },
        {
            url: `${baseUrl}/browse`,
            lastModified: new Date(),
        },
        {
            url: `${baseUrl}/trace`,
            lastModified: new Date(),
        },
    ];

    const seasons: string[] = ["winter", "summer", "spring", "fall"];
    const year = new Date().getFullYear();
    const seasonalLinks: MetadataRoute.Sitemap = [];
    for (let i = year; i >= year - 5; i--) {
        for (const season of seasons) {
            seasonalLinks.push({ url: `${baseUrl}/seasonal?year=${i}&amp;season=${season}`, lastModified: new Date() });
        }
    }

    const animeIds = await getAllAnimeIds();
    const animeLinks: MetadataRoute.Sitemap = animeIds.map(id => ({
        url: `${baseUrl}/anime/${id}`,
        lastModified: new Date(),
    }));

    return [...staticLinks, ...seasonalLinks, ...animeLinks];
}
