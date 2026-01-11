"use client";

import { useCallback } from "react";
import { dispatchRestore } from "@/services/backupService";
import { WatchedAnimeRow } from "@/lib/db";
import { BackupData, BackupChoices } from "@/types/backup";

export function useRestore() {
    const restoreList = useCallback(async (selectedFile: File, choices: BackupChoices): Promise<void> => {
        const checkBackupFile = (text: string): boolean => {
            const fields: string[] = [
                "id",
                "user_id",
                "anime_id",
                "status",
                "episodes_watched",
                "rating",
                "date_added",
                "date_updated",
            ];
            for (const field of fields) {
                if (!text.includes(field)) {
                    return false;
                }
            }
            return true;
        };

        const checkBackupVersion = (text: string): number => {
            const fields: string[] = ["Anime", "Bookmarks", "TierLists"];
            for (const field of fields) {
                if (!text.includes(field)) {
                    return 1;
                }
            }
            return 2;
        };

        const content = await selectedFile.text();
        if (!checkBackupFile(content)) {
            throw new Error("File does not contain correct fields");
        }
        let response: boolean | null = null;
        switch (checkBackupVersion(content)) {
            case 1:
                const anime = JSON.parse(content) as WatchedAnimeRow[];
                const restoreData: BackupData = {
                    Anime: choices.Anime ? [...anime] : [],
                    Bookmarks: [],
                    TierLists: [],
                };
                response = await dispatchRestore(JSON.stringify(restoreData));
                break;
            case 2:
                const allData = JSON.parse(content) as BackupData;
                const toRestore: BackupData = {
                    Anime: choices.Anime ? [...allData.Anime] : [],
                    Bookmarks: choices.Bookmarks ? [...allData.Bookmarks] : [],
                    TierLists: choices.TierLists ? [...allData.TierLists] : [],
                };
                response = await dispatchRestore(JSON.stringify(toRestore));
                break;
        }
        if (response === null) {
            throw new Error("Restore Failed");
        }
    }, []);

    return { restoreList };
}
