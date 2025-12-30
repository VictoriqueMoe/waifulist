import Fuse, { IFuseOptions } from "fuse.js";
import { Anime } from "@/types/anime";
import { getRedis, getSubscriber, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";

const CSV_URL =
    "https://raw.githubusercontent.com/meesvandongen/anime-dataset/refs/heads/main/data/anime-standalone.csv";
const CDN_BASE_URL = "https://raw.githubusercontent.com/meesvandongen/anime-dataset/main/data";

// In-memory Fuse index (cannot serialize to Redis)
let fuseIndex: Fuse<Anime> | null = null;
let fuseLoadingPromise: Promise<void> | null = null;
let subscriberInitialized = false;

const FUSE_OPTIONS: IFuseOptions<Anime> = {
    keys: [
        { name: "title", weight: 0.4 },
        { name: "alternative_titles.en", weight: 0.3 },
        { name: "alternative_titles.ja", weight: 0.2 },
        { name: "genres.name", weight: 0.1 },
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 2,
};

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

function buildFuseIndex(animeList: Anime[]): void {
    fuseIndex = new Fuse(animeList, FUSE_OPTIONS);
    console.log(`[AnimeData] Built Fuse index with ${animeList.length} entries`);
}

async function saveToRedis(animeList: Anime[]): Promise<void> {
    const redis = getRedis();
    try {
        await redis.setex(REDIS_KEYS.ANIME_LIST, REDIS_TTL.ANIME_LIST, JSON.stringify(animeList));
        await redis.set(REDIS_KEYS.LAST_FETCH_TIME, new Date().toISOString());

        const pipeline = redis.pipeline();
        for (const anime of animeList) {
            pipeline.setex(REDIS_KEYS.ANIME_BY_ID(anime.id), REDIS_TTL.ANIME_LIST, JSON.stringify(anime));
        }
        await pipeline.exec();

        console.log(`[Redis] Saved ${animeList.length} anime entries (list + individual keys)`);
    } catch (error) {
        console.error("[Redis] Failed to save anime list:", error);
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

function initializeSubscriber(): void {
    if (subscriberInitialized) {
        return;
    }
    subscriberInitialized = true;

    const subscriber = getSubscriber();

    subscriber.subscribe(REDIS_KEYS.REFRESH_CHANNEL).catch(err => {
        console.error("[Redis Subscriber] Failed to subscribe:", err);
    });

    subscriber.on("message", async (channel, message) => {
        if (channel === REDIS_KEYS.REFRESH_CHANNEL && message === "refresh") {
            console.log("[Redis Subscriber] Received refresh notification, rebuilding Fuse index...");
            // Clear Fuse index to force rebuild from Redis
            fuseIndex = null;
            // Trigger rebuild
            await ensureFuseIndex();
        }
    });
}

export async function ensureFuseIndex(): Promise<void> {
    // Initialize subscriber for cluster sync
    initializeSubscriber();

    if (fuseIndex) {
        return;
    }

    if (fuseLoadingPromise) {
        return fuseLoadingPromise;
    }

    fuseLoadingPromise = (async () => {
        // Try loading from Redis first
        const cachedList = await loadFromRedis();
        if (cachedList && cachedList.length > 0) {
            buildFuseIndex(cachedList);
            return;
        }

        // Fetch from remote CSV
        const remoteCSV = await fetchRemoteCSV();
        if (remoteCSV) {
            const animeList = parseCSVContent(remoteCSV);
            buildFuseIndex(animeList);
            await saveToRedis(animeList);
            return;
        }

        console.error("No anime data available");
    })();

    try {
        await fuseLoadingPromise;
    } finally {
        fuseLoadingPromise = null;
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
    buildFuseIndex(animeList);
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
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${CDN_BASE_URL}/anime/${id}.json`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return null;
        }

        const anime: Anime = await response.json();

        // Cache to Redis
        try {
            await redis.setex(REDIS_KEYS.ANIME_BY_ID(id), REDIS_TTL.ANIME_BY_ID, JSON.stringify(anime));
        } catch (cacheError) {
            console.error(`[Redis] Failed to cache anime ${id}:`, cacheError);
        }

        return anime;
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            console.error(`[AnimeStore] Fetch anime ${id} from CDN timed out`);
        } else {
            console.error(`[AnimeStore] Failed to fetch anime ${id} from CDN:`, error);
        }
        return null;
    }
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

    // Fetch additional details from CDN if needed
    if (includeDetails && !anime.synopsis) {
        const detailedAnime = await getAnimeFromStore(id, false);
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

export async function getFuseIndex(): Promise<Fuse<Anime>> {
    await ensureFuseIndex();
    return fuseIndex!;
}

export async function findAnimeByTitle(title: string): Promise<Anime | null> {
    const fuse = await getFuseIndex();
    const results = fuse.search(title, { limit: 1 });

    if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.35) {
        return results[0].item;
    }

    return null;
}

export async function searchAnime(query: string, limit: number = 20, hideSpecials: boolean = false): Promise<Anime[]> {
    const fuse = await getFuseIndex();

    const results = fuse.search(query, { limit: limit * 3 });
    let items = results.map(result => result.item);

    if (hideSpecials) {
        items = items.filter(anime => anime.media_type !== "special");
    }

    return items.sort((a, b) => (b.mean || 0) - (a.mean || 0)).slice(0, limit);
}

const FEATURED_ANIME_IDS = [8425, 41457, 4789, 27775, 22297, 1195, 355];

export async function getFeaturedAnime(): Promise<Anime[]> {
    const results = await Promise.all(FEATURED_ANIME_IDS.map(id => getAnimeFromStore(id, true)));
    return results.filter((anime): anime is Anime => anime !== null);
}

export type BrowseSortType = "rating" | "newest";

export async function browseAnime(
    limit: number = 20,
    offset: number = 0,
    sort: BrowseSortType = "rating",
    hideSpecials: boolean = false,
): Promise<{ anime: Anime[]; total: number }> {
    const allAnime = await loadFromRedis();
    if (!allAnime) {
        return { anime: [], total: 0 };
    }

    const featuredSet = new Set(FEATURED_ANIME_IDS);

    const filtered = allAnime.filter(anime => {
        if (!anime.mean || featuredSet.has(anime.id)) {
            return false;
        }
        return !(hideSpecials && anime.media_type === "special");
    });

    const sorted =
        sort === "newest"
            ? filtered.sort((a, b) => {
                  const dateA = a.start_date || "";
                  const dateB = b.start_date || "";
                  return dateB.localeCompare(dateA);
              })
            : filtered.sort((a, b) => (b.mean || 0) - (a.mean || 0));

    return {
        anime: sorted.slice(offset, offset + limit),
        total: sorted.length,
    };
}

export async function getHomePageAnime(): Promise<{ featured: Anime[]; popular: Anime[] }> {
    const [featured, popularResult] = await Promise.all([getFeaturedAnime(), browseAnime(20)]);
    return { featured, popular: popularResult.anime };
}
