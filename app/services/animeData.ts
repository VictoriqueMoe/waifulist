import { Anime } from "@/types/anime";
import { getRedis, getSubscriber, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";
import { fetchAnimeFromCdn } from "@/lib/cdn";
import {
    BrowseSortType,
    clearFuseIndex,
    filterAnime,
    fuzzySearchOne,
    hasFuseIndex,
    initializeFuseIndex,
    toFilterableItems,
} from "./animeFilter";

export type { BrowseSortType };

const CSV_URL =
    "https://raw.githubusercontent.com/meesvandongen/anime-dataset/refs/heads/main/data/anime-standalone.csv";

let dataLoadingPromise: Promise<void> | null = null;
let subscriberInitialised = false;

const FEATURED_ANIME_IDS = [8425, 41457, 4789, 27775, 22297, 1195, 355];

function normaliseTitle(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "");
}
const FEATURED_IDS_SET = new Set(FEATURED_ANIME_IDS);

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function parseGenres(genresStr: string): { id: number; name: string }[] {
    if (!genresStr) {
        return [];
    }
    return genresStr.split("|").map((name, index) => ({
        id: index,
        name: name.trim(),
    }));
}

function parseStudios(studiosStr: string): { id: number; name: string }[] {
    if (!studiosStr) {
        return [];
    }
    return studiosStr.split("|").map((name, index) => ({
        id: index,
        name: name.trim(),
    }));
}

function parseCSVContent(csvContent: string): Anime[] {
    const lines = csvContent.split("\n");
    const headers = lines[0].split(",");

    const getIndex = (name: string) => headers.indexOf(name);

    const anime: Anime[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            continue;
        }

        const values = parseCSVLine(line);

        const id = parseInt(values[getIndex("id")], 10);
        if (isNaN(id)) {
            continue;
        }

        const imageUrl = values[getIndex("image")];

        anime.push({
            id,
            title: values[getIndex("title")] || values[getIndex("titleEn")] || "Unknown",
            alternative_titles: {
                en: values[getIndex("titleEn")] || undefined,
                ja: values[getIndex("titleJa")] || undefined,
            },
            main_picture: imageUrl
                ? {
                      medium: imageUrl,
                      large: imageUrl,
                  }
                : undefined,
            mean: values[getIndex("mean")] ? parseFloat(values[getIndex("mean")]) : undefined,
            rank: values[getIndex("rank")] ? parseInt(values[getIndex("rank")], 10) : undefined,
            popularity: values[getIndex("num_list_users")]
                ? parseInt(values[getIndex("num_list_users")], 10)
                : undefined,
            num_scoring_users: values[getIndex("num_scoring_users")]
                ? parseInt(values[getIndex("num_scoring_users")], 10)
                : undefined,
            num_episodes: values[getIndex("num_episodes")] ? parseInt(values[getIndex("num_episodes")], 10) : undefined,
            start_date: values[getIndex("start_date")] || undefined,
            end_date: values[getIndex("end_date")] || undefined,
            media_type: values[getIndex("media_type")] || undefined,
            status: values[getIndex("status")] || undefined,
            rating: values[getIndex("rating")] || undefined,
            genres: parseGenres(values[getIndex("genres")]),
            studios: parseStudios(values[getIndex("studios")]),
        });
    }

    return anime;
}

