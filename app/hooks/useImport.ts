"use client";

import { useCallback, useState } from "react";
import { ImportComplete, ImportProgress, streamImport } from "@/services/importClientService";

export function useImport() {
    const [importing, setImporting] = useState(false);
    const [progress, setProgress] = useState<ImportProgress | null>(null);
    const [result, setResult] = useState<ImportComplete | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startImport = useCallback(async (content: string, type: string): Promise<ImportComplete | null> => {
        setImporting(true);
        setError(null);
        setResult(null);
        setProgress(null);

        try {
            let finalResult: ImportComplete | null = null;

            for await (const event of streamImport(content, type)) {
                if (event.type === "progress") {
                    setProgress(event.data);
                } else if (event.type === "complete") {
                    finalResult = event.data;
                    setResult(event.data);
                }
            }

            return finalResult;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Import failed";
            setError(message);
            return null;
        } finally {
            setImporting(false);
            setProgress(null);
        }
    }, []);

    const reset = useCallback(() => {
        setImporting(false);
        setProgress(null);
        setResult(null);
        setError(null);
    }, []);

    return {
        importing,
        progress,
        result,
        error,
        startImport,
        reset,
    };
}
