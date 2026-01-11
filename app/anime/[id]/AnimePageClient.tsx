"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Anime,
    AnimeCharacter,
    AnimeEpisode,
    AnimePicture,
    AnimeRecommendation,
    AnimeRelation,
    AnimeStatistics,
    StreamingLink,
    WatchStatus,
} from "@/types/anime";
import { useEpisodes } from "@/hooks/useEpisodes";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchList } from "@/contexts/WatchListContext";
import { Button } from "@/components/Button/Button";
import {
    ContentTabsWrapper,
    EntityPageLayout,
    MetaRow,
    MobileStats,
    PageHeader,
    SidebarItem,
    SidebarLink,
    SidebarStatRow,
    SidebarStats,
    TagList,
    TextSection,
} from "@/components/EntityPageLayout/EntityPageLayout";
import { Pill } from "@/components/Pill/Pill";
import { PictureGallery } from "@/components/PictureGallery/PictureGallery";
import { RecommendationsSection } from "@/components/RecommendationsSection/RecommendationsSection";
import { RoleTabs } from "@/components/RoleTabs/RoleTabs";
import { StatisticsSection } from "@/components/StatisticsSection/StatisticsSection";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import { Spinner } from "@/components/Spinner/Spinner";
import { Tab, Tabs } from "@/components/Tabs/Tabs";
import { formatLongText } from "@/lib/textUtils";
import styles from "./page.module.scss";

interface AnimePageClientProps {
    anime: Anime;
    relatedAnime?: Record<number, Anime>;
    pictures?: AnimePicture[];
    recommendations?: AnimeRecommendation[];
    initialEpisodes?: AnimeEpisode[];
    totalEpisodePages?: number;
    totalEpisodeCount?: number;
    characters?: AnimeCharacter[];
    statistics?: AnimeStatistics | null;
    streaming?: StreamingLink[];
}

interface RelatedAnimeSectionProps {
    relations: AnimeRelation[];
    relatedAnime?: Record<number, Anime>;
}

interface ContentTabsProps {
    anime: Anime;
    pictures?: AnimePicture[];
    relatedAnime?: Record<number, Anime>;
    recommendations?: AnimeRecommendation[];
    initialEpisodes?: AnimeEpisode[];
    totalEpisodePages?: number;
    totalEpisodeCount?: number;
    characters?: AnimeCharacter[];
    streaming?: StreamingLink[];
}

const STREAMING_ICONS: Record<string, string> = {
    Crunchyroll: "https://www.crunchyroll.com/favicons/favicon-32x32.png",
    Netflix: "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
    Funimation: "https://www.funimation.com/favicon.ico",
    "Amazon Prime Video": "https://www.amazon.com/favicon.ico",
    Hulu: "https://www.hulu.com/favicon.ico",
    HIDIVE: "https://www.hidive.com/favicon.ico",
    "Disney+": "https://www.disneyplus.com/favicon.ico",
};

const statusOptions: WatchStatus[] = ["watching", "plan_to_watch", "completed", "on_hold", "dropped"];
const MAX_NOTE_LENGTH = 500;