async function fetchRemoteCSV(): Promise<string | null> {
    try {
        console.log("Fetching anime data from remote CSV...");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(CSV_URL, {
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error("Fetch remote CSV timed out after 30s");
        } else {
            console.error("Failed to fetch remote CSV:", error);
        }
        return null;
    }
}

function buildSearchIndex(animeList: Anime[]): void {
    const filterableItems = toFilterableItems(animeList);
    initializeFuseIndex(filterableItems);
}

async function saveToRedis(animeList: Anime[]): Promise<void> {
    const redis = getRedis();
    try {
        await redis.setex(REDIS_KEYS.ANIME_LIST, REDIS_TTL.ANIME_LIST, JSON.stringify(animeList));
        await redis.set(REDIS_KEYS.LAST_FETCH_TIME, new Date().toISOString());

        // Save individual anime for fast lookups
        const pipeline = redis.pipeline();
        for (const anime of animeList) {
            pipeline.setex(REDIS_KEYS.ANIME_BY_ID(anime.id), REDIS_TTL.ANIME_LIST, JSON.stringify(anime));
        }
        await pipeline.exec();

        // Build and save pre-sorted lists for browsing
        await saveSortedLists(animeList);

        // Build and save title index for fast lookups
        await saveTitleIndex(animeList);

        console.log(`[Redis] Saved ${animeList.length} anime entries (list + individual + sorted + titles)`);
    } catch (error) {
        console.error("[Redis] Failed to save anime list:", error);
    }
}

async function saveSortedLists(animeList: Anime[]): Promise<void> {
    const redis = getRedis();

    const browsable = animeList.filter(anime => !FEATURED_IDS_SET.has(anime.id));

    const byRating = [...browsable].sort((a, b) => (b.mean || 0) - (a.mean || 0));

    const byNewest = [...browsable].sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));

    const pipeline = redis.pipeline();
    pipeline.del(REDIS_KEYS.ANIME_SORTED_RATING);
    pipeline.del(REDIS_KEYS.ANIME_SORTED_NEWEST);

    for (const anime of byRating) {
        pipeline.rpush(REDIS_KEYS.ANIME_SORTED_RATING, JSON.stringify(anime));
    }
    for (const anime of byNewest) {
        pipeline.rpush(REDIS_KEYS.ANIME_SORTED_NEWEST, JSON.stringify(anime));
    }

    pipeline.set(REDIS_KEYS.ANIME_BROWSE_COUNT, browsable.length.toString());
    pipeline.expire(REDIS_KEYS.ANIME_SORTED_RATING, REDIS_TTL.ANIME_LIST);
    pipeline.expire(REDIS_KEYS.ANIME_SORTED_NEWEST, REDIS_TTL.ANIME_LIST);

    await pipeline.exec();
    console.log(`[Redis] Saved sorted lists (${browsable.length} browsable entries)`);
}

async function saveTitleIndex(animeList: Anime[]): Promise<void> {
    const redis = getRedis();
    const pipeline = redis.pipeline();

    pipeline.del(REDIS_KEYS.ANIME_TITLE_INDEX);

    for (const anime of animeList) {
        const mainTitle = normaliseTitle(anime.title);
        if (mainTitle) {
            pipeline.hset(REDIS_KEYS.ANIME_TITLE_INDEX, mainTitle, anime.id.toString());
        }
        if (anime.alternative_titles?.en) {
            const enTitle = normaliseTitle(anime.alternative_titles.en);
            if (enTitle) {
                pipeline.hset(REDIS_KEYS.ANIME_TITLE_INDEX, enTitle, anime.id.toString());
            }
        }
    }

    pipeline.expire(REDIS_KEYS.ANIME_TITLE_INDEX, REDIS_TTL.ANIME_LIST);
    await pipeline.exec();
    console.log(`[Redis] Saved title index`);
}

async function ensureSortedLists(animeList: Anime[]): Promise<void> {
    const redis = getRedis();
    try {
        const exists = await redis.exists(REDIS_KEYS.ANIME_SORTED_RATING);
        if (!exists) {
            console.log("[Redis] Sorted lists missing, building...");
            await saveSortedLists(animeList);
        }
    } catch (error) {
        console.error("[Redis] Failed to check sorted lists:", error);
    }
}

async function ensureTitleIndex(animeList: Anime[]): Promise<void> {
    const redis = getRedis();
    try {
        const exists = await redis.exists(REDIS_KEYS.ANIME_TITLE_INDEX);
        if (!exists) {
            console.log("[Redis] Title index missing, building...");
            await saveTitleIndex(animeList);
        }
    } catch (error) {
        console.error("[Redis] Failed to check title index:", error);
    }
}

async function loadFromRedis(): Promise<Anime[] | null> {
    const redis = getRedis();
    try {
        const data = await redis.get(REDIS_KEYS.ANIME_LIST);
        if (data) {
            const animeList = JSON.parse(data) as Anime[];
            console.log(`[Redis] Loaded ${animeList.length} anime entries from cache`);
            return animeList;
        }
    } catch (error) {
        console.error("[Redis] Failed to load anime list:", error);
    }
    return null;
}

