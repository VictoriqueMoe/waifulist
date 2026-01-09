import { Anime } from "@/types/anime";

export interface SeasonalResponse {
    anime: Anime[];
    total: number;
    filtered: number;
}

export async function fetchSeasonalAnime(
    year: number,
    season: string,
    limit: number,
    offset: number,
    genres: string[] = [],
): Promise<SeasonalResponse> {
    const params = new URLSearchParams({
        year: year.toString(),
        season,
        limit: limit.toString(),
        offset: offset.toString(),
    });

    if (genres.length > 0) {
        params.set("genres", genres.join(","));
    }

    const response = await fetch(`/api/anime/seasonal?${params.toString()}`);

    if (!response.ok) {
        throw new Error("Failed to fetch seasonal anime");
    }

    return response.json();
}
