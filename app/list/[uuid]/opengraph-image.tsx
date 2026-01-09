import { getRecentAnime, getTopRatedAnime, getUserByPublicId, getWatchedCount } from "@/lib/db";
import { getAnimeFromRedisByIds } from "@/services/animeData";
import { REDIS_KEYS } from "@/lib/redis";
import { createNotFoundResponse, createOGHash, generateOGImage, OG_SIZE, OG_THEMES } from "@/services/opengraphService";

export const size = OG_SIZE;

export default async function OGImage({ params }: { params: Promise<{ uuid: string }> }) {
    const { uuid } = await params;
    const user = getUserByPublicId(uuid);

    if (!user) {
        return createNotFoundResponse("List Not Found");
    }

    const itemCount = getWatchedCount(user.id);
    const topRated = getTopRatedAnime(user.id, 5);
    const topAnimeIds = topRated.map(item => item.anime_id);

    if (topAnimeIds.length < 5) {
        const recent = getRecentAnime(user.id, 5 - topAnimeIds.length, topAnimeIds);
        topAnimeIds.push(...recent.map(item => item.anime_id));
    }

    const cacheHash = createOGHash(`${user.username}:${itemCount}:${topAnimeIds.join(",")}`);
    const cacheKey = REDIS_KEYS.OG_IMAGE(uuid, cacheHash);

    const animeMap = await getAnimeFromRedisByIds(topAnimeIds);
    const images: string[] = [];
    for (const id of topAnimeIds) {
        const anime = animeMap.get(id);
        if (anime?.images?.jpg?.large_image_url) {
            images.push(anime.images.jpg.large_image_url.replace(".webp", ".jpg"));
        }
    }

    return generateOGImage({
        id: uuid,
        images,
        theme: OG_THEMES.pink,
        label: "WaifuList",
        title: `${user.username}'s Anime List`,
        stats: `${itemCount} anime tracked`,
        cacheKey,
    });
}