function RelatedAnimeSection({ relations, relatedAnime }: RelatedAnimeSectionProps) {
    const animeRelations = relations
        .map(r => ({
            ...r,
            entry: r.entry.filter(e => e.type === "anime"),
        }))
        .filter(r => r.entry.length > 0);

    const [activeTab, setActiveTab] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    if (animeRelations.length === 0) {
        return null;
    }

    const activeRelation = animeRelations[activeTab];

    const handleTabChange = (index: number) => {
        if (index === activeTab) {
            return;
        }
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveTab(index);
            setIsTransitioning(false);
        }, 150);
    };

    return (
        <div className={styles.relatedSection}>
            <div className={styles.relationTabs}>
                {animeRelations.map((relation, index) => (
                    <button
                        key={relation.relation}
                        className={`${styles.relationTab} ${index === activeTab ? styles.active : ""}`}
                        onClick={() => handleTabChange(index)}
                    >
                        {relation.relation}
                        <span className={styles.tabCount}>{relation.entry.length}</span>
                    </button>
                ))}
            </div>
            <div className={`${styles.relatedGrid} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>
                {activeRelation.entry.map(entry => {
                    const relatedData = relatedAnime?.[entry.mal_id];
                    const imageUrl = relatedData?.images?.jpg?.large_image_url || relatedData?.images?.jpg?.image_url;
                    return (
                        <Link
                            key={entry.mal_id}
                            href={`/anime/${entry.mal_id}`}
                            className={styles.relatedItem}
                            prefetch={false}
                        >
                            <div className={styles.relatedThumb}>
                                {imageUrl ? (
                                    <Image src={imageUrl} alt={entry.name} fill sizes="150px" />
                                ) : (
                                    <div className={styles.noImage} />
                                )}
                            </div>
                            <span className={styles.relatedTitle}>{entry.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

function StreamingSection({ streaming }: { streaming: StreamingLink[] }) {
    if (streaming.length === 0) {
        return (
            <div className={styles.streamingSection}>
                <p className={styles.streamingEmpty}>No streaming platforms available for this anime.</p>
            </div>
        );
    }

    return (
        <div className={styles.streamingSection}>
            <div className={styles.streamingGrid}>
                {streaming.map(link => (
                    <a
                        key={link.name}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.streamingCard}
                    >
                        <div className={styles.streamingIcon}>
                            {STREAMING_ICONS[link.name] ? (
                                <Image
                                    src={STREAMING_ICONS[link.name]}
                                    alt={link.name}
                                    width={32}
                                    height={32}
                                    unoptimized
                                />
                            ) : (
                                <i className="bi bi-play-circle-fill" />
                            )}
                        </div>
                        <span className={styles.streamingName}>{link.name}</span>
                        <i className="bi bi-box-arrow-up-right" />
                    </a>
                ))}
            </div>
            <p className={styles.streamingDisclaimer}>
                <i className="bi bi-info-circle" /> Availability may vary by region
            </p>
        </div>
    );
}

function CharactersSection({ characters }: { characters: AnimeCharacter[] }) {
    if (characters.length === 0) {
        return null;
    }

    const formatName = (name: string) => {
        const parts = name.split(", ");
        if (parts.length === 2) {
            return `${parts[1]} ${parts[0]}`;
        }
        return name;
    };

    const renderCharacters = (items: AnimeCharacter[]) => (
        <div className={styles.charactersGrid}>
            {items.map(char => {
                const imageUrl = char.character.images?.webp?.image_url || char.character.images?.jpg?.image_url;
                const japaneseVA = char.voice_actors.find(va => va.language === "Japanese");
                return (
                    <div key={char.character.mal_id} className={styles.characterCard}>
                        <Link href={`/character/${char.character.mal_id}`} className={styles.characterImageWrapper}>
                            {imageUrl ? (
                                <Image
                                    src={imageUrl}
                                    alt={char.character.name}
                                    fill
                                    sizes="120px"
                                    className={styles.characterImage}
                                />
                            ) : (
                                <div className={styles.noImage} />
                            )}
                        </Link>
                        <div className={styles.characterInfo}>
                            <Link href={`/character/${char.character.mal_id}`} className={styles.characterName}>
                                {formatName(char.character.name)}
                            </Link>
                            {japaneseVA && (
                                <Link href={`/person/${japaneseVA.person.mal_id}`} className={styles.voiceActor}>
                                    <i className="bi bi-mic-fill" /> {formatName(japaneseVA.person.name)}
                                </Link>
                            )}
                            <span className={styles.characterFavorites}>
                                <i className="bi bi-heart-fill" /> {char.favorites.toLocaleString()}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className={styles.charactersSection}>
            <RoleTabs
                items={characters}
                getRole={char => char.role}
                renderItems={renderCharacters}
                emptyMessage={role => `No ${role.toLowerCase()} characters`}
            />
        </div>
    );
}

interface EpisodesContentProps {
    initialEpisodes: AnimeEpisode[];
    totalPages: number;
    animeId: number;
}

function EpisodesContent({ initialEpisodes, totalPages, animeId }: EpisodesContentProps) {
    const {
        episodes,
        currentPage,
        loadingPage,
        loadPage: loadPageBase,
        fetchEpisodeDetail,
        isLoadingEpisode,
        getEpisodeDetail: getEpisodeDetailFromCache,
    } = useEpisodes(animeId, initialEpisodes);
    const [expandedEpisodes, setExpandedEpisodes] = useState<Set<number>>(new Set());

    if (initialEpisodes.length === 0) {
        return null;
    }

    const loadPage = async (page: number) => {
        const result = await loadPageBase(page);
        if (result) {
            setExpandedEpisodes(new Set());
        }
    };

    const toggleExpand = (episodeId: number) => {
        const newExpanded = new Set(expandedEpisodes);
        if (newExpanded.has(episodeId)) {
            newExpanded.delete(episodeId);
        } else {
            newExpanded.add(episodeId);
            fetchEpisodeDetail(episodeId);
        }
        setExpandedEpisodes(newExpanded);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    };

    const renderPagination = () => {
        if (totalPages <= 1) {
            return null;
        }

        const pages: (number | string)[] = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== "...") {
                pages.push("...");
            }
        }

        return (
            <div className={styles.episodePagination}>
                <button
                    className={styles.pageButton}
                    onClick={() => loadPage(currentPage - 1)}
                    disabled={currentPage === 1 || loadingPage}
                >
                    <i className="bi bi-chevron-left" />
                </button>
                {pages.map((page, i) =>
                    typeof page === "number" ? (
                        <button
                            key={i}
                            className={`${styles.pageButton} ${page === currentPage ? styles.active : ""}`}
                            onClick={() => loadPage(page)}
                            disabled={loadingPage}
                        >
                            {page}
                        </button>
                    ) : (
                        <span key={i} className={styles.pageEllipsis}>
                            {page}
                        </span>
                    ),
                )}
                <button
                    className={styles.pageButton}
                    onClick={() => loadPage(currentPage + 1)}
                    disabled={currentPage === totalPages || loadingPage}
                >
                    <i className="bi bi-chevron-right" />
                </button>
            </div>
        );
    };

    return (
        <div className={styles.episodesSection}>
            {renderPagination()}
            {loadingPage ? (
                <div className={styles.episodesLoading}>
                    <Spinner size="sm" text="Loading episodes..." />
                </div>
            ) : (
                <div className={styles.episodesList}>
                    {episodes.map(episode => {
                        const isExpanded = expandedEpisodes.has(episode.mal_id);
                        const isLoading = isLoadingEpisode(episode.mal_id);
                        const detail = getEpisodeDetailFromCache(episode.mal_id);
                        return (
                            <div key={episode.mal_id} className={styles.episodeItem}>
                                <div className={styles.episodeMain} onClick={() => toggleExpand(episode.mal_id)}>
                                    <span className={styles.episodeNumber}>{episode.mal_id}</span>
                                    <div className={styles.episodeInfo}>
                                        <span className={styles.episodeTitle}>{episode.title}</span>
                                        <div className={styles.episodeMeta}>
                                            {episode.aired && (
                                                <span className={styles.episodeAired}>{formatDate(episode.aired)}</span>
                                            )}
                                            {episode.score && (
                                                <span className={styles.episodeScore}>
                                                    <i className="bi bi-star-fill" /> {episode.score.toFixed(2)}
                                                </span>
                                            )}
                                            {episode.filler && <span className={styles.episodeFiller}>Filler</span>}
                                            {episode.recap && <span className={styles.episodeRecap}>Recap</span>}
                                        </div>
                                    </div>
                                    <i className={`bi bi-chevron-${isExpanded ? "up" : "down"} ${styles.expandIcon}`} />
                                </div>
                                {isExpanded && (
                                    <div className={styles.episodeExpanded}>
                                        {isLoading ? (
                                            <div className={styles.episodeLoading}>
                                                <i className="bi bi-arrow-repeat" /> Loading...
                                            </div>
                                        ) : (
                                            <>
                                                {detail?.synopsis && (
                                                    <div className={styles.episodeSynopsis}>
                                                        {formatLongText(detail.synopsis).map((p, i) => (
                                                            <p
                                                                key={i}
                                                                className={
                                                                    p.isAttribution
                                                                        ? styles.synopsisAttribution
                                                                        : undefined
                                                                }
                                                            >
                                                                {p.text}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className={styles.episodeDetailGrid}>
                                                    {(detail?.title_japanese || episode.title_japanese) && (
                                                        <div className={styles.episodeDetail}>
                                                            <span className={styles.detailLabel}>Japanese</span>
                                                            <span>
                                                                {detail?.title_japanese || episode.title_japanese}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {(detail?.title_romanji || episode.title_romanji) && (
                                                        <div className={styles.episodeDetail}>
                                                            <span className={styles.detailLabel}>Romanji</span>
                                                            <span>
                                                                {detail?.title_romanji || episode.title_romanji}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {detail?.duration && (
                                                        <div className={styles.episodeDetail}>
                                                            <span className={styles.detailLabel}>Duration</span>
                                                            <span>{formatDuration(detail.duration)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles.episodeLinks}>
                                                    {episode.url && (
                                                        <a
                                                            href={episode.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={styles.episodeLink}
                                                        >
                                                            <i className="bi bi-box-arrow-up-right" /> MAL
                                                        </a>
                                                    )}
                                                    {episode.forum_url && (
                                                        <a
                                                            href={episode.forum_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={styles.episodeLink}
                                                        >
                                                            <i className="bi bi-chat-dots" /> Forum
                                                        </a>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {renderPagination()}
        </div>
    );
}

function TrailerContent({ trailerId, title }: { trailerId: string; title: string }) {
    return (
        <div className={styles.trailerContent}>
            <div className={styles.trailerWrapper}>
                <iframe
                    src={`https://www.youtube.com/embed/${trailerId}`}
                    title={`${title} Trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>
    );
}

function MediaContent({ anime, pictures }: { anime: Anime; pictures?: AnimePicture[] }) {
    const trailerId = anime.trailer?.youtube_id;
    const hasTrailer = !!trailerId;
    const hasPictures = pictures && pictures.length > 0;

    const mediaTabs: Tab[] = [];

    if (hasTrailer) {
        mediaTabs.push({
            id: "trailer",
            label: "Trailer",
            content: <TrailerContent trailerId={trailerId} title={anime.title} />,
        });
    }

    if (hasPictures) {
        mediaTabs.push({
            id: "gallery",
            label: "Gallery",
            content: <PictureGallery pictures={pictures} />,
        });
    }

    if (mediaTabs.length === 0) {
        return null;
    }

    return <Tabs tabs={mediaTabs} />;
}

function ContentTabs({
    anime,
    pictures,
    relatedAnime,
    recommendations,
    initialEpisodes,
    totalEpisodePages,
    totalEpisodeCount,
    characters,
    streaming,
}: ContentTabsProps) {
    const hasMedia = anime.trailer?.youtube_id || (pictures && pictures.length > 0);
    const hasRelated = anime.relations && anime.relations.some(r => r.entry.some(e => e.type === "anime"));
    const hasRecommendations = recommendations && recommendations.length > 0;
    const hasEpisodes = initialEpisodes && initialEpisodes.length > 0;
    const hasCharacters = characters && characters.length > 0;
    const hasStreaming = streaming && streaming.length > 0;

    const tabs: Tab[] = [];

    if (hasCharacters) {
        tabs.push({
            id: "characters",
            label: `Characters (${characters.length})`,
            content: <CharactersSection characters={characters} />,
        });
    }

    if (hasEpisodes) {
        tabs.push({
            id: "episodes",
            label: `Episodes (${totalEpisodeCount})`,
            content: (
                <EpisodesContent
                    initialEpisodes={initialEpisodes}
                    totalPages={totalEpisodePages || 1}
                    animeId={anime.mal_id}
                />
            ),
        });
    }

    if (hasMedia) {
        tabs.push({
            id: "media",
            label: "Media",
            content: <MediaContent anime={anime} pictures={pictures} />,
        });
    }

    if (hasStreaming) {
        tabs.push({
            id: "streaming",
            label: "Streaming",
            content: <StreamingSection streaming={streaming} />,
        });
    }

    if (hasRelated) {
        tabs.push({
            id: "related",
            label: "Related",
            content: <RelatedAnimeSection relations={anime.relations!} relatedAnime={relatedAnime} />,
        });
    }

    if (hasRecommendations) {
        tabs.push({
            id: "recommendations",
            label: "Recommendations",
            content: <RecommendationsSection recommendations={recommendations} type="anime" />,
        });
    }

    if (tabs.length === 0) {
        return null;
    }

    return <Tabs tabs={tabs} />;
}

export function AnimePageClient({
    anime,
    relatedAnime,
    pictures,
    recommendations,
    initialEpisodes,
    totalEpisodePages,
    totalEpisodeCount,
    characters,
    statistics,
    streaming,
}: AnimePageClientProps) {
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [localNoteText, setLocalNoteText] = useState<string | null>(null);
    const [noteSaved, setNoteSaved] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const { user } = useAuth();
    const { getWatchData, addToWatchList, updateWatchStatus, removeFromWatchList, isInWatchList, ensureLoaded } =
        useWatchList();

    useEffect(() => {
        ensureLoaded();
    }, [ensureLoaded]);

    const watchData = user ? getWatchData(anime.mal_id) : undefined;

    const noteText = localNoteText !== null ? localNoteText : watchData?.notes || "";

    const saveNote = useCallback(
        (text: string) => {
            const trimmed = text.trim();
            const existingTrimmed = (watchData?.notes || "").trim();
            if (trimmed === existingTrimmed) {
                return;
            }
            updateWatchStatus(anime.mal_id, { notes: trimmed || null });
            setNoteSaved(true);
            if (savedIndicatorTimeoutRef.current) {
                clearTimeout(savedIndicatorTimeoutRef.current);
            }
            savedIndicatorTimeoutRef.current = setTimeout(() => setNoteSaved(false), 2000);
        },
        [anime.mal_id, watchData?.notes, updateWatchStatus],
    );

    const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value.slice(0, MAX_NOTE_LENGTH);
        setLocalNoteText(text);
        setNoteSaved(false);

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => saveNote(text), 500);
    };

    const handleNoteBlur = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        if (noteText !== (watchData?.notes || "")) {
            saveNote(noteText);
        }
    };

    const handleClearNote = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        setLocalNoteText("");
        updateWatchStatus(anime.mal_id, { notes: null });
        setNoteSaved(true);
        if (savedIndicatorTimeoutRef.current) {
            clearTimeout(savedIndicatorTimeoutRef.current);
        }
        savedIndicatorTimeoutRef.current = setTimeout(() => setNoteSaved(false), 2000);
    };

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            if (savedIndicatorTimeoutRef.current) {
                clearTimeout(savedIndicatorTimeoutRef.current);
            }
        };
    }, []);

    const handleAddToList = (status: WatchStatus) => {
        if (isInWatchList(anime.mal_id)) {
            updateWatchStatus(anime.mal_id, { status });
        } else {
            addToWatchList(anime.mal_id, status);
        }
        setShowStatusMenu(false);
    };

    const handleRemoveFromList = () => {
        removeFromWatchList(anime.mal_id);
        setShowStatusMenu(false);
    };

    const handleEpisodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const episodes = Math.max(0, Math.min(parseInt(e.target.value) || 0, anime.episodes || 9999));
        updateWatchStatus(anime.mal_id, { episodesWatched: episodes });
    };

    const handleRatingChange = (rating: number) => {
        updateWatchStatus(anime.mal_id, { rating });
    };

    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || "/placeholder.png";
    const displayTitle = anime.title_english || anime.title;
    const synopsisParagraphs = anime.synopsis ? formatLongText(anime.synopsis) : [];

    const sidebarContent = (
        <>
            {anime.score && (
                <SidebarItem icon="star-fill" iconColor="#fbbf24">
                    {anime.score.toFixed(2)}
                    {anime.scored_by && (
                        <span className={styles.scoredBy}>({anime.scored_by.toLocaleString()} users)</span>
                    )}
                </SidebarItem>
            )}
            {anime.favorites && (
                <SidebarItem icon="heart-fill" iconColor="#ec4899">
                    {anime.favorites.toLocaleString()} favourites
                </SidebarItem>
            )}
            <SidebarLink href={`https://myanimelist.net/anime/${anime.mal_id}`} icon="box-arrow-up-right" external>
                View on MyAnimeList
            </SidebarLink>
            <SidebarStats>
                {anime.type && <SidebarStatRow label="Type" value={anime.type} />}
                {anime.status && <SidebarStatRow label="Status" value={anime.status} />}
                {anime.episodes && <SidebarStatRow label="Episodes" value={anime.episodes} />}
                {anime.duration && <SidebarStatRow label="Duration" value={anime.duration} />}
                {anime.aired?.string && <SidebarStatRow label="Aired" value={anime.aired.string} />}
                {anime.source && <SidebarStatRow label="Source" value={anime.source} />}
                {anime.rating && <SidebarStatRow label="Rating" value={anime.rating} />}
                {anime.rank && <SidebarStatRow label="Rank" value={`#${anime.rank}`} />}
                {anime.popularity && <SidebarStatRow label="Popularity" value={`#${anime.popularity}`} />}
                {anime.members && <SidebarStatRow label="Members" value={anime.members.toLocaleString()} />}
            </SidebarStats>
        </>
    );

    const hasContentTabs =
        (characters && characters.length > 0) ||
        (initialEpisodes && initialEpisodes.length > 0) ||
        anime.trailer?.youtube_id ||
        (pictures && pictures.length > 0) ||
        (streaming && streaming.length > 0) ||
        (anime.relations && anime.relations.some(r => r.entry.some(e => e.type === "anime"))) ||
        (recommendations && recommendations.length > 0);

    return (
        <EntityPageLayout imageUrl={imageUrl} imageAlt={displayTitle} sidebarContent={sidebarContent}>
            <PageHeader
                title={displayTitle}
                subtitle={anime.title_japanese}
                altTitle={anime.title !== displayTitle ? anime.title : null}
            />

            {anime.genres && anime.genres.length > 0 && (
                <TagList>
                    {anime.genres.map(genre => (
                        <Link key={genre.mal_id} href={`/browse?genres=${encodeURIComponent(genre.name)}`}>
                            <Pill variant="accent">{genre.name}</Pill>
                        </Link>
                    ))}
                </TagList>
            )}

            {anime.studios && anime.studios.length > 0 && (
                <MetaRow label="Studios:">{anime.studios.map(s => s.name).join(", ")}</MetaRow>
            )}

            <div className={styles.actions}>
                {user ? (
                    <div className={styles.statusDropdown}>
                        <Button
                            variant={watchData ? "secondary" : "primary"}
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                        >
                            {watchData ? (
                                <>
                                    <StatusBadge status={watchData.status} />
                                    <i className="bi bi-chevron-down" />
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-plus" />
                                    Add to List
                                </>
                            )}
                        </Button>

                        {showStatusMenu && (
                            <div className={styles.statusMenu}>
                                {statusOptions.map(status => (
                                    <button
                                        key={status}
                                        className={`${styles.statusOption} ${watchData?.status === status ? styles.active : ""}`}
                                        onClick={() => handleAddToList(status)}
                                    >
                                        <StatusBadge status={status} />
                                    </button>
                                ))}
                                {watchData && (
                                    <button
                                        className={`${styles.statusOption} ${styles.remove}`}
                                        onClick={handleRemoveFromList}
                                    >
                                        <i className="bi bi-trash" />
                                        Remove from list
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <Link href="/login">
                        <Button variant="primary">
                            <i className="bi bi-person" />
                            Sign in to add to list
                        </Button>
                    </Link>
                )}
            </div>

            {watchData && (
                <div className={styles.tracking}>
                    {watchData.status !== "completed" && (
                        <div className={styles.trackingItem}>
                            <label>Episodes watched</label>
                            <div className={styles.episodeInput}>
                                <input
                                    type="number"
                                    min="0"
                                    max={anime.episodes || 9999}
                                    value={watchData.episodesWatched}
                                    onChange={handleEpisodeChange}
                                />
                                <span>/ {anime.episodes || "?"}</span>
                            </div>
                        </div>
                    )}

                    <div className={styles.trackingItem}>
                        <label>Your rating</label>
                        <div className={styles.ratingInput}>
                            <button
                                className={`${styles.star} ${styles.dogshit} ${watchData.rating === -1 ? styles.active : ""}`}
                                onClick={() => handleRatingChange(watchData.rating === -1 ? 0 : -1)}
                                title="Dogshit"
                            >
                                💩
                            </button>
                            {[1, 2, 3, 4, 5].map(star => (
                                <button
                                    key={star}
                                    className={`${styles.star} ${(watchData.rating || 0) >= star && watchData.rating !== -1 ? styles.active : ""}`}
                                    onClick={() => handleRatingChange(watchData.rating === star ? 0 : star)}
                                    title={`${star} star${star > 1 ? "s" : ""}`}
                                >
                                    <i
                                        className={`bi bi-star${(watchData.rating || 0) >= star && watchData.rating !== -1 ? "-fill" : ""}`}
                                    />
                                </button>
                            ))}
                            <button
                                className={`${styles.star} ${styles.masterpiece} ${watchData.rating === 6 ? styles.active : ""}`}
                                onClick={() => handleRatingChange(watchData.rating === 6 ? 0 : 6)}
                                title="Masterpiece"
                            >
                                <i className={`bi bi-star${watchData.rating === 6 ? "-fill" : ""}`} />
                            </button>
                            {watchData.rating != null && watchData.rating !== 0 && (
                                <span className={styles.ratingValue}>
                                    {watchData.rating === 6
                                        ? "Masterpiece"
                                        : watchData.rating === -1
                                          ? "Dogshit"
                                          : `${watchData.rating}/5`}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className={styles.trackingItem}>
                        <div className={styles.notesHeader}>
                            <label>Notes</label>
                            <div className={styles.notesActions}>
                                {noteSaved && <span className={styles.savedIndicator}>Saved</span>}
                                {noteText.trim().length > 0 && (
                                    <button
                                        type="button"
                                        className={styles.clearNoteButton}
                                        onClick={handleClearNote}
                                        title="Clear note"
                                    >
                                        <i className="bi bi-x-lg" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <textarea
                            className={styles.notesTextarea}
                            placeholder="Add a personal note about this anime..."
                            value={noteText}
                            onChange={handleNoteChange}
                            onBlur={handleNoteBlur}
                            maxLength={MAX_NOTE_LENGTH}
                            rows={3}
                        />
                        <div className={styles.notesFooter}>
                            <span className={styles.notesHint}>
                                <i className="bi bi-globe2" /> Visible on your public list
                            </span>
                            <span className={styles.charCount}>
                                {noteText.length}/{MAX_NOTE_LENGTH}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <MobileStats>
                {anime.type && <SidebarStatRow label="Type" value={anime.type} />}
                {anime.status && <SidebarStatRow label="Status" value={anime.status} />}
                {anime.episodes && <SidebarStatRow label="Episodes" value={anime.episodes} />}
                {anime.duration && <SidebarStatRow label="Duration" value={anime.duration} />}
                {anime.aired?.string && <SidebarStatRow label="Aired" value={anime.aired.string} />}
                {anime.source && <SidebarStatRow label="Source" value={anime.source} />}
                {anime.rating && <SidebarStatRow label="Rating" value={anime.rating} />}
                {anime.rank && <SidebarStatRow label="Rank" value={`#${anime.rank}`} />}
                {anime.popularity && <SidebarStatRow label="Popularity" value={`#${anime.popularity}`} />}
                {anime.members && <SidebarStatRow label="Members" value={anime.members.toLocaleString()} />}
            </MobileStats>

            {statistics && (
                <StatisticsSection
                    data={{
                        statusLabels: ["Watching", "Completed", "On Hold", "Dropped", "Plan to Watch"],
                        statusValues: [
                            statistics.watching,
                            statistics.completed,
                            statistics.on_hold,
                            statistics.dropped,
                            statistics.plan_to_watch,
                        ],
                        statusTitle: "Watch Status",
                        total: statistics.total,
                        scores: statistics.scores,
                    }}
                />
            )}

            <TextSection title="Synopsis" paragraphs={synopsisParagraphs} />

            {hasContentTabs && (
                <ContentTabsWrapper>
                    <ContentTabs
                        anime={anime}
                        pictures={pictures}
                        relatedAnime={relatedAnime}
                        recommendations={recommendations}
                        initialEpisodes={initialEpisodes}
                        totalEpisodePages={totalEpisodePages}
                        totalEpisodeCount={totalEpisodeCount}
                        characters={characters}
                        streaming={streaming}
                    />
                </ContentTabsWrapper>
            )}
        </EntityPageLayout>
    );
}
