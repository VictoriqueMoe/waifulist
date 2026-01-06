import { findAnimeByTitle, lookupByTitle } from "@/services/animeData";
import type { IImportEngine, ImportResult, ImportType } from "../IImportEngine";

class TxtImportEngine implements IImportEngine {
    public canHandle(type: ImportType): boolean {
        return type === "txt";
    }

    public getTotal(content: string): number {
        return this.parseLines(content).length;
    }

    public async *process(content: string): AsyncGenerator<ImportResult> {
        const lines = this.parseLines(content);

        for (let i = 0; i < lines.length; i++) {
            const title = lines[i];

            let anime = await lookupByTitle(title);

            if (!anime) {
                anime = await findAnimeByTitle(title);
            }

            if (anime) {
                yield {
                    type: "matched",
                    originalTitle: title,
                    anime,
                    watchData: {
                        status: "completed",
                        episodesWatched: anime.episodes || 0,
                        rating: null,
                        notes: null,
                    },
                };
            } else {
                yield {
                    type: "unmatched",
                    originalTitle: title,
                    anime: null,
                };
            }
        }
    }

    private parseLines(content: string): string[] {
        return content
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }
}

export const txtImportEngine = new TxtImportEngine();
