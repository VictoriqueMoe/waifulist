"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useCharacterSearch } from "@/hooks/useCharacterSearch";
import { useAnime } from "@/hooks/useAnime";
import { AniListCharacter } from "@/types/anilist";
import { Anime } from "@/types/anime";
import { TIER_COLORS, TIER_RANKS, TierListCharacter, TierListData, TierRank } from "@/types/tierlist";
import { Button } from "@/components/Button/Button";
import styles from "./TierListBuilder.module.scss";

interface TierListBuilderProps {
    publicId?: string;
    initialName: string;
    initialTiers: Record<TierRank, TierListCharacter[]>;
    onSave: (name: string, data: TierListData) => Promise<void>;
    shareUrl?: string;
    saveLabel?: string;
    savingLabel?: string;
}

export function TierListBuilder({
    publicId: _publicId,
    initialName,
    initialTiers,
    onSave,
    shareUrl,
    saveLabel = "Save",
    savingLabel = "Saving...",
}: TierListBuilderProps) {
    const [name, setName] = useState(initialName);
    const [tiers, setTiers] = useState<Record<TierRank, TierListCharacter[]>>(initialTiers);
    const [isSaving, setIsSaving] = useState(false);
    const [draggedCharacter, setDraggedCharacter] = useState<{
        character: TierListCharacter;
        fromTier: TierRank | "search";
    } | null>(null);
    const [dropTarget, setDropTarget] = useState<{ tier: TierRank; index: number } | null>(null);

    const {
        query,
        setQuery,
        results,
        isLoading,
        error,
        hasMore,
        loadMore,
        clear,
        animeFilter,
        setAnimeFilter,
        mediaFilter,
        setMediaFilter,
    } = useCharacterSearch();

    const { searchAnimeSilent } = useAnime();
    const [filterType, setFilterType] = useState<"anime" | "manga">("anime");
    const [mediaSearchQuery, setMediaSearchQuery] = useState("");
    const [animeResults, setAnimeResults] = useState<Anime[]>([]);
    const [mangaResults, setMangaResults] = useState<{ mal_id: number; title: string }[]>([]);
    const [isMediaSearching, setIsMediaSearching] = useState(false);
    const [showMediaDropdown, setShowMediaDropdown] = useState(false);
    const mediaSearchTimer = useRef<NodeJS.Timeout | null>(null);
    const mediaDropdownRef = useRef<HTMLDivElement>(null);

    const activeMediaFilter = mediaFilter || (animeFilter ? { ...animeFilter, type: "anime" as const } : null);

    useEffect(() => {
        if (mediaSearchTimer.current) {
            clearTimeout(mediaSearchTimer.current);
        }

        if (mediaSearchQuery.length < 2) {
            setAnimeResults([]);
            setMangaResults([]);
            return;
        }

        mediaSearchTimer.current = setTimeout(async () => {
            setIsMediaSearching(true);
            try {
                if (filterType === "anime") {
                    const results = await searchAnimeSilent(mediaSearchQuery, 10);
                    setAnimeResults(results);
                } else {
                    const response = await fetch(`/api/manga?q=${encodeURIComponent(mediaSearchQuery)}&limit=10`);
                    if (response.ok) {
                        const data = await response.json();
                        setMangaResults(data.results || []);
                    }
                }
            } finally {
                setIsMediaSearching(false);
            }
        }, 300);

        return () => {
            if (mediaSearchTimer.current) {
                clearTimeout(mediaSearchTimer.current);
            }
        };
    }, [mediaSearchQuery, filterType, searchAnimeSilent]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (mediaDropdownRef.current && !mediaDropdownRef.current.contains(e.target as Node)) {
                setShowMediaDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectMedia = (malId: number, title: string) => {
        setMediaFilter({ malId, title, type: filterType });
        setMediaSearchQuery("");
        setAnimeResults([]);
        setMangaResults([]);
        setShowMediaDropdown(false);
    };

    const handleClearMediaFilter = () => {
        setMediaFilter(null);
        setAnimeFilter(null);
        clear();
    };

    const handleFilterTypeChange = (type: "anime" | "manga") => {
        setFilterType(type);
        setMediaSearchQuery("");
        setAnimeResults([]);
        setMangaResults([]);
        handleClearMediaFilter();
    };

    const handleAddCharacter = useCallback(
        (character: AniListCharacter, tier: TierRank) => {
            const existsInAnyTier = TIER_RANKS.some(rank => tiers[rank].some(c => c.anilistId === character.id));

            if (existsInAnyTier) {
                return;
            }

            const tierListChar: TierListCharacter = {
                anilistId: character.id,
                name: character.name.full,
                image: character.image.large || character.image.medium,
                anime:
                    character.media?.nodes?.map(m => ({
                        malId: m.idMal ?? null,
                        title: m.title?.english || m.title?.romaji || "Unknown",
                    })) || [],
            };

            setTiers(prev => ({
                ...prev,
                [tier]: [...prev[tier], tierListChar],
            }));
        },
        [tiers],
    );

    const handleRemoveCharacter = useCallback((anilistId: number, tier: TierRank) => {
        setTiers(prev => ({
            ...prev,
            [tier]: prev[tier].filter(c => c.anilistId !== anilistId),
        }));
    }, []);

    const handleMoveCharacter = useCallback((anilistId: number, fromTier: TierRank, toTier: TierRank) => {
        if (fromTier === toTier) {
            return;
        }

        setTiers(prev => {
            const character = prev[fromTier].find(c => c.anilistId === anilistId);
            if (!character) {
                return prev;
            }

            return {
                ...prev,
                [fromTier]: prev[fromTier].filter(c => c.anilistId !== anilistId),
                [toTier]: [...prev[toTier], character],
            };
        });
    }, []);

    const handleDragStart = (character: TierListCharacter, fromTier: TierRank | "search") => {
        setDraggedCharacter({ character, fromTier });
    };

    const handleDragEnd = () => {
        setDraggedCharacter(null);
        setDropTarget(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDragEnterCard = (tier: TierRank, index: number) => {
        setDropTarget({ tier, index });
    };

    const handleDrop = (e: React.DragEvent, toTier: TierRank) => {
        e.preventDefault();
        setDropTarget(null);
        if (!draggedCharacter) {
            return;
        }

        const { character, fromTier } = draggedCharacter;

        if (fromTier === "search") {
            const existsInAnyTier = TIER_RANKS.some(rank => tiers[rank].some(c => c.anilistId === character.anilistId));
            if (!existsInAnyTier) {
                setTiers(prev => ({
                    ...prev,
                    [toTier]: [...prev[toTier], character],
                }));
            }
        } else if (fromTier !== toTier) {
            handleMoveCharacter(character.anilistId, fromTier, toTier);
        }

        setDraggedCharacter(null);
    };

    const handleDropOnCharacter = (e: React.DragEvent, toTier: TierRank, targetIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(null);
        if (!draggedCharacter) {
            return;
        }

        const { character, fromTier } = draggedCharacter;

        if (fromTier === "search") {
            const existsInAnyTier = TIER_RANKS.some(rank => tiers[rank].some(c => c.anilistId === character.anilistId));
            if (!existsInAnyTier) {
                setTiers(prev => {
                    const newTier = [...prev[toTier]];
                    newTier.splice(targetIndex, 0, character);
                    return { ...prev, [toTier]: newTier };
                });
            }
        } else if (fromTier === toTier) {
            setTiers(prev => {
                const tierChars = [...prev[toTier]];
                const currentIndex = tierChars.findIndex(c => c.anilistId === character.anilistId);
                if (currentIndex === -1 || currentIndex === targetIndex) {
                    return prev;
                }
                tierChars.splice(currentIndex, 1);
                const insertIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
                tierChars.splice(insertIndex, 0, character);
                return { ...prev, [toTier]: tierChars };
            });
        } else {
            setTiers(prev => {
                const fromChars = prev[fromTier].filter(c => c.anilistId !== character.anilistId);
                const toChars = [...prev[toTier]];
                toChars.splice(targetIndex, 0, character);
                return { ...prev, [fromTier]: fromChars, [toTier]: toChars };
            });
        }

        setDraggedCharacter(null);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const data: TierListData = {
                S: tiers.S.map(c => c.anilistId),
                A: tiers.A.map(c => c.anilistId),
                B: tiers.B.map(c => c.anilistId),
                C: tiers.C.map(c => c.anilistId),
                D: tiers.D.map(c => c.anilistId),
                F: tiers.F.map(c => c.anilistId),
            };
            await onSave(name, data);
        } finally {
            setIsSaving(false);
        }
    };

    const isCharacterInTiers = (anilistId: number) => {
        return TIER_RANKS.some(rank => tiers[rank].some(c => c.anilistId === anilistId));
    };

    return (
        <div className={styles.builder}>
            <div className={styles.header}>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={styles.nameInput}
                    placeholder="Tier List Name"
                />
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? savingLabel : saveLabel}
                </Button>
            </div>

            <div className={styles.content}>
                <div className={styles.leftColumn}>
                    <div className={styles.tierListSection}>
                        {TIER_RANKS.map(rank => (
                            <div
                                key={rank}
                                className={styles.tierRow}
                                onDragOver={handleDragOver}
                                onDrop={e => handleDrop(e, rank)}
                            >
                                <div className={styles.tierLabel} style={{ backgroundColor: TIER_COLORS[rank] }}>
                                    {rank}
                                </div>
                                <div className={styles.tierCharacters}>
                                    {tiers[rank].map((character, index) => (
                                        <div
                                            key={character.anilistId}
                                            className={`${styles.characterCard} ${dropTarget?.tier === rank && dropTarget?.index === index ? styles.dropIndicator : ""}`}
                                            draggable
                                            onDragStart={() => handleDragStart(character, rank)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={handleDragOver}
                                            onDragEnter={() => handleDragEnterCard(rank, index)}
                                            onDrop={e => handleDropOnCharacter(e, rank, index)}
                                        >
                                            <Image
                                                src={character.image}
                                                alt={character.name}
                                                width={60}
                                                height={80}
                                                className={styles.characterImage}
                                            />
                                            <button
                                                className={styles.removeButton}
                                                onClick={() => handleRemoveCharacter(character.anilistId, rank)}
                                                title="Remove"
                                            >
                                                <i className="bi bi-x" />
                                            </button>
                                            <div className={styles.characterName}>{character.name}</div>
                                        </div>
                                    ))}
                                    <div
                                        className={`${styles.dropZoneEnd} ${dropTarget?.tier === rank && dropTarget?.index === tiers[rank].length ? styles.dropIndicatorEnd : ""}`}
                                        onDragOver={handleDragOver}
                                        onDragEnter={() => handleDragEnterCard(rank, tiers[rank].length)}
                                        onDrop={e => handleDropOnCharacter(e, rank, tiers[rank].length)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    {shareUrl && (
                        <div className={styles.shareSection}>
                            <span>Share link:</span>
                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                className={styles.shareInput}
                                onClick={e => (e.target as HTMLInputElement).select()}
                            />
                        </div>
                    )}
                </div>

                <div className={styles.searchSection}>
                    <div className={styles.searchHeader}>
                        <h3>Add Characters</h3>
                    </div>

                    <div className={styles.mediaFilter} ref={mediaDropdownRef}>
                        {activeMediaFilter ? (
                            <div className={styles.selectedAnime}>
                                <i className={`bi bi-${activeMediaFilter.type === "manga" ? "book" : "film"}`} />
                                <span className={styles.selectedAnimeTitle}>{activeMediaFilter.title}</span>
                                <button onClick={handleClearMediaFilter} className={styles.clearFilterButton}>
                                    <i className="bi bi-x" />
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className={styles.mediaSearchBar}>
                                    <div className={styles.mediaTypeToggle}>
                                        <button
                                            className={`${styles.mediaTypeButton} ${filterType === "anime" ? styles.active : ""}`}
                                            onClick={() => handleFilterTypeChange("anime")}
                                            title="Filter by anime"
                                        >
                                            <i className="bi bi-film" />
                                        </button>
                                        <button
                                            className={`${styles.mediaTypeButton} ${filterType === "manga" ? styles.active : ""}`}
                                            onClick={() => handleFilterTypeChange("manga")}
                                            title="Filter by manga"
                                        >
                                            <i className="bi bi-book" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={mediaSearchQuery}
                                        onChange={e => {
                                            setMediaSearchQuery(e.target.value);
                                            setShowMediaDropdown(true);
                                        }}
                                        onFocus={() => setShowMediaDropdown(true)}
                                        placeholder={`Filter by ${filterType} (optional)...`}
                                        className={styles.mediaSearchInput}
                                    />
                                    {isMediaSearching && <i className="bi bi-arrow-repeat spinning" />}
                                </div>
                                {showMediaDropdown &&
                                    (filterType === "anime" ? animeResults.length > 0 : mangaResults.length > 0) && (
                                        <div className={styles.mediaDropdown}>
                                            {filterType === "anime"
                                                ? animeResults.map(anime => (
                                                      <button
                                                          key={anime.mal_id}
                                                          className={styles.animeOption}
                                                          onClick={() => handleSelectMedia(anime.mal_id, anime.title)}
                                                          title={anime.title}
                                                      >
                                                          <span className={styles.animeOptionTitle}>{anime.title}</span>
                                                      </button>
                                                  ))
                                                : mangaResults.map(manga => (
                                                      <button
                                                          key={manga.mal_id}
                                                          className={styles.animeOption}
                                                          onClick={() => handleSelectMedia(manga.mal_id, manga.title)}
                                                          title={manga.title}
                                                      >
                                                          <span className={styles.animeOptionTitle}>{manga.title}</span>
                                                      </button>
                                                  ))}
                                        </div>
                                    )}
                            </>
                        )}
                    </div>

                    <div className={styles.searchBar}>
                        <i className="bi bi-search" />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={activeMediaFilter ? "Filter characters by name..." : "Search characters..."}
                            className={styles.searchInput}
                        />
                        {query && (
                            <button onClick={clear} className={styles.clearButton}>
                                <i className="bi bi-x" />
                            </button>
                        )}
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.searchResults}>
                        {results.map(character => {
                            const inTiers = isCharacterInTiers(character.id);
                            const tierListChar: TierListCharacter = {
                                anilistId: character.id,
                                name: character.name.full,
                                image: character.image.large || character.image.medium,
                                anime:
                                    character.media?.nodes?.map(m => ({
                                        malId: m.idMal ?? null,
                                        title: m.title?.english || m.title?.romaji || "Unknown",
                                    })) || [],
                            };

                            return (
                                <div
                                    key={character.id}
                                    className={`${styles.searchResult} ${inTiers ? styles.added : ""}`}
                                    draggable={!inTiers}
                                    onDragStart={() => !inTiers && handleDragStart(tierListChar, "search")}
                                >
                                    <Image
                                        src={character.image.large || character.image.medium}
                                        alt={character.name.full}
                                        width={40}
                                        height={55}
                                        className={styles.resultImage}
                                    />
                                    <div className={styles.resultInfo}>
                                        <div className={styles.resultName}>{character.name.full}</div>
                                        {character.media?.nodes?.[0] && (
                                            <div className={styles.resultAnime}>
                                                {character.media.nodes[0].title?.english ||
                                                    character.media.nodes[0].title?.romaji}
                                            </div>
                                        )}
                                    </div>
                                    {!inTiers && (
                                        <div className={styles.addButtons}>
                                            {TIER_RANKS.map(rank => (
                                                <button
                                                    key={rank}
                                                    onClick={() => handleAddCharacter(character, rank)}
                                                    className={styles.addButton}
                                                    style={{ backgroundColor: TIER_COLORS[rank] }}
                                                    title={`Add to ${rank} tier`}
                                                >
                                                    {rank}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {inTiers && <div className={styles.addedLabel}>Added</div>}
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div className={styles.loading}>
                                <i className="bi bi-arrow-repeat" />
                                {activeMediaFilter ? "Loading characters..." : "Searching..."}
                            </div>
                        )}

                        {hasMore && !isLoading && (
                            <Button variant="secondary" onClick={loadMore}>
                                Load More
                            </Button>
                        )}

                        {!isLoading && !activeMediaFilter && query.length >= 2 && results.length === 0 && (
                            <div className={styles.noResults}>No characters found</div>
                        )}

                        {!isLoading && activeMediaFilter && results.length === 0 && (
                            <div className={styles.noResults}>
                                {query.length >= 2
                                    ? "No matching characters found"
                                    : `No characters found for this ${activeMediaFilter.type}`}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
