import { getUserByPublicId, getWatchedByStatus, WatchedAnimeRow } from "@/lib/db";
import { getAnimeFromRedisByIds } from "@/services/animeData";
import { CompareAnimeItem, ComparisonData, ComparisonStats, UserWatchData } from "@/types/compare";
import { WatchStatus } from "@/types/anime";

function toUserWatchData(row: WatchedAnimeRow): UserWatchData {
    return {
        status: row.status as WatchStatus,
        rating: row.rating,
        dateAdded: row.date_added,
    };
}

export async function getComparison(
    yourUserId: number,
    yourUsername: string,
    theirPublicId: string,
): Promise<ComparisonData | null> {
    const theirUser = getUserByPublicId(theirPublicId);
    if (!theirUser) {
        return null;
    }

    const yourWatchList = getWatchedByStatus(yourUserId, "completed");
    const theirWatchList = getWatchedByStatus(theirUser.id, "completed");

    const yourAnimeMap = new Map<number, WatchedAnimeRow>();
    for (const row of yourWatchList) {
        yourAnimeMap.set(row.anime_id, row);
    }

    const theirAnimeMap = new Map<number, WatchedAnimeRow>();
    for (const row of theirWatchList) {
        theirAnimeMap.set(row.anime_id, row);
    }

    const yourAnimeIds = new Set(yourWatchList.map(w => w.anime_id));
    const theirAnimeIds = new Set(theirWatchList.map(w => w.anime_id));

    const sharedIds: number[] = [];
    const youOnlyIds: number[] = [];
    const theyOnlyIds: number[] = [];

    for (const id of yourAnimeIds) {
        if (theirAnimeIds.has(id)) {
            sharedIds.push(id);
        } else {
            youOnlyIds.push(id);
        }
    }

    for (const id of theirAnimeIds) {
        if (!yourAnimeIds.has(id)) {
            theyOnlyIds.push(id);
        }
    }

    const allAnimeIds = [...sharedIds, ...youOnlyIds, ...theyOnlyIds];
    const animeDataMap = await getAnimeFromRedisByIds(allAnimeIds);

    const shared: CompareAnimeItem[] = [];
    const youOnly: CompareAnimeItem[] = [];
    const theyOnly: CompareAnimeItem[] = [];

    for (const id of sharedIds) {
        const anime = animeDataMap.get(id);
        if (anime) {
            shared.push({
                anime,
                yourData: toUserWatchData(yourAnimeMap.get(id)!),
                theirData: toUserWatchData(theirAnimeMap.get(id)!),
            });
        }
    }

    for (const id of youOnlyIds) {
        const anime = animeDataMap.get(id);
        if (anime) {
            youOnly.push({
                anime,
                yourData: toUserWatchData(yourAnimeMap.get(id)!),
            });
        }
    }

    for (const id of theyOnlyIds) {
        const anime = animeDataMap.get(id);
        if (anime) {
            theyOnly.push({
                anime,
                theirData: toUserWatchData(theirAnimeMap.get(id)!),
            });
        }
    }

    shared.sort((a, b) => (b.anime.score || 0) - (a.anime.score || 0));
    youOnly.sort((a, b) => (b.anime.score || 0) - (a.anime.score || 0));
    theyOnly.sort((a, b) => (b.anime.score || 0) - (a.anime.score || 0));

    const unionSize = yourAnimeIds.size + theirAnimeIds.size - sharedIds.length;
    const compatibilityScore = unionSize > 0 ? Math.round((sharedIds.length / unionSize) * 100) : 0;

    let ratingDiffSum = 0;
    let ratingDiffCount = 0;
    for (const item of shared) {
        if (item.yourData?.rating != null && item.theirData?.rating != null) {
            ratingDiffSum += item.yourData.rating - item.theirData.rating;
            ratingDiffCount++;
        }
    }
    const avgRatingDiff = ratingDiffCount > 0 ? Math.round((ratingDiffSum / ratingDiffCount) * 10) / 10 : null;

    const stats: ComparisonStats = {
        yourTotal: yourWatchList.length,
        theirTotal: theirWatchList.length,
        sharedCount: sharedIds.length,
        youOnlyCount: youOnlyIds.length,
        theyOnlyCount: theyOnlyIds.length,
        compatibilityScore,
        avgRatingDiff,
    };

    return {
        yourUsername,
        theirUsername: theirUser.username,
        theirPublicId,
        stats,
        shared,
        youOnly,
        theyOnly,
    };
}
