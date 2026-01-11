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
