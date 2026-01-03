"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatSimilarity, formatTimestamp } from "@/services/traceMoe";
import styles from "./page.module.scss";
import { TraceMoeResult, TraceRateLimitInfo } from "@/types/traceMoe";

type ApiResponse = {
    frameCount?: number;
    error?: string;
    result?: TraceMoeResult[];
    rateLimit?: TraceRateLimitInfo;
    code?: string;
    retryAfter?: number;
};

export function TracePageClient() {
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<TraceMoeResult[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [cutBorders, setCutBorders] = useState(false);
    const [rateLimit, setRateLimit] = useState<TraceRateLimitInfo | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (cooldown <= 0) {
            return;
        }
        const timer = setInterval(() => {
            setCooldown(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSearch = useCallback(
        async (file: File) => {
            if (isLoading || cooldown > 0) {
                return;
            }

            setIsLoading(true);
            setError(null);
            setResults([]);

            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);

            try {
                const formData = new FormData();
                formData.append("image", file);
                formData.append("cutBorders", cutBorders.toString());

                const response = await fetch("/api/anime/trace", {
                    method: "POST",
                    body: formData,
                });

                const data: ApiResponse = await response.json();

                if (data.rateLimit) {
                    setRateLimit(data.rateLimit);
                }

                if (data.error) {
                    setError(data.error);
                    if (data.retryAfter) {
                        setCooldown(data.retryAfter);
                    }
                    return;
                }

                if (data.result) {
                    setResults(data.result);
                    if (data.result.length === 0) {
                        setError("No matches found. Try a different screenshot.");
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to search");
            } finally {
                setIsLoading(false);
            }
        },
        [cutBorders, isLoading, cooldown],
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith("image/")) {
                handleSearch(file);
            } else {
                setError("Please drop an image file");
            }
        },
        [handleSearch],
    );

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                handleSearch(file);
            }
        },
        [handleSearch],
    );

    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleReset = useCallback(() => {
        setResults([]);
        setPreviewUrl(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const handlePaste = useCallback(
        (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) {
                return;
            }

            for (const item of items) {
                if (item.type.startsWith("image/")) {
                    const file = item.getAsFile();
                    if (file) {
                        e.preventDefault();
                        handleSearch(file);
                        return;
                    }
                }
            }
        },
        [handleSearch],
    );

    useEffect(() => {
        document.addEventListener("paste", handlePaste);
        return () => document.removeEventListener("paste", handlePaste);
    }, [handlePaste]);

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>Anime Scene Search</h1>
                    <p className={styles.subtitle}>Upload a screenshot to identify the anime</p>
                </div>

                <div className={styles.options}>
                    <label className={styles.checkbox}>
                        <input type="checkbox" checked={cutBorders} onChange={e => setCutBorders(e.target.checked)} />
                        <span>Cut black borders</span>
                    </label>
                </div>

                <div
                    className={`${styles.dropzone} ${isDragging ? styles.dragging : ""} ${previewUrl ? styles.hasPreview : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={!previewUrl ? handleClick : undefined}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className={styles.fileInput}
                    />

                    {previewUrl ? (
                        <div className={styles.previewContainer}>
                            <Image
                                src={previewUrl}
                                alt="Uploaded screenshot"
                                fill
                                className={styles.previewImage}
                                unoptimized
                            />
                            <button className={styles.resetButton} onClick={handleReset}>
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                    ) : (
                        <div className={styles.dropzoneContent}>
                            <i className="bi bi-image" />
                            <p>Drag and drop an anime screenshot here</p>
                            <span>or click to browse, or paste from clipboard</span>
                        </div>
                    )}
                </div>

                {isLoading && (
                    <div className={styles.loading}>
                        <div className={styles.spinner} />
                        <p>Searching...</p>
                    </div>
                )}

                {error && (
                    <div className={styles.error}>
                        <i className="bi bi-exclamation-circle" />
                        <p>{error}</p>
                    </div>
                )}

                {results.length > 0 && (
                    <div className={styles.results}>
                        <h2>Results</h2>
                        <div className={styles.resultsList}>
                            {results.slice(0, 5).map((result, index) => (
                                <ResultCard key={index} result={result} isTop={index === 0} />
                            ))}
                        </div>
                    </div>
                )}

                {rateLimit && (
                    <div className={styles.rateLimitInfo}>
                        <i className="bi bi-speedometer2" />
                        <span>
                            API Quota: {rateLimit.remaining}/{rateLimit.limit} remaining
                        </span>
                    </div>
                )}

                {cooldown > 0 && (
                    <div className={styles.cooldown}>
                        <i className="bi bi-hourglass-split" />
                        <span>Please wait {cooldown}s before searching again</span>
                    </div>
                )}
            </div>
        </div>
    );
}

interface ResultCardProps {
    result: TraceMoeResult;
    isTop: boolean;
}

function ResultCard({ result, isTop }: ResultCardProps) {
    const [showVideo, setShowVideo] = useState(false);
    const similarity = result.similarity * 100;
    const isGoodMatch = similarity >= 90;
    const malId = result.anilist.idMal;

    const title =
        result.anilist.title.english || result.anilist.title.romaji || result.anilist.title.native || "Unknown";

    return (
        <div className={`${styles.resultCard} ${isTop ? styles.topResult : ""}`}>
            <div className={styles.mediaContainer}>
                {showVideo ? (
                    <video src={result.video} controls autoPlay loop muted className={styles.video} />
                ) : (
                    <>
                        <Image src={result.image} alt={title} fill className={styles.resultImage} unoptimized />
                        <button className={styles.playButton} onClick={() => setShowVideo(true)}>
                            <i className="bi bi-play-fill" />
                        </button>
                    </>
                )}
            </div>

            <div className={styles.resultInfo}>
                <div className={styles.resultHeader}>
                    <h3 className={styles.resultTitle}>{title}</h3>
                    <div className={`${styles.similarity} ${isGoodMatch ? styles.good : styles.low}`}>
                        {formatSimilarity(result.similarity)}
                    </div>
                </div>

                <div className={styles.resultMeta}>
                    {result.episode && (
                        <span className={styles.episode}>
                            <i className="bi bi-collection-play" />
                            Episode {result.episode}
                        </span>
                    )}
                    <span className={styles.timestamp}>
                        <i className="bi bi-clock" />
                        {formatTimestamp(result.from)} - {formatTimestamp(result.to)}
                    </span>
                </div>

                {result.anilist.isAdult && (
                    <div className={styles.adultBadge}>
                        <i className="bi bi-exclamation-triangle" />
                        Adult Content
                    </div>
                )}

                <div className={styles.resultActions}>
                    {malId ? (
                        <Link href={`/anime/${malId}`} className={styles.viewButton}>
                            <i className="bi bi-arrow-right" />
                            View in App
                        </Link>
                    ) : (
                        <span className={styles.noLink}>Not in database</span>
                    )}
                    <button className={styles.toggleVideo} onClick={() => setShowVideo(!showVideo)}>
                        <i className={`bi bi-${showVideo ? "image" : "play-circle"}`} />
                        {showVideo ? "Show Image" : "Play Video"}
                    </button>
                </div>
            </div>
        </div>
    );
}
