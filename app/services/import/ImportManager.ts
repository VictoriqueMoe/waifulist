import { Anime, WatchStatus } from "@/types/anime";
import { ensureSearchIndex } from "@/services/animeData";
import { getImportEngine } from "./ImportEngineFactory";
import type { ImportType } from "./engines/IImportEngine";

export type MatchedImport = {
    title: string;
    anime: Anime;
    watchData: {
        status: WatchStatus;
        episodesWatched: number;
        rating: number | null;
        notes: string | null;
    };
};

export type ProgressEvent = {
    type: "progress";
    current: number;
    total: number;
    matchedCount: number;
};

export type CompleteEvent = {
    type: "complete";
    matched: MatchedImport[];
    unmatched: string[];
    total: number;
};

export type ImportEvent = ProgressEvent | CompleteEvent;

export type ImportOptions = {
    content: string;
    type: ImportType;
    signal: AbortSignal;
    onEvent: (event: ImportEvent) => void;
};

export async function runImport(options: ImportOptions): Promise<void> {
    const { content, type, signal, onEvent } = options;

    const engine = getImportEngine(type);
    if (!engine) {
        throw new Error(`Unsupported import type: ${type}`);
    }

    await ensureSearchIndex();

    const total = engine.getTotal(content);
    const matched: MatchedImport[] = [];
    const unmatched: string[] = [];
    let current = 0;
    let fuzzySearchCount = 0;

    const generator = engine.process(content);

    for await (const result of generator) {
        if (signal.aborted) {
            console.log("Import cancelled by client");
            return;
        }

        current++;

        if (result.type === "matched" && result.anime && result.watchData) {
            matched.push({
                title: result.originalTitle,
                anime: result.anime,
                watchData: result.watchData,
            });
        } else {
            unmatched.push(result.originalTitle);
            fuzzySearchCount++;
        }

        if (current % 100 === 0 || current === total) {
            if (signal.aborted) {
                return;
            }

            onEvent({
                type: "progress",
                current,
                total,
                matchedCount: matched.length,
            });
        }
    }

    console.log(
        `Import complete: ${matched.length} matched, ${unmatched.length} unmatched, ${fuzzySearchCount} fuzzy searches`,
    );

    if (signal.aborted) {
        return;
    }

    onEvent({
        type: "complete",
        matched,
        unmatched,
        total,
    });
}
