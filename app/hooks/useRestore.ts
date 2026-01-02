"use client";

import { useCallback } from "react";

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
        const response = await fetch("/api/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Restore failed");
        }
    }, []);

    return { restoreList };
}
