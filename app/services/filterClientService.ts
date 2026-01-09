import { WatchStatus } from "@/types/anime";
import { UnifiedSortType, WatchListResponse } from "@/types/filter";

export interface FilterParams {
    query?: string;
    sort: UnifiedSortType;
    status: WatchStatus | "all";
    page: number;
    genres: string[];
}

export async function fetchFilteredList(apiEndpoint: string, params: FilterParams): Promise<WatchListResponse> {
    const searchParams = new URLSearchParams();

    if (params.query) {
        searchParams.set("q", params.query);
    }
    searchParams.set("sort", params.sort);
    if (params.status !== "all") {
        searchParams.set("status", params.status);
    }
    searchParams.set("page", String(params.page));
    if (params.genres.length > 0) {
        searchParams.set("genres", params.genres.join(","));
    }

    const url = `${apiEndpoint}?${searchParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Failed to fetch");
    }

    return response.json();
}
