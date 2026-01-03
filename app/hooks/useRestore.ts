"use client";

import { useCallback } from "react";
import { dispatchRestore } from "@/services/backupService";

export function useRestore() {
    const restoreList = useCallback(async (selectedFile: File): Promise<void> => {
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

        const content = await selectedFile.text();
        if (!checkBackupFile(content)) {
            throw new Error("File does not contain correct fields");
        }
        const response = dispatchRestore(content);
        if (response === null) {
            throw new Error("Restore Failed");
        }
    }, []);

    return { restoreList };
}
