import { BookmarkDTO, TierListDTO, WatchedAnimeDTO, AiringSubscriptionDTO } from "@/lib/db";

export interface BackupData {
    Anime: WatchedAnimeDTO[];
    Bookmarks: BookmarkDTO[];
    TierLists: TierListDTO[];
    AiringSubscriptions: AiringSubscriptionDTO[];
}

export interface BackupChoices {
    Anime: boolean;
    Bookmarks: boolean;
    TierLists: boolean;
    AiringSubscriptions: boolean;
}
