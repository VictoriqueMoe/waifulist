import { BookmarkRow, TierListRow, WatchedAnimeRow, AiringSubscriptionRow } from "@/lib/db";

export interface BackupData {
    Anime: WatchedAnimeRow[];
    Bookmarks: BookmarkRow[];
    TierLists: TierListRow[];
    AiringSubscriptions: AiringSubscriptionRow[];
}

export interface BackupChoices {
    Anime: boolean;
    Bookmarks: boolean;
    TierLists: boolean;
    AiringSubscriptions: boolean;
}