async function publishRefresh(): Promise<void> {
    const redis = getRedis();
    try {
        await redis.publish(REDIS_KEYS.REFRESH_CHANNEL, "refresh");
        console.log("[Redis] Published refresh notification");
    } catch (error) {
        console.error("[Redis] Failed to publish refresh:", error);
    }
}

function initialiseSubscriber(): void {
    if (subscriberInitialised) {
        return;
    }
    subscriberInitialised = true;

    const subscriber = getSubscriber();

    subscriber.subscribe(REDIS_KEYS.REFRESH_CHANNEL).catch(err => {
        console.error("[Redis Subscriber] Failed to subscribe:", err);
    });

    subscriber.on("message", async (channel, message) => {
        if (channel === REDIS_KEYS.REFRESH_CHANNEL && message === "refresh") {
            console.log("[Redis Subscriber] Received refresh notification, rebuilding search index...");
            clearFuseIndex();
            await ensureSearchIndex();
        }
    });
}

export async function ensureSearchIndex(): Promise<void> {
    initialiseSubscriber();

    if (hasFuseIndex()) {
        return;
    }

    if (dataLoadingPromise) {
        return dataLoadingPromise;
    }

    dataLoadingPromise = (async () => {
        const cachedList = await loadFromRedis();
        if (cachedList && cachedList.length > 0) {
            buildSearchIndex(cachedList);
            await ensureSortedLists(cachedList);
            await ensureTitleIndex(cachedList);
            return;
        }

        const remoteCSV = await fetchRemoteCSV();
        if (remoteCSV) {
            const animeList = parseCSVContent(remoteCSV);
            buildSearchIndex(animeList);
            await saveToRedis(animeList);
            return;
        }

        console.error("No anime data available");
    })();

    try {
        await dataLoadingPromise;
    } finally {
        dataLoadingPromise = null;
    }
}

export async function refreshAnimeData(): Promise<{ success: boolean; count: number; fetchTime: Date | null }> {
    const remoteCSV = await fetchRemoteCSV();
    if (!remoteCSV) {
        console.error("Failed to refresh anime data, keeping existing cache");
        const redis = getRedis();
        const data = await redis.get(REDIS_KEYS.ANIME_LIST);
        const count = data ? (JSON.parse(data) as Anime[]).length : 0;
        return {
            success: false,
            count,
            fetchTime: await getLastFetchTime(),
        };
    }

    const animeList = parseCSVContent(remoteCSV);
    buildSearchIndex(animeList);
    await saveToRedis(animeList);

    await publishRefresh();

    return {
        success: true,
        count: animeList.length,
        fetchTime: new Date(),
    };
}

export async function getLastFetchTime(): Promise<Date | null> {
    const redis = getRedis();
    try {
        const timestamp = await redis.get(REDIS_KEYS.LAST_FETCH_TIME);
        return timestamp ? new Date(timestamp) : null;
    } catch {
        return null;
    }
}

/**
 * Layered anime lookup: Redis -> CDN -> cache to Redis
 * This is the single source of truth for individual anime lookups.
 */
async function getAnimeFromStore(id: number, skipCdnFallback: boolean = false): Promise<Anime | null> {
    const redis = getRedis();

    // Check Redis
    try {
        const data = await redis.get(REDIS_KEYS.ANIME_BY_ID(id));
        if (data) {
            return JSON.parse(data) as Anime;
        }
    } catch (error) {
        console.error(`[Redis] Failed to get anime ${id}:`, error);
    }

    if (skipCdnFallback) {
        return null;
    }

    // Fetch from CDN
    const anime = await fetchAnimeFromCdn(id);
    if (!anime) {
        return null;
    }

    // Cache to Redis
    try {
        await redis.setex(REDIS_KEYS.ANIME_BY_ID(id), REDIS_TTL.ANIME_BY_ID, JSON.stringify(anime));
    } catch (cacheError) {
        console.error(`[Redis] Failed to cache anime ${id}:`, cacheError);
    }

    return anime;
}

