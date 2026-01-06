import { WatchStatus } from "@/types/anime";
import { getAnimeById } from "@/services/animeData";
import type { IImportEngine, ImportResult, ImportType, ImportWatchData } from "../IImportEngine";

interface MalAnimeEntry {
    malId: number;
    title: string;
    watchData: ImportWatchData;
}

const MAL_STATUS_MAP: Record<string, WatchStatus> = {
    Watching: "watching",
    Completed: "completed",
    "On-Hold": "on_hold",
    Dropped: "dropped",
    "Plan to Watch": "plan_to_watch",
};

class MalImportEngine implements IImportEngine {
    public canHandle(type: ImportType): boolean {
        return type === "mal";
    }

    public getTotal(content: string): number {
        return this.parseEntries(content).length;
    }

    public async *process(content: string): AsyncGenerator<ImportResult> {
        const entries = this.parseEntries(content);

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            const anime = await getAnimeById(entry.malId);

            if (anime) {
                yield {
                    type: "matched",
                    originalTitle: entry.title,
                    anime,
                    watchData: entry.watchData,
                };
            } else {
                yield {
                    type: "unmatched",
                    originalTitle: entry.title,
                    anime: null,
                };
            }
        }
    }

    private parseEntries(content: string): MalAnimeEntry[] {
        const entries: MalAnimeEntry[] = [];
        const animeRegex = /<anime>([\s\S]*?)<\/anime>/g;

        let match;
        while ((match = animeRegex.exec(content)) !== null) {
            const animeBlock = match[1];

            const idMatch = animeBlock.match(/<series_animedb_id>(\d+)<\/series_animedb_id>/);
            const titleMatch = animeBlock.match(/<series_title><!\[CDATA\[(.*?)]]><\/series_title>/);
            const statusMatch = animeBlock.match(/<my_status>(.*?)<\/my_status>/);
            const scoreMatch = animeBlock.match(/<my_score>(\d+)<\/my_score>/);
            const episodesMatch = animeBlock.match(/<my_watched_episodes>(\d+)<\/my_watched_episodes>/);
            const commentsMatch = animeBlock.match(/<my_comments><!\[CDATA\[(.*?)]]><\/my_comments>/);

            if (idMatch && titleMatch) {
                const malStatus = statusMatch?.[1] || "Plan to Watch";
                const status = MAL_STATUS_MAP[malStatus] || "plan_to_watch";
                const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
                const episodes = episodesMatch ? parseInt(episodesMatch[1], 10) : 0;
                const comments = commentsMatch?.[1]?.trim() || null;

                entries.push({
                    malId: parseInt(idMatch[1], 10),
                    title: titleMatch[1],
                    watchData: {
                        status,
                        episodesWatched: episodes,
                        rating: score > 0 ? score : null,
                        notes: comments || null,
                    },
                });
            }
        }

        return entries;
    }
}

export const malImportEngine = new MalImportEngine();
