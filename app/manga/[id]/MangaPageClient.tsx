"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MangaCharacter, MangaFull, MangaRecommendation, MangaRelation, MangaStatistics } from "@/types/manga";
import { AnimePicture } from "@/types/anime";
import { formatLongText } from "@/lib/textUtils";
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
import { Tab, Tabs } from "@/components/Tabs/Tabs";
import styles from "./page.module.scss";

interface MangaPageClientProps {
    manga: MangaFull;
    characters: MangaCharacter[];
    pictures: AnimePicture[];
    statistics: MangaStatistics | null;
    recommendations: MangaRecommendation[];
}

function formatName(name: string): string {
    const parts = name.split(", ");
    if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
    }
    return name;
}

function CharactersSection({ characters }: { characters: MangaCharacter[] }) {
    if (characters.length === 0) {
        return null;
    }

    const renderCharacters = (items: MangaCharacter[]) => (
        <div className={styles.charactersGrid}>
            {items.map(char => {
                const imageUrl = char.character.images?.webp?.image_url || char.character.images?.jpg?.image_url;
                return (
                    <Link
                        key={char.character.mal_id}
                        href={`/character/${char.character.mal_id}`}
                        className={styles.characterCard}
                    >
                        <div className={styles.characterImage}>
                            {imageUrl ? (
                                <Image src={imageUrl} alt={char.character.name} fill sizes="120px" />
                            ) : (
                                <div className={styles.noImage} />
                            )}
                        </div>
                        <span className={styles.characterName}>{formatName(char.character.name)}</span>
                    </Link>
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

function RelatedSection({ relations }: { relations: MangaRelation[] }) {
    const [activeTab, setActiveTab] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    if (relations.length === 0) {
        return null;
    }

    const activeRelation = relations[activeTab];

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
                {relations.map((relation, index) => (
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
                    const isAnime = entry.type === "anime";
                    const href = isAnime ? `/anime/${entry.mal_id}` : `/manga/${entry.mal_id}`;
                    return (
                        <Link key={`${entry.type}-${entry.mal_id}`} href={href} className={styles.relatedItem}>
                            <div className={styles.relatedThumb}>
                                <div className={styles.noImage}>
                                    <i className={`bi bi-${isAnime ? "play-circle" : "book"}`} />
                                </div>
                            </div>
                            <span className={styles.relatedTitle}>{entry.name}</span>
                            <span className={styles.relatedType}>{isAnime ? "Anime" : "Manga"}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}

export function MangaPageClient({ manga, characters, pictures, statistics, recommendations }: MangaPageClientProps) {
    const imageUrl = manga.images?.webp?.large_image_url || manga.images?.jpg?.large_image_url;
    const displayTitle = manga.title_english || manga.title;
    const synopsisParagraphs = manga.synopsis ? formatLongText(manga.synopsis) : [];
    const backgroundParagraphs = manga.background ? formatLongText(manga.background) : [];

    const allGenres = [...manga.genres, ...manga.themes, ...manga.demographics];

    const tabs: Tab[] = [];

    if (characters.length > 0) {
        tabs.push({
            id: "characters",
            label: `Characters (${characters.length})`,
            content: <CharactersSection characters={characters} />,
        });
    }

    if (pictures.length > 0) {
        tabs.push({
            id: "media",
            label: "Media",
            content: <PictureGallery pictures={pictures} />,
        });
    }

    if (manga.relations && manga.relations.length > 0) {
        const totalRelated = manga.relations.reduce((acc, r) => acc + r.entry.length, 0);
        tabs.push({
            id: "related",
            label: `Related (${totalRelated})`,
            content: <RelatedSection relations={manga.relations} />,
        });
    }

    if (recommendations.length > 0) {
        tabs.push({
            id: "recommendations",
            label: `Recommendations (${recommendations.length})`,
            content: <RecommendationsSection recommendations={recommendations} type="manga" />,
        });
    }

    const sidebarContent = (
        <>
            {manga.score && (
                <SidebarItem icon="star-fill" iconColor="#fbbf24">
                    {manga.score.toFixed(2)}
                    {manga.scored_by && (
                        <span className={styles.scoredBy}>({manga.scored_by.toLocaleString()} users)</span>
                    )}
                </SidebarItem>
            )}
            {manga.favorites && (
                <SidebarItem icon="heart-fill" iconColor="#ec4899">
                    {manga.favorites.toLocaleString()} favourites
                </SidebarItem>
            )}
            <SidebarLink href={manga.url} icon="box-arrow-up-right" external>
                View on MyAnimeList
            </SidebarLink>
            <SidebarStats>
                {manga.type && <SidebarStatRow label="Type" value={manga.type} />}
                {manga.status && <SidebarStatRow label="Status" value={manga.status} />}
                {manga.volumes && <SidebarStatRow label="Volumes" value={manga.volumes} />}
                {manga.chapters && <SidebarStatRow label="Chapters" value={manga.chapters} />}
                {manga.published?.string && <SidebarStatRow label="Published" value={manga.published.string} />}
                {manga.rank && <SidebarStatRow label="Rank" value={`#${manga.rank}`} />}
                {manga.popularity && <SidebarStatRow label="Popularity" value={`#${manga.popularity}`} />}
                {manga.members && <SidebarStatRow label="Members" value={manga.members.toLocaleString()} />}
            </SidebarStats>
        </>
    );

    return (
        <EntityPageLayout imageUrl={imageUrl} imageAlt={displayTitle} sidebarContent={sidebarContent}>
            <PageHeader
                title={displayTitle}
                subtitle={manga.title_japanese}
                altTitle={manga.title !== displayTitle ? manga.title : null}
            />

            {allGenres.length > 0 && (
                <TagList>
                    {allGenres.map(genre => (
                        <Pill key={genre.mal_id}>{genre.name}</Pill>
                    ))}
                </TagList>
            )}

            {manga.authors.length > 0 && (
                <MetaRow label="By">
                    {manga.authors.map((author, i) => (
                        <span key={author.mal_id}>
                            <Link href={`/person/${author.mal_id}`} className={styles.authorLink}>
                                {formatName(author.name)}
                            </Link>
                            {i < manga.authors.length - 1 && ", "}
                        </span>
                    ))}
                </MetaRow>
            )}

            {manga.serializations.length > 0 && (
                <MetaRow label="Serialization:">{manga.serializations.map(s => s.name).join(", ")}</MetaRow>
            )}

            <MobileStats>
                {manga.type && <SidebarStatRow label="Type" value={manga.type} />}
                {manga.status && <SidebarStatRow label="Status" value={manga.status} />}
                {manga.volumes && <SidebarStatRow label="Volumes" value={manga.volumes} />}
                {manga.chapters && <SidebarStatRow label="Chapters" value={manga.chapters} />}
                {manga.published?.string && <SidebarStatRow label="Published" value={manga.published.string} />}
                {manga.rank && <SidebarStatRow label="Rank" value={`#${manga.rank}`} />}
                {manga.popularity && <SidebarStatRow label="Popularity" value={`#${manga.popularity}`} />}
                {manga.members && <SidebarStatRow label="Members" value={manga.members.toLocaleString()} />}
            </MobileStats>

            {statistics && (
                <StatisticsSection
                    data={{
                        statusLabels: ["Reading", "Completed", "On Hold", "Dropped", "Plan to Read"],
                        statusValues: [
                            statistics.reading,
                            statistics.completed,
                            statistics.on_hold,
                            statistics.dropped,
                            statistics.plan_to_read,
                        ],
                        statusTitle: "Read Status",
                        total: statistics.total,
                        scores: statistics.scores,
                    }}
                />
            )}

            <TextSection title="Synopsis" paragraphs={synopsisParagraphs} />
            <TextSection title="Background" paragraphs={backgroundParagraphs} />

            {tabs.length > 0 && (
                <ContentTabsWrapper>
                    <Tabs tabs={tabs} />
                </ContentTabsWrapper>
            )}
        </EntityPageLayout>
    );
}
