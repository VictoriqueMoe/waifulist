import { TierListRow, WatchedAnimeRow, BookmarkRow } from "@/lib/db";

export interface BackupData {
    Anime: WatchedAnimeRow[];
    Bookmarks: BookmarkRow[];
    TierLists: TierListRow[];
}
