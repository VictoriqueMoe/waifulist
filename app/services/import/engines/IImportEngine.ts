import { Anime, WatchStatus } from "@/types/anime";

export type ImportType = "txt" | "mal";

export type ImportResultType = "matched" | "unmatched";

export type ImportWatchData = {
    status: WatchStatus;
    episodesWatched: number;
    rating: number | null;
    notes: string | null;
};

export type ImportResult = {
    type: ImportResultType;
    originalTitle: string;
    anime: Anime | null;
    watchData?: ImportWatchData;
};

export interface IImportEngine {
    canHandle(type: ImportType): boolean;
    getTotal(content: string): number;
    process(content: string): AsyncGenerator<ImportResult>;
}
