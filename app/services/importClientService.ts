import { Anime, WatchStatus } from "@/types/anime";

export interface ImportProgress {
    current: number;
    total: number;
    matchedCount: number;
}

export interface ImportMatch {
    title: string;
    anime: Anime;
    watchData: {
        status: WatchStatus;
        episodesWatched: number;
        rating: number | null;
        notes: string | null;
    };
}

export interface ImportComplete {
    matched: ImportMatch[];
    unmatched: string[];
    total: number;
}

export type ImportEvent = { type: "progress"; data: ImportProgress } | { type: "complete"; data: ImportComplete };

export async function* streamImport(content: string, type: string): AsyncGenerator<ImportEvent, void, unknown> {
    const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
    }

    const reader = response.body?.getReader();
    if (!reader) {
        throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = JSON.parse(line.slice(6));

                if (data.type === "progress") {
                    yield {
                        type: "progress",
                        data: {
                            current: data.current,
                            total: data.total,
                            matchedCount: data.matchedCount,
                        },
                    };
                } else if (data.type === "complete") {
                    yield {
                        type: "complete",
                        data: {
                            matched: data.matched,
                            unmatched: data.unmatched,
                            total: data.total,
                        },
                    };
                }
            }
        }
    }
}
