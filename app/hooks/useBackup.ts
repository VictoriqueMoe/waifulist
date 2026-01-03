"use client";

import { useCallback } from "react";
import { useLoading } from "@/contexts/LoadingContext";
import { dispatchBackup } from "@/services/backupService";

export function useBackup() {
    const { withLoading } = useLoading();

    const backupList = useCallback(async (): Promise<void> => {
        await withLoading(async () => {
            const text = await dispatchBackup();
            if (text === null) {
                throw new Error("Backup failed");
            }
            const blob = new Blob([text], { type: "text/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.setAttribute("href", url);
            link.setAttribute("download", "anime.json");
            link.style.display = "none";

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }, [withLoading]);

    return { backupList };
}
