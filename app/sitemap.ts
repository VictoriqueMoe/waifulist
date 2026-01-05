import type { MetadataRoute } from "next";
import { getAllAnimeFromRedis } from "@/services/animeData";
import { getRedis, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";

export const dynamic = "force-dynamic";

async function saveSitemapToRedis(sitemap: MetadataRoute.Sitemap): Promise<void> {
    const redis = getRedis();
    try {
        await redis.setex(REDIS_KEYS.ANIME_SITEMAP, REDIS_TTL.ANIME_SITEMAP, JSON.stringify(sitemap));
    } catch (error) {
        console.error("[Redis] Failed to save sitemap:", error);
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost";

    try {
        const redis = getRedis();
        const cachedSitemap = await redis.get(REDIS_KEYS.ANIME_SITEMAP);
        if (cachedSitemap) {
            return JSON.parse(cachedSitemap) as MetadataRoute.Sitemap;
        }
    } catch (error) {
        console.error(`Failed to retrieve sitemap from redis: ${error}`);
    }

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

    const animeIds = (await getAllAnimeFromRedis()) ?? [];
    const animeLinks: MetadataRoute.Sitemap = animeIds.map(a => ({
        url: `${baseUrl}/anime/${a.mal_id}`,
        lastModified: new Date(),
    }));

    const completeLinks: MetadataRoute.Sitemap = [...staticLinks, ...seasonalLinks, ...animeLinks];
    await saveSitemapToRedis(completeLinks);

    return completeLinks;
}
