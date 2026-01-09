"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SortType, WatchStatus, watchStatusLabels } from "@/types/anime";
import { useAuth } from "@/contexts/AuthContext";
import { ImportEntry, useWatchList } from "@/contexts/WatchListContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useBackup, useRestore } from "@/hooks";
import { useImport } from "@/hooks/useImport";
import { AnimeListView, AnimeListViewHandle } from "@/components/AnimeListView/AnimeListView";
import { GenreFilter } from "@/components/GenreFilter/GenreFilter";
import { Button } from "@/components/Button/Button";
import { Pill } from "@/components/Pill/Pill";
import { Spinner } from "@/components/Spinner/Spinner";
import type { ImportType } from "@/services/import/engines/IImportEngine";
import styles from "./page.module.scss";

const IMPORT_TYPE_CONFIG: Record<ImportType, { label: string; description: string; accept: string }> = {
    txt: {
        label: "Text File",
        description: "One anime title per line",
        accept: ".txt,.text",
    },
    mal: {
        label: "MyAnimeList Export",
        description: "XML export from MyAnimeList",
        accept: ".xml",
    },
};

export default function MyListPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { bulkImportToWatchList, refreshList } = useWatchList();
    const { settings, loading: settingsLoading, updateMyListSettings } = useSettings();
    const { backupList } = useBackup();
    const { restoreList } = useRestore();

    const [availableGenres, setAvailableGenres] = useState<string[]>([]);

    const selectedGenres = settings.myList.genres || [];

    const handleGenreChange = useCallback(
        (genres: string[]) => {
            window.scrollTo({ top: 0 });
            updateMyListSettings({ genres });
        },
        [updateMyListSettings],
    );

    const handleSortChange = useCallback(
        (sort: SortType) => {
            updateMyListSettings({ sort });
        },
        [updateMyListSettings],
    );

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        }
    }, [user, authLoading, router]);

    const [showImportModal, setShowImportModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [importType, setImportType] = useState<ImportType>("txt");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [copied, setCopied] = useState(false);
    const [restoreLoading, setRestoreLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<AnimeListViewHandle>(null);

    const {
        importing,
        progress: importProgress,
        result: importResult,
        error: importError,
        startImport,
        reset: resetImport,
    } = useImport();

    const importStatusBreakdown = useMemo(() => {
        if (!importResult) {
            return null;
        }
        const counts: Partial<Record<WatchStatus, number>> = {};
        let withRatings = 0;
        let withNotes = 0;
        for (const m of importResult.matched) {
            counts[m.watchData.status] = (counts[m.watchData.status] || 0) + 1;
            if (m.watchData.rating !== null) {
                withRatings++;
            }
            if (m.watchData.notes) {
                withNotes++;
            }
        }
        return { counts, withRatings, withNotes };
    }, [importResult]);

    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    }, []);

    const handleBackup = useCallback(async () => {
        try {
            await backupList();
        } catch (error) {
            console.error(error);
        }
    }, [backupList]);

    const handleRestore = useCallback(async () => {
        if (!selectedFile) {
            return;
        }
        try {
            setRestoreLoading(true);
            await restoreList(selectedFile);
            await refreshList();
            listRef.current?.reload();
        } catch (error) {
            console.error(error);
        } finally {
            setRestoreLoading(false);
            setShowRestoreModal(false);
            setSelectedFile(null);
        }
    }, [refreshList, restoreList, selectedFile]);

    const handleImport = useCallback(async () => {
        if (!selectedFile) {
            return;
        }

        const content = await selectedFile.text();
        const result = await startImport(content, importType);

        if (result) {
            const entries: ImportEntry[] = result.matched.map(m => ({
                animeId: m.anime.mal_id,
                status: m.watchData.status,
                episodesWatched: m.watchData.episodesWatched,
                rating: m.watchData.rating,
                notes: m.watchData.notes,
            }));
            await bulkImportToWatchList(entries);
            listRef.current?.reload();
        }
    }, [selectedFile, importType, startImport, bulkImportToWatchList]);

    const closeModal = useCallback(() => {
        setShowImportModal(false);
        resetImport();
        setImportType("txt");
        setSelectedFile(null);
        setIsDragging(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [resetImport]);

    const closeRestoreModal = useCallback(() => {
        setShowRestoreModal(false);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const handleShareList = useCallback(async () => {
        if (!user?.publicId) {
            return;
        }
        const sort = settings.myList.sort || "added";
        const shareUrl = `${window.location.origin}/list/${user.publicId}?sort=${encodeURIComponent(sort)}`;
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [user?.publicId, settings.myList.sort]);

    if (authLoading || !user) {
        return null;
    }

    const headerActions = (
        <>
            <Button variant="secondary" onClick={handleShareList}>
                <i className={copied ? "bi bi-check" : "bi bi-share"} />
                <span className={styles.buttonText}>{copied ? "Link Copied!" : "Share List"}</span>
            </Button>
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
                <i className="bi bi-upload" />
                <span className={styles.buttonText}>Import</span>
            </Button>
            <Button variant="secondary" onClick={handleBackup}>
                <i className="bi bi-download" />
                <span className={styles.buttonText}>Backup</span>
            </Button>
            <Button variant="secondary" onClick={() => setShowRestoreModal(true)}>
                <i className="bi bi-arrow-counterclockwise" />
                <span className={styles.buttonText}>Restore</span>
            </Button>
        </>
    );

    const genreFilterSidebar = (
        <GenreFilter genres={availableGenres} selected={selectedGenres} onChange={handleGenreChange} />
    );

    const mobileGenreFilterSidebar = (
        <GenreFilter genres={availableGenres} selected={selectedGenres} onChange={handleGenreChange} defaultCollapsed />
    );

    return (
        <>
            <AnimeListView
                ref={listRef}
                title="My Anime List"
                subtitle="Your anime collection"
                apiEndpoint="/api/watchlist/anime"
                loading={restoreLoading}
                headerActions={headerActions}
                showStatusBadge={true}
                initialSort={settingsLoading ? "added" : (settings.myList.sort as SortType) || "added"}
                onSortChange={handleSortChange}
                onAvailableGenresChange={setAvailableGenres}
                ratingLabel="Your rating"
                genres={selectedGenres}
                sidebar={genreFilterSidebar}
                mobileSidebar={mobileGenreFilterSidebar}
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
                                    <div className={styles.importTypeSection}>
                                        <label htmlFor="import-type" className={styles.fieldLabel}>
                                            Import Format
                                        </label>
                                        <select
                                            id="import-type"
                                            className={styles.select}
                                            value={importType}
                                            onChange={e => {
                                                setImportType(e.target.value as ImportType);
                                                setSelectedFile(null);
                                                if (fileInputRef.current) {
                                                    fileInputRef.current.value = "";
                                                }
                                            }}
                                        >
                                            {(Object.keys(IMPORT_TYPE_CONFIG) as ImportType[]).map(type => (
                                                <option key={type} value={type}>
                                                    {IMPORT_TYPE_CONFIG[type].label}
                                                </option>
                                            ))}
                                        </select>
                                        <p className={styles.fieldHint}>{IMPORT_TYPE_CONFIG[importType].description}</p>
                                    </div>

                                    <div className={styles.fileInput}>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept={IMPORT_TYPE_CONFIG[importType].accept}
                                            onChange={handleFileSelect}
                                            id="anime-import-file"
                                        />
                                        <label
                                            htmlFor="anime-import-file"
                                            className={`${styles.fileLabel} ${isDragging ? styles.dragging : ""}`}
                                            onDragOver={handleDragOver}
                                            onDragEnter={handleDragEnter}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                        >
                                            <i className={isDragging ? "bi bi-download" : "bi bi-file-earmark-text"} />
                                            {isDragging
                                                ? "Drop file here..."
                                                : selectedFile
                                                  ? selectedFile.name
                                                  : "Choose or drop file..."}
                                        </label>
                                    </div>
                                    <p className={styles.fieldHint} style={{ marginTop: "1rem" }}>
                                        {importType === "txt"
                                            ? 'All matched anime will be added to your "Completed" list.'
                                            : "Your watch status, ratings, and notes will be preserved."}
                                    </p>
                                </>
                            )}

                            {importing && (
                                <div className={styles.importProgressContainer}>
                                    <Spinner size="sm" />
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

                            {importResult && importStatusBreakdown && (
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

                                    <div className={styles.statusBreakdown}>
                                        {(Object.entries(importStatusBreakdown.counts) as [WatchStatus, number][]).map(
                                            ([status, count]) => (
                                                <Pill key={status} size="sm">
                                                    {watchStatusLabels[status]}: {count}
                                                </Pill>
                                            ),
                                        )}
                                    </div>

                                    {(importStatusBreakdown.withRatings > 0 || importStatusBreakdown.withNotes > 0) && (
                                        <p className={styles.importExtras}>
                                            <i className="bi bi-check-circle" />
                                            {importStatusBreakdown.withRatings > 0 && (
                                                <span>{importStatusBreakdown.withRatings} ratings</span>
                                            )}
                                            {importStatusBreakdown.withRatings > 0 &&
                                                importStatusBreakdown.withNotes > 0 && <span> and </span>}
                                            {importStatusBreakdown.withNotes > 0 && (
                                                <span>{importStatusBreakdown.withNotes} notes</span>
                                            )}
                                            <span> imported</span>
                                        </p>
                                    )}

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

            {showRestoreModal && (
                <div className={styles.modal} onClick={closeRestoreModal}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Restore Anime List</h2>
                            <button className={styles.closeButton} onClick={closeRestoreModal}>
                                <i className="bi bi-x" />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <p>Select a JSON backup file to restore your watchlist:</p>
                            <div className={styles.fileInput}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileSelect}
                                    id="anime-restore-file"
                                />
                                <label htmlFor="anime-restore-file" className={styles.fileLabel}>
                                    <i className="bi bi-file-earmark-text" />{" "}
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
                                All restored anime will be added to / update your watchlist.
                            </p>

                            <div className={styles.modalFooter}>
                                <Button variant="ghost" onClick={closeRestoreModal}>
                                    Cancel
                                </Button>
                                <Button onClick={handleRestore} disabled={!selectedFile}>
                                    Start Restore
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
