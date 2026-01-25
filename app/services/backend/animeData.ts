import { Anime, IdList, MangaIdList, TopReviewWithAnime } from "@/types/anime";
import { getRedis, getSubscriber, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";
import { fetchAnimeFromCdn, fetchTopReviews } from "@/lib/jikanApi";
import { enrichAnime, needsEnrichment } from "./animeEnrichmentPipeline";
import { getCurrentSeason, parseSeasonFromStartDate, Season } from "@/lib/utils/seasonUtils";
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
const PEOPLE_URL = "https://raw.githubusercontent.com/purarue/mal-id-cache/master/cache/people_cache.json";
const CHARACTER_URL =
    "https://raw.githubusercontent.com/purarue/mal-id-cache/refs/heads/master/cache/character_cache.json";
const MANGA_URL = "https://raw.githubusercontent.com/purarue/mal-id-cache/refs/heads/master/cache/manga_cache.json";
const PRODUCER_URL = "https://raw.githubusercontent.com/nakedmcse/mal-id-cache/refs/heads/main/producers.json";

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

function parseGenres(genresStr: string): { mal_id: number; name: string }[] {
    if (!genresStr) {
        return [];
    }
    return genresStr.split(",").map((name, index) => ({
        mal_id: index,
        name: name.trim(),
    }));
}

function parseStudios(studiosStr: string): { mal_id: number; name: string }[] {
    if (!studiosStr) {
        return [];
    }
    return studiosStr.split(",").map((name, index) => ({
        mal_id: index,
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

        const mal_id = parseInt(values[getIndex("id")], 10);
        if (isNaN(mal_id)) {
            continue;
        }

        const imageUrl = values[getIndex("image")];
        const startDate = values[getIndex("start_date")] || undefined;
        const endDate = values[getIndex("end_date")] || undefined;

        anime.push({
            mal_id,
            title: values[getIndex("title")] || values[getIndex("titleEn")] || "Unknown",
            title_english: values[getIndex("titleEn")] || undefined,
            title_japanese: values[getIndex("titleJa")] || undefined,
            images: imageUrl
                ? {
                      jpg: {
                          image_url: imageUrl,
                          small_image_url: imageUrl,
                          large_image_url: imageUrl,
                      },
                  }
                : undefined,
            score: values[getIndex("mean")] ? parseFloat(values[getIndex("mean")]) : undefined,
            rank: values[getIndex("rank")] ? parseInt(values[getIndex("rank")], 10) : undefined,
            popularity: values[getIndex("num_list_users")]
                ? parseInt(values[getIndex("num_list_users")], 10)
                : undefined,
            scored_by: values[getIndex("num_scoring_users")]
                ? parseInt(values[getIndex("num_scoring_users")], 10)
                : undefined,
            episodes: values[getIndex("num_episodes")] ? parseInt(values[getIndex("num_episodes")], 10) : undefined,
            aired: startDate || endDate ? { from: startDate, to: endDate } : undefined,
            type: values[getIndex("media_type")] || undefined,
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

async function fetchPeopleIds(): Promise<IdList | null> {
    try {
        console.log("Fetching people ids from remote JSON...");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(PEOPLE_URL, {
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        return (await response.json()) as IdList;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error("Fetch people ids timed out after 30s");
        } else {
            console.error("Failed to fetch people ids:", error);
        }
        return null;
    }
}

async function fetchCharacterIds(): Promise<IdList | null> {
    try {
        console.log("Fetching character ids from remote JSON...");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(CHARACTER_URL, {
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        return (await response.json()) as IdList;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error("Fetch character ids timed out after 30s");
        } else {
            console.error("Failed to fetch character ids:", error);
        }
        return null;
    }
}

async function fetchProducerIds(): Promise<IdList | null> {
    try {
        console.log("Fetching producer ids from remote JSON...");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(PRODUCER_URL, {
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        return (await response.json()) as IdList;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error("Fetch character ids timed out after 30s");
        } else {
            console.error("Failed to fetch character ids:", error);
        }
        return null;
    }
}

async function fetchMangaIds(): Promise<IdList | null> {
    try {
        console.log("Fetching manga ids from remote JSON...");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(MANGA_URL, {
            cache: "no-store",
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) {
            throw new Error(`Failed to fetch manga: ${response.status}`);
        }
        const mangaIds = (await response.json()) as MangaIdList;
        return { ids: [...mangaIds.sfw, ...mangaIds.nsfw] };
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error("Fetch manga ids timed out after 30s");
        } else {
            console.error("Failed to fetch manga ids:", error);
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
            pipeline.setex(REDIS_KEYS.ANIME_BY_ID(anime.mal_id), REDIS_TTL.ANIME_LIST, JSON.stringify(anime));
        }
        await pipeline.exec();

        await saveLists(animeList);

        console.log(`[Redis] Saved ${animeList.length} anime entries`);
    } catch (error) {
        console.error("[Redis] Failed to save anime list:", error);
    }
}

async function saveSortedLists(animeList: Anime[]): Promise<void> {
    const redis = getRedis();

    const browsable = animeList.filter(anime => !FEATURED_IDS_SET.has(anime.mal_id));

    const byRating = [...browsable].sort((a, b) => (b.score || 0) - (a.score || 0));

    const byNewest = [...browsable].sort((a, b) => (b.aired?.from || "").localeCompare(a.aired?.from || ""));

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
            pipeline.hset(REDIS_KEYS.ANIME_TITLE_INDEX, mainTitle, anime.mal_id.toString());
        }
        if (anime.title_english) {
            const enTitle = normaliseTitle(anime.title_english);
            if (enTitle) {
                pipeline.hset(REDIS_KEYS.ANIME_TITLE_INDEX, enTitle, anime.mal_id.toString());
            }
        }
    }

    pipeline.expire(REDIS_KEYS.ANIME_TITLE_INDEX, REDIS_TTL.ANIME_LIST);
    await pipeline.exec();
    console.log(`[Redis] Saved title index`);
}

async function saveSeasonalLists(animeList: Anime[]): Promise<void> {
    const redis = getRedis();
    const seasonMap = new Map<string, Anime[]>();

    for (const anime of animeList) {
        const parsed = parseSeasonFromStartDate(anime.aired?.from);
        if (!parsed) {
            continue;
        }
        const key = `${parsed.year}:${parsed.season}`;
        const existing = seasonMap.get(key) || [];
        existing.push(anime);
        seasonMap.set(key, existing);
    }

    for (const [, animeList] of seasonMap) {
        animeList.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    const pipeline = redis.pipeline();

    for (const [key, animeList] of seasonMap) {
        const [yearStr, season] = key.split(":");
        const year = parseInt(yearStr, 10);
        const listKey = REDIS_KEYS.ANIME_SEASON(year, season);
        const countKey = REDIS_KEYS.ANIME_SEASON_COUNT(year, season);

        pipeline.del(listKey);
        for (const anime of animeList) {
            pipeline.rpush(listKey, JSON.stringify(anime));
        }
        pipeline.set(countKey, animeList.length.toString());
        pipeline.expire(listKey, REDIS_TTL.ANIME_LIST);
        pipeline.expire(countKey, REDIS_TTL.ANIME_LIST);
    }

    await pipeline.exec();
    console.log(`[Redis] Saved ${seasonMap.size} seasonal lists`);
}

async function saveGenresList(animeList: Anime[]): Promise<void> {
    const redis = getRedis();
    const genreSet = new Set<string>();
    for (const anime of animeList) {
        if (anime.genres) {
            for (const genre of anime.genres) {
                genreSet.add(genre.name);
            }
        }
    }
    const genres = Array.from(genreSet).sort();
    await redis.setex(REDIS_KEYS.ANIME_GENRES, REDIS_TTL.ANIME_LIST, JSON.stringify(genres));
    console.log(`[Redis] Saved ${genres.length} genres`);
}

async function saveLists(animeList: Anime[]): Promise<void> {
    await saveSortedLists(animeList);
    await saveTitleIndex(animeList);
    await saveSeasonalLists(animeList);
    await saveGenresList(animeList);
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

async function ensureSeasonalLists(animeList: Anime[]): Promise<void> {
    const redis = getRedis();
    try {
        const { year, season } = getCurrentSeason();
        const exists = await redis.exists(REDIS_KEYS.ANIME_SEASON(year, season));
        if (!exists) {
            console.log("[Redis] Seasonal lists missing, building...");
            await saveSeasonalLists(animeList);
        }
    } catch (error) {
        console.error("[Redis] Failed to check seasonal lists:", error);
    }
}

async function ensureGenresList(animeList: Anime[]): Promise<void> {
    const redis = getRedis();
    try {
        const exists = await redis.exists(REDIS_KEYS.ANIME_GENRES);
        if (!exists) {
            console.log("[Redis] Genres list missing, building...");
            await saveGenresList(animeList);
        }
    } catch (error) {
        console.error("[Redis] Failed to check genres list:", error);
    }
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

async function ensureLists(cachedList: Anime[]): Promise<void> {
    await ensureSortedLists(cachedList);
    await ensureTitleIndex(cachedList);
    await ensureSeasonalLists(cachedList);
    await ensureGenresList(cachedList);
}

export async function getAllAnimeFromRedis(): Promise<Anime[] | null> {
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
        const cachedList = await getAllAnimeFromRedis();
        if (cachedList && cachedList.length > 0) {
            buildSearchIndex(cachedList);
            await ensureLists(cachedList);
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
        await redis.setex(REDIS_KEYS.ANIME_BY_ID(id), REDIS_TTL.JIKAN_ENRICHED_ANIME, JSON.stringify(anime));
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

    // Enrich anime if needed
    if (includeDetails && needsEnrichment(anime)) {
        return enrichAnime(anime);
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

export async function searchAnime(
    query: string,
    limit: number = 20,
    hideSpecials: boolean = false,
    genres: string[] = [],
): Promise<Anime[]> {
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
        genres,
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
    genres: string[] = [],
): Promise<{ anime: Anime[]; total: number }> {
    const redis = getRedis();
    const listKey = sort === "newest" ? REDIS_KEYS.ANIME_SORTED_NEWEST : REDIS_KEYS.ANIME_SORTED_RATING;

    try {
        const countStr = await redis.get(REDIS_KEYS.ANIME_BROWSE_COUNT);
        const total = countStr ? parseInt(countStr, 10) : 0;

        if (total === 0) {
            return { anime: [], total: 0 };
        }

        if (genres.length === 0 && !hideSpecials) {
            const items = await redis.lrange(listKey, offset, offset + limit - 1);
            const anime = items.map(item => JSON.parse(item) as Anime);
            return { anime, total };
        }

        const data = await redis.get(REDIS_KEYS.ANIME_LIST);
        if (!data) {
            return { anime: [], total: 0 };
        }

        const allAnime = JSON.parse(data) as Anime[];
        const filterableItems = toFilterableItems(allAnime);

        const filtered = filterAnime(filterableItems, {
            hideSpecials,
            genres,
            sort,
            limit,
            offset,
        });

        return { anime: filtered.items.map(item => item.anime), total: filtered.filtered };
    } catch (error) {
        console.error("[Redis] Failed to browse anime:", error);
        return { anime: [], total: 0 };
    }
}

export async function getHomePageAnime(): Promise<{ popular: Anime[]; reviews: TopReviewWithAnime[] }> {
    const [popularResult, reviews] = await Promise.all([browseAnime(20), getTopReviews(6)]);
    return { popular: popularResult.anime, reviews };
}

export async function getAnimeBySeason(
    year: number,
    season: Season,
    options?: { limit?: number; offset?: number; genres?: string[] },
): Promise<{ anime: Anime[]; total: number; filtered: number }> {
    const redis = getRedis();
    const listKey = REDIS_KEYS.ANIME_SEASON(year, season);
    const countKey = REDIS_KEYS.ANIME_SEASON_COUNT(year, season);
    const limit = options?.limit ?? 24;
    const offset = options?.offset ?? 0;
    const genres = options?.genres ?? [];

    try {
        const countStr = await redis.get(countKey);
        const total = countStr ? parseInt(countStr, 10) : 0;

        if (total === 0) {
            return { anime: [], total: 0, filtered: 0 };
        }

        if (genres.length > 0) {
            const allItems = await redis.lrange(listKey, 0, -1);
            let allAnime = allItems.map(item => JSON.parse(item) as Anime);
            allAnime = allAnime.filter(anime => {
                const animeGenres = anime.genres?.map(g => g.name) || [];
                for (const genre of genres) {
                    if (!animeGenres.includes(genre)) {
                        return false;
                    }
                }
                return true;
            });
            const filtered = allAnime.length;
            const paged = allAnime.slice(offset, offset + limit);
            return { anime: paged, total, filtered };
        }

        const items = await redis.lrange(listKey, offset, offset + limit - 1);
        const anime = items.map(item => JSON.parse(item) as Anime);

        return { anime, total, filtered: total };
    } catch (error) {
        console.error(`[Redis] Failed to get seasonal anime for ${season} ${year}:`, error);
        return { anime: [], total: 0, filtered: 0 };
    }
}

export async function getTopReviews(limit: number = 6): Promise<TopReviewWithAnime[]> {
    const reviews = await fetchTopReviews(limit);
    if (reviews.length === 0) {
        return [];
    }

    const animeIds = reviews.map(r => r.entry.mal_id);
    const animeMap = await getAnimeFromRedisByIds(animeIds);

    return reviews.map(review => ({
        ...review,
        anime: animeMap.get(review.entry.mal_id) || null,
    }));
}

export async function getPeopleIds(): Promise<IdList> {
    try {
        const redis = getRedis();
        const cachedIds = await redis.get(REDIS_KEYS.ANIME_PEOPLE_IDS);
        if (cachedIds) {
            return JSON.parse(cachedIds) as IdList;
        }
    } catch (error) {
        console.error(`Failed to retrieve people ids from redis: ${error}`);
    }

    const ids = await fetchPeopleIds();

    try {
        const redis = getRedis();
        await redis.setex(REDIS_KEYS.ANIME_PEOPLE_IDS, REDIS_TTL.ANIME_PEOPLE_IDS, JSON.stringify(ids));
        console.log(`[Redis] Saved ${ids?.ids.length} people ids`);
    } catch (error) {
        console.error("[Redis] Failed to save people ids:", error);
    }
    return ids ?? { ids: [] };
}

export async function getCharacterIds(): Promise<IdList> {
    try {
        const redis = getRedis();
        const cachedIds = await redis.get(REDIS_KEYS.ANIME_CHARACTER_IDS);
        if (cachedIds) {
            return JSON.parse(cachedIds) as IdList;
        }
    } catch (error) {
        console.error(`Failed to retrieve character ids from redis: ${error}`);
    }

    const ids = await fetchCharacterIds();

    try {
        const redis = getRedis();
        await redis.setex(REDIS_KEYS.ANIME_CHARACTER_IDS, REDIS_TTL.ANIME_CHARACTER_IDS, JSON.stringify(ids));
        console.log(`[Redis] Saved ${ids?.ids.length} character ids`);
    } catch (error) {
        console.error("[Redis] Failed to save character ids:", error);
    }
    return ids ?? { ids: [] };
}

export async function getProducerIds(): Promise<IdList> {
    try {
        const redis = getRedis();
        const cachedIds = await redis.get(REDIS_KEYS.ANIME_PRODUCER_IDS);
        if (cachedIds) {
            return JSON.parse(cachedIds) as IdList;
        }
    } catch (error) {
        console.error(`Failed to retrieve producer ids from redis: ${error}`);
    }

    const ids = await fetchProducerIds();

    try {
        const redis = getRedis();
        await redis.setex(REDIS_KEYS.ANIME_PRODUCER_IDS, REDIS_TTL.ANIME_PRODUCER_IDS, JSON.stringify(ids));
        console.log(`[Redis] Saved ${ids?.ids.length} producer ids`);
    } catch (error) {
        console.error("[Redis] Failed to save producer ids:", error);
    }
    return ids ?? { ids: [] };
}

export async function getMangaIds(): Promise<IdList> {
    try {
        const redis = getRedis();
        const cachedIds = await redis.get(REDIS_KEYS.ANIME_MANGA_IDS);
        if (cachedIds) {
            return JSON.parse(cachedIds) as IdList;
        }
    } catch (error) {
        console.error(`Failed to retrieve manga ids from redis: ${error}`);
    }

    const ids = await fetchMangaIds();

    try {
        const redis = getRedis();
        await redis.setex(REDIS_KEYS.ANIME_MANGA_IDS, REDIS_TTL.ANIME_MANGA_IDS, JSON.stringify(ids));
        console.log(`[Redis] Saved ${ids?.ids.length} manga ids`);
    } catch (error) {
        console.error("[Redis] Failed to save manga ids:", error);
    }
    return ids ?? { ids: [] };
}

export async function getAllGenres(): Promise<string[]> {
    const redis = getRedis();
    try {
        const data = await redis.get(REDIS_KEYS.ANIME_GENRES);
        if (!data) {
            return [];
        }
        return JSON.parse(data) as string[];
    } catch (error) {
        console.error("[Redis] Failed to get genres:", error);
        return [];
    }
}