export async function getAnimeById(
    id: number,
    includeDetails: boolean = false,
    skipCdnFallback: boolean = false,
): Promise<Anime | null> {
    // Always get from Redis (single source of truth)
    const anime = await getAnimeFromStore(id, skipCdnFallback);

    if (!anime) {
        return null;
    }

    // Fetch additional details from CDN if needed (bypass Redis cache)
    if (includeDetails && !anime.synopsis) {
        const detailedAnime = await fetchAnimeFromCdn(id);
        if (detailedAnime?.synopsis) {
            anime.synopsis = detailedAnime.synopsis;
            if (!anime.source && detailedAnime.source) {
                anime.source = detailedAnime.source;
            }
            const redis = getRedis();
            try {
                await redis.setex(REDIS_KEYS.ANIME_BY_ID(id), REDIS_TTL.ANIME_BY_ID, JSON.stringify(anime));
            } catch {}
        }
    }

    return anime;
}

/**
 * Batch fetch anime by IDs using Redis MGET (single round-trip)
 */
export async function getAnimeFromRedisByIds(ids: number[]): Promise<Map<number, Anime>> {
    const result = new Map<number, Anime>();
    if (ids.length === 0) {
        return result;
    }

    const redis = getRedis();
    const keys = ids.map(id => REDIS_KEYS.ANIME_BY_ID(id));

    try {
        const values = await redis.mget(...keys);
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            if (value) {
                result.set(ids[i], JSON.parse(value) as Anime);
            }
        }
    } catch (error) {
        console.error("[Redis] MGET failed:", error);
    }

    return result;
}

export async function lookupByTitle(title: string): Promise<Anime | null> {
    const redis = getRedis();
    const normalised = normaliseTitle(title);

    try {
        const animeId = await redis.hget(REDIS_KEYS.ANIME_TITLE_INDEX, normalised);
        if (animeId) {
            return await getAnimeById(parseInt(animeId, 10), false, true);
        }
    } catch (error) {
        console.error("[Redis] Title lookup failed:", error);
    }

    return null;
}

export async function findAnimeByTitle(title: string): Promise<Anime | null> {
    await ensureSearchIndex();
    return fuzzySearchOne(title);
}

export async function searchAnime(query: string, limit: number = 20, hideSpecials: boolean = false): Promise<Anime[]> {
    await ensureSearchIndex();
    const redis = getRedis();

    const data = await redis.get(REDIS_KEYS.ANIME_LIST);
    if (!data) {
        return [];
    }

    const allAnime = JSON.parse(data) as Anime[];
    const filterableItems = toFilterableItems(allAnime);

    const filtered = filterAnime(filterableItems, {
        query,
        searchStrategy: "fuzzy",
        hideSpecials,
        sort: "rating",
        limit,
    });

    return filtered.items.map(item => item.anime);
}

export async function getFeaturedAnime(): Promise<Anime[]> {
    const results = await Promise.all(FEATURED_ANIME_IDS.map(id => getAnimeFromStore(id, true)));
    return results.filter((anime): anime is Anime => anime !== null);
}

export async function browseAnime(
    limit: number = 20,
    offset: number = 0,
    sort: BrowseSortType = "rating",
    hideSpecials: boolean = false,
): Promise<{ anime: Anime[]; total: number }> {
    const redis = getRedis();

    const listKey = sort === "newest" ? REDIS_KEYS.ANIME_SORTED_NEWEST : REDIS_KEYS.ANIME_SORTED_RATING;

    try {
        const countStr = await redis.get(REDIS_KEYS.ANIME_BROWSE_COUNT);
        const total = countStr ? parseInt(countStr, 10) : 0;

        if (total === 0) {
            return { anime: [], total: 0 };
        }

        if (!hideSpecials) {
            const items = await redis.lrange(listKey, offset, offset + limit - 1);
            const anime = items.map(item => JSON.parse(item) as Anime);
            return { anime, total };
        }

        const items = await redis.lrange(listKey, offset, offset + limit * 3 - 1);
        const parsed = items.map(item => JSON.parse(item) as Anime);
        const filtered = parsed.filter(anime => anime.media_type !== "special");
        return { anime: filtered.slice(0, limit), total };
    } catch (error) {
        console.error("[Redis] Failed to browse anime:", error);
        return { anime: [], total: 0 };
    }
}

export async function getHomePageAnime(): Promise<{ featured: Anime[]; popular: Anime[] }> {
    const [featured, popularResult] = await Promise.all([getFeaturedAnime(), browseAnime(20)]);
    return { featured, popular: popularResult.anime };
}
