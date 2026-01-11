import { BookmarkRow, TierListRow, WatchedAnimeRow } from "@/lib/db";

export interface BackupData {
    Anime: WatchedAnimeRow[];
    Bookmarks: BookmarkRow[];
    TierLists: TierListRow[];
}

export interface BackupChoices {
    Anime: boolean;
    Bookmarks: boolean;
    TierLists: boolean;
}

export const BACKUP_CHOICE_LABELS: Record<keyof BackupChoices, string> = {
    Anime: "Anime",
    Bookmarks: "List Bookmarks",
    TierLists: "Tier Lists",
};
