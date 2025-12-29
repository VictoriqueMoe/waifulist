"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Anime } from "@/types/anime";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchList } from "@/contexts/WatchListContext";
import { getAnimeBatch } from "@/services/animeService";
import { AnimeListView, WatchedItem } from "@/components/AnimeListView/AnimeListView";
import { Button } from "@/components/Button/Button";
import styles from "./page.module.scss";

interface ImportResult {
    matched: { title: string; anime: Anime }[];
    unmatched: string[];
    total: number;
}

export default function MyListPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { getAllWatched, bulkAddToWatchList, loading: contextLoading } = useWatchList();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const [animeData, setAnimeData] = useState<Map<number, Anime>>(new Map());
    const [loading, setLoading] = useState(true);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importProgress, setImportProgress] = useState<{
        current: number;
        total: number;
        matchedCount: number;
    } | null>(null);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const watchedItems = getAllWatched();
    const watchedIdsKey = watchedItems
        .map(item => item.animeId)
        .sort((a, b) => a - b)
        .join(",");

    const convertedItems: WatchedItem[] = useMemo(() => {
        return watchedItems.map(item => ({
            animeId: item.animeId,
            status: item.status,
            rating: item.rating ?? null,
            dateAdded: item.dateAdded,
        }));
    }, [watchedItems]);

    useEffect(() => {
        if (contextLoading || !watchedIdsKey) {
            if (!contextLoading && !watchedIdsKey) {
                setLoading(false);
            }
            return;
        }

        const ids = watchedIdsKey.split(",").map(Number);

        let cancelled = false;
        setLoading(true);

        getAnimeBatch(ids).then(newData => {
            if (!cancelled) {
                setAnimeData(newData);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [contextLoading, watchedIdsKey]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    }, []);

    const handleExport = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Export failed");
            }

            const text = await response.text();
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
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleImport = useCallback(async () => {
        if (!selectedFile) {
            return;
        }

        setImporting(true);
        setImportError(null);
        setImportResult(null);
        setImportProgress(null);

        try {
            const content = await selectedFile.text();

            const response = await fetch("/api/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Import failed");
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No response body");
            }

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === "progress") {
                            setImportProgress({
                                current: data.current,
                                total: data.total,
                                matchedCount: data.matchedCount,
                            });
                        } else if (data.type === "complete") {
                            const result: ImportResult = {
                                matched: data.matched,
                                unmatched: data.unmatched,
                                total: data.total,
                            };
                            setImportResult(result);

                            const animeIds = result.matched.map(m => m.anime.id);
                            bulkAddToWatchList(animeIds, "completed");

                            const newAnimeData = new Map(animeData);
                            result.matched.forEach(m => {
                                newAnimeData.set(m.anime.id, m.anime);
                            });
                            setAnimeData(newAnimeData);
                        }
                    }
                }
            }
        } catch (error) {
            setImportError(error instanceof Error ? error.message : "Import failed");
        } finally {
            setImporting(false);
            setImportProgress(null);
        }
    }, [selectedFile, bulkAddToWatchList, animeData]);

    const closeModal = useCallback(() => {
        setShowImportModal(false);
        setImportResult(null);
        setImportError(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const handleShareList = useCallback(async () => {
        if (!user?.publicId) {
            return;
        }
        const shareUrl = `${window.location.origin}/list/${user.publicId}`;
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [user?.publicId]);

    if (authLoading || !user) {
        return (
            <div className={styles.page}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    const headerActions = (
        <>
            <Button variant="secondary" onClick={handleShareList}>
                <i className={copied ? "bi bi-check" : "bi bi-share"} /> {copied ? "Link Copied!" : "Share List"}
            </Button>
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                <i className="bi bi-upload" /> Import List
            </Button>
            <Button variant="secondary" onClick={handleExport}>
                <i className="bi bi-download" /> Export List
            </Button>
        </>
    );

    return (
        <>
            <AnimeListView
                title="My Anime List"
                subtitle={`${watchedItems.length} anime in your list`}
                watchedItems={convertedItems}
                animeData={animeData}
                loading={loading || contextLoading}
                headerActions={headerActions}
                showStatusBadge={true}
            />

            {showImportModal && (
                <div className={styles.modal} onClick={closeModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Import Anime List</h2>
                            <button className={styles.closeButton} onClick={closeModal}>
                                <i className="bi bi-x" />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {!importing && !importResult && !importError && (
                                <>
                                    <p>Select a text file with one anime title per line:</p>
                                    <div className={styles.fileInput}>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".txt,.text"
                                            onChange={handleFileSelect}
                                            id="anime-import-file"
                                        />
                                        <label htmlFor="anime-import-file" className={styles.fileLabel}>
                                            <i className="bi bi-file-earmark-text" />
                                            {selectedFile ? selectedFile.name : "Choose file..."}
                                        </label>
                                    </div>
                                    <p
                                        style={{
                                            marginTop: "1rem",
                                            color: "var(--text-secondary)",
                                            fontSize: "0.875rem",
                                        }}
                                    >
                                        All matched anime will be added to your &quot;Completed&quot; list.
                                    </p>
                                </>
                            )}

                            {importing && (
                                <div className={styles.importProgressContainer}>
                                    <div className={styles.spinner} />
                                    {importProgress ? (
                                        <>
                                            <p className={styles.progressText}>
                                                Importing {importProgress.current} of {importProgress.total}...
                                            </p>
                                            <div className={styles.progressBar}>
                                                <div
                                                    className={styles.progressFill}
                                                    style={{
                                                        width: `${(importProgress.current / importProgress.total) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className={styles.progressStats}>
                                                {importProgress.matchedCount} matched so far
                                            </p>
                                        </>
                                    ) : (
                                        <p>Loading anime database...</p>
                                    )}
                                </div>
                            )}

                            {importError && (
                                <div style={{ color: "var(--error)", textAlign: "center" }}>
                                    <i className="bi bi-exclamation-circle" style={{ fontSize: "2rem" }} />
                                    <p>{importError}</p>
                                </div>
                            )}

                            {importResult && (
                                <>
                                    <div className={styles.importStats}>
                                        <div className={styles.stat}>
                                            <div className={styles.statValue}>{importResult.total}</div>
                                            <div className={styles.statLabel}>Total</div>
                                        </div>
                                        <div className={`${styles.stat} ${styles.success}`}>
                                            <div className={styles.statValue}>{importResult.matched.length}</div>
                                            <div className={styles.statLabel}>Matched</div>
                                        </div>
                                        <div className={`${styles.stat} ${styles.warning}`}>
                                            <div className={styles.statValue}>{importResult.unmatched.length}</div>
                                            <div className={styles.statLabel}>Not Found</div>
                                        </div>
                                    </div>

                                    {importResult.unmatched.length > 0 && (
                                        <div className={styles.unmatchedList}>
                                            <h4>
                                                <i className="bi bi-exclamation-triangle" /> Could not find these
                                                titles:
                                            </h4>
                                            <ul>
                                                {importResult.unmatched.map((title, i) => (
                                                    <li key={i}>{title}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className={styles.modalFooter}>
                            {!importing && !importResult && !importError && (
                                <>
                                    <Button variant="ghost" onClick={closeModal}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleImport} disabled={!selectedFile}>
                                        Start Import
                                    </Button>
                                </>
                            )}
                            {importResult && <Button onClick={closeModal}>Done</Button>}
                            {importError && (
                                <>
                                    <Button variant="ghost" onClick={closeModal}>
                                        Close
                                    </Button>
                                    <Button onClick={handleImport}>Retry</Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
