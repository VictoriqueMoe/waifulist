import type { MetadataRoute } from "next";
import { getAllAnimeFromRedis, getCharacterIds, getPeopleIds } from "@/services/animeData";
import { getRedis, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";

export const dynamic = "force-dynamic";

async function saveSitemapToRedis(sitemap: MetadataRoute.Sitemap, id: number): Promise<void> {
    const redis = getRedis();
    try {
        await redis.setex(`${REDIS_KEYS.ANIME_SITEMAP(id)}`, REDIS_TTL.ANIME_SITEMAP, JSON.stringify(sitemap));
    } catch (error) {
        console.error("[Redis] Failed to save sitemap:", error);
    }
}

export async function generateSitemaps() {
    const peopleIds = await getPeopleIds();
    const characterIds = await getCharacterIds();
    const sitemapCount = Math.ceil(characterIds.ids.length / 50000) + Math.ceil(peopleIds.ids.length / 50000) + 1; //+1 for id=0 (anime+static)
    return Array.from({ length: sitemapCount }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: string | Promise<string> }): Promise<MetadataRoute.Sitemap> {
    const id = Number(await props.id);
    try {
        const redis = getRedis();
        const cachedSitemap = await redis.get(`${REDIS_KEYS.ANIME_SITEMAP(id)}`);
        if (cachedSitemap) {
            return JSON.parse(cachedSitemap) as MetadataRoute.Sitemap;
        }
    } catch (error) {
        console.error(`Failed to retrieve sitemap from redis: ${error}`);
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost";
    const peopleIds = await getPeopleIds();

    if (id === 0) {
        // Statics + Anime
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
                seasonalLinks.push({
                    url: `${baseUrl}/seasonal?year=${i}&amp;season=${season}`,
                    lastModified: new Date(),
                });
            }
        }

        const animeIds = (await getAllAnimeFromRedis()) ?? [];
        const animeLinks: MetadataRoute.Sitemap = animeIds.map(a => ({
            url: `${baseUrl}/anime/${a.mal_id}`,
            lastModified: new Date(),
        }));

        const completeLinks: MetadataRoute.Sitemap = [...staticLinks, ...seasonalLinks, ...animeLinks];
        await saveSitemapToRedis(completeLinks, id);
        return completeLinks;
    } else if (id < Math.ceil(peopleIds.ids.length / 50000) + 1) {
        // People
        const start = (id - 1) * 50000;
        const end = Math.min(start + 50000, peopleIds.ids.length);
        const peopleLinks: MetadataRoute.Sitemap = peopleIds.ids.slice(start, end).map(p => ({
            url: `${baseUrl}/person/${p}`,
            lastModified: new Date(),
        }));
        await saveSitemapToRedis(peopleLinks, id);
        return peopleLinks;
    } else {
        // Characters
        const characterIds = await getCharacterIds();
        const start = (id - Math.ceil(peopleIds.ids.length / 50000) - 1) * 50000;
        const end = Math.min(start + 50000, characterIds.ids.length);
        const characterLinks: MetadataRoute.Sitemap = characterIds.ids.slice(start, end).map(c => ({
            url: `${baseUrl}/character/${c}`,
            lastModified: new Date(),
        }));
        await saveSitemapToRedis(characterLinks, id);
        return characterLinks;
    }
}
