import fs from "fs";
import path from "path";
import Fuse, { IFuseOptions } from "fuse.js";
import { Anime } from "@/types/anime";

const CDN_BASE_URL = "https://raw.githubusercontent.com/meesvandongen/anime-dataset/main/data";

let animeCache: Anime[] | null = null;
let animeByIdCache: Map<number, Anime> | null = null;
let animeTitleIndex: Map<string, Anime> | null = null;
let fuseIndex: Fuse<Anime> | null = null;
let usingLocalData = false;

function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s]/g, "");
}

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

function loadLocalCSV(): string | null {
    try {
        const csvPath = path.join(process.cwd(), "data", "anime.csv");
        if (fs.existsSync(csvPath)) {
            return fs.readFileSync(csvPath, "utf-8");
        }
    } catch (error) {
        console.warn("Failed to load local CSV:", error);
    }
    return null;
}

async function fetchRemoteCSV(): Promise<string | null> {
    try {
        console.log("Fetching anime data from CDN...");
        const response = await fetch(`${CDN_BASE_URL}/anime-standalone.csv`);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error("Failed to fetch remote CSV:", error);
        return null;
    }
}

export async function loadAnimeData(): Promise<Anime[]> {
    if (animeCache) {
        return animeCache;
    }

    const localCSV = loadLocalCSV();
    if (localCSV) {
        console.log("Using local anime data");
        usingLocalData = true;
        animeCache = parseCSVContent(localCSV);
        return animeCache;
    }

    const remoteCSV = await fetchRemoteCSV();
    if (remoteCSV) {
        console.log("Using remote anime data from CDN");
        usingLocalData = false;
        animeCache = parseCSVContent(remoteCSV);
        return animeCache;
    }

    console.error("No anime data available");
    return [];
}

async function fetchAnimeFromCDN(id: number): Promise<Anime | null> {
    try {
        const response = await fetch(`${CDN_BASE_URL}/anime/${id}.json`);
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch anime ${id} from CDN:`, error);
        return null;
    }
}

export async function getAnimeById(id: number, includeDetails: boolean = false): Promise<Anime | null> {
    if (!animeByIdCache) {
        const allAnime = await loadAnimeData();
        animeByIdCache = new Map(allAnime.map(a => [a.id, a]));
    }

    const cached = animeByIdCache.get(id);

    if (cached) {
        if (includeDetails && !cached.synopsis) {
            const cdnData = await fetchAnimeFromCDN(id);
            if (cdnData?.synopsis) {
                cached.synopsis = cdnData.synopsis;
                if (!cached.source && cdnData.source) {
                    cached.source = cdnData.source;
                }
            }
        }
        return cached;
    }

    console.log(`Anime ${id} not in local data, fetching from CDN...`);
    const remote = await fetchAnimeFromCDN(id);
    if (remote) {
        animeByIdCache.set(id, remote);
    }
    return remote;
}

export async function getFuseIndex(): Promise<Fuse<Anime>> {
    const allAnime = await loadAnimeData();

    if (!fuseIndex) {
        fuseIndex = new Fuse(allAnime, FUSE_OPTIONS);
    }

    return fuseIndex;
}

export async function getTitleIndex(): Promise<Map<string, Anime>> {
    const allAnime = await loadAnimeData();

    if (!animeTitleIndex) {
        animeTitleIndex = new Map();

        for (const anime of allAnime) {
            animeTitleIndex.set(normalizeTitle(anime.title), anime);

            if (anime.alternative_titles?.en) {
                animeTitleIndex.set(normalizeTitle(anime.alternative_titles.en), anime);
            }
            if (anime.alternative_titles?.ja) {
                animeTitleIndex.set(normalizeTitle(anime.alternative_titles.ja), anime);
            }
        }
    }

    return animeTitleIndex;
}

export async function findAnimeByTitle(title: string): Promise<Anime | null> {
    const titleIndex = await getTitleIndex();
    const normalized = normalizeTitle(title);

    const exactMatch = titleIndex.get(normalized);
    if (exactMatch) {
        return exactMatch;
    }

    const fuse = await getFuseIndex();
    const results = fuse.search(title, { limit: 1 });

    if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.35) {
        return results[0].item;
    }

    return null;
}

export async function searchAnime(query: string, limit: number = 20): Promise<Anime[]> {
    const fuse = await getFuseIndex();

    const results = fuse.search(query, { limit: limit * 3 });
    const items = results.map(result => result.item);

    return items.sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity)).slice(0, limit);
}

const FEATURED_ANIME_IDS = [8425, 41457, 4789, 27775, 22297, 1195, 355];

export async function getFeaturedAnime(): Promise<Anime[]> {
    const allAnime = await loadAnimeData();

    if (!animeByIdCache) {
        animeByIdCache = new Map(allAnime.map(a => [a.id, a]));
    }

    const featured: Anime[] = [];
    for (const id of FEATURED_ANIME_IDS) {
        const anime = animeByIdCache.get(id);
        if (anime) {
            featured.push(anime);
        }
    }
    return featured;
}

export async function getPopularAnime(limit: number = 20): Promise<Anime[]> {
    const allAnime = await loadAnimeData();

    const featuredSet = new Set(FEATURED_ANIME_IDS);

    return allAnime
        .filter(anime => anime.mean && anime.rank && !featuredSet.has(anime.id))
        .sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity))
        .slice(0, limit);
}

export async function getHomePageAnime(): Promise<{ featured: Anime[]; popular: Anime[] }> {
    const [featured, popular] = await Promise.all([getFeaturedAnime(), getPopularAnime(20)]);
    return { featured, popular };
}

export function isUsingLocalData(): boolean {
    return usingLocalData;
}
