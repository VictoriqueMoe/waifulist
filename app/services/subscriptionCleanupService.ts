import { deleteSubscriptionsByMalIds, getUniqueSubscribedMalIds } from "@/lib/db";
import { fetchAnimeStatusByMalIds } from "@/lib/anilist";

export async function cleanupEndedSubscriptions(): Promise<{ deleted: number }> {
    const malIds = getUniqueSubscribedMalIds();

    if (malIds.length === 0) {
        console.log("[Cleanup] No subscriptions to check");
        return { deleted: 0 };
    }

    console.log(`[Cleanup] Checking ${malIds.length} unique subscribed anime`);

    const statusMap = await fetchAnimeStatusByMalIds(malIds);

    const endedMalIds: number[] = [];
    for (const malId of malIds) {
        const status = statusMap.get(malId);
        if (status && status !== "RELEASING") {
            endedMalIds.push(malId);
        }
    }

    if (endedMalIds.length === 0) {
        console.log("[Cleanup] All subscribed anime are still airing");
        return { deleted: 0 };
    }

    console.log(`[Cleanup] Found ${endedMalIds.length} ended anime to remove`);

    const deletedCount = deleteSubscriptionsByMalIds(endedMalIds);
    console.log(`[Cleanup] Deleted ${deletedCount} subscriptions`);

    return { deleted: deletedCount };
}
