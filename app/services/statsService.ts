import { getAllWatched, getUserById } from "@/lib/db";
import { getAnimeFromRedisByIds } from "@/services/animeData";
import { UserStats } from "@/types/stats";

export async function getUserStats(userId: number): Promise<UserStats | null> {
    const user = getUserById(userId);
    if (!user) {
        return null;
    }

    const watchedList = getAllWatched(userId);
    const animeIds = watchedList.map(w => w.anime_id);
    const animeMap = await getAnimeFromRedisByIds(animeIds);

    // Status counts
    const statusCounts: Record<string, number> = {};
    for (const watched of watchedList) {
        statusCounts[watched.status] = (statusCounts[watched.status] || 0) + 1;
    }

    // Genre counts
    const genreCountMap = new Map<string, number>();
    for (const watched of watchedList) {
        const anime = animeMap.get(watched.anime_id);
        if (anime?.genres) {
            for (const genre of anime.genres) {
                genreCountMap.set(genre.name, (genreCountMap.get(genre.name) || 0) + 1);
            }
        }
    }
    const genreCounts = [...genreCountMap.entries()]
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // Rating counts
    const ratingCountMap = new Map<number, number>();
    let ratingSum = 0;
    let ratingCount = 0;
    for (const watched of watchedList) {
        if (watched.rating != null && watched.rating !== 0) {
            ratingCountMap.set(watched.rating, (ratingCountMap.get(watched.rating) || 0) + 1);
            ratingSum += watched.rating;
            ratingCount++;
        }
    }
    const ratingCounts = [...ratingCountMap.entries()]
        .map(([rating, count]) => ({ rating, count }))
        .sort((a, b) => a.rating - b.rating);

    // Activity by month
    const monthCountMap = new Map<string, number>();
    for (const watched of watchedList) {
        if (watched.date_added) {
            const date = new Date(watched.date_added);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            monthCountMap.set(monthKey, (monthCountMap.get(monthKey) || 0) + 1);
        }
    }
    const activityByMonth = [...monthCountMap.entries()]
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

    // Total episodes
    let totalEpisodes = 0;
    for (const watched of watchedList) {
        const anime = animeMap.get(watched.anime_id);
        if (anime?.episodes) {
            if (watched.status === "completed") {
                totalEpisodes += anime.episodes;
            } else if (watched.episodes_watched > 0) {
                totalEpisodes += watched.episodes_watched;
            }
        }
    }

    return {
        username: user.username,
        totalAnime: watchedList.length,
        statusCounts,
        genreCounts,
        ratingCounts,
        activityByMonth,
        totalEpisodes,
        avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
        memberSince: user.created_at,
    };
}
