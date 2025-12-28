"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Anime, WatchStatus, watchStatusLabels } from "@/types/anime";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchList } from "@/contexts/WatchListContext";
import { getAnimeBatch } from "@/services/animeService";
import { AnimeCard } from "@/components/AnimeCard/AnimeCard";
import { Button } from "@/components/Button/Button";
import styles from "./page.module.scss";

const statusOrder: WatchStatus[] = ["watching", "plan_to_watch", "completed", "on_hold", "dropped"];
const PAGE_SIZE = 48;

interface ImportResult {
    matched: { title: string; anime: Anime }[];
    unmatched: string[];
    total: number;
}

export default function MyListPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { getAllWatched, getListByStatus, bulkAddToWatchList, loading: contextLoading } = useWatchList();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);
    const [animeData, setAnimeData] = useState<Map<number, Anime>>(new Map());
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<WatchStatus | "all">("all");
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getTabItems = useCallback(() => {
        return activeTab === "all" ? getAllWatched() : getListByStatus(activeTab);
    }, [activeTab, getAllWatched, getListByStatus]);

    const filteredItems = useMemo(() => {
        const items = getTabItems();
        return items.filter(item => {
            const anime = animeData.get(item.animeId);
            if (!anime) {
                return false;
            }
            if (!searchQuery.trim()) {
                return true;
            }
            return anime.title.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [getTabItems, searchQuery, animeData]);

    const watchedItems = getAllWatched();
    const watchedIdsKey = watchedItems
        .map(item => item.animeId)
        .sort((a, b) => a - b)
        .join(",");

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

    const getPagedAnime = useCallback((): Anime[] => {
        const startIndex = (page - 1) * PAGE_SIZE;
        const pageItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
        return pageItems.map(item => animeData.get(item.animeId)!);
    }, [filteredItems, page, animeData]);

    const getCounts = useCallback(() => {
        const counts: Record<string, number> = { all: getAllWatched().length };
        statusOrder.forEach(status => {
            counts[status] = getListByStatus(status).length;
        });
        return counts;
    }, [getAllWatched, getListByStatus]);

    const counts = getCounts();
    const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
    const pagedAnime = getPagedAnime();

    const handleTabChange = useCallback((tab: WatchStatus | "all") => {
        setActiveTab(tab);
        setPage(1);
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setPage(1);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
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

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>My Anime List</h1>
                    <p className={styles.subtitle}>{counts.all} anime in your list</p>
                    <div className={styles.headerActions}>
                        <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                            <i className="bi bi-upload" /> Import List
                        </Button>
                    </div>
                </div>

                <div className={styles.searchContainer}>
                    <div className={styles.searchInput}>
                        <i className="bi bi-search" />
                        <input
                            type="text"
                            placeholder="Search your list..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                        {searchQuery && (
                            <button
                                className={styles.clearSearch}
                                onClick={() => {
                                    setSearchQuery("");
                                    setPage(1);
                                }}
                            >
                                <i className="bi bi-x" />
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <span className={styles.searchResults}>
                            {filteredItems.length} result{filteredItems.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                <div className={styles.tabs}>
                    <Button
                        variant={activeTab === "all" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => handleTabChange("all")}
                    >
                        All ({counts.all})
                    </Button>
                    {statusOrder.map(status => (
                        <Button
                            key={status}
                            variant={activeTab === status ? "primary" : "ghost"}
                            size="sm"
                            onClick={() => handleTabChange(status)}
                        >
                            {watchStatusLabels[status]} ({counts[status]})
                        </Button>
                    ))}
                </div>

                {loading || contextLoading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <p>Loading your list...</p>
                    </div>
                ) : filteredItems.length > 0 ? (
                    <>
                        <div className={styles.grid}>
                            {pagedAnime.map(anime => (
                                <AnimeCard key={anime.id} anime={anime} />
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <i className="bi bi-chevron-left" /> Previous
                                </Button>
                                <span className={styles.pageInfo}>
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next <i className="bi bi-chevron-right" />
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.empty}>
                        <i className={searchQuery ? "bi bi-search" : "bi bi-bookmark"} />
                        <h3>
                            {searchQuery
                                ? "No results found"
                                : activeTab === "all"
                                  ? "Your list is empty"
                                  : `No anime ${watchStatusLabels[activeTab].toLowerCase()}`}
                        </h3>
                        <p>
                            {searchQuery
                                ? `No anime matching "${searchQuery}"`
                                : activeTab === "all"
                                  ? "Start browsing and add anime to your list!"
                                  : "Add some anime to this category"}
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => (window.location.href = "/browse")}>Browse Anime</Button>
                        )}
                    </div>
                )}
            </div>

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
        </div>
    );
}
