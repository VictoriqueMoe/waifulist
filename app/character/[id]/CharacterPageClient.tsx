"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CharacterAnimeAppearance, CharacterFull, CharacterVoiceActor } from "@/types/character";
import { formatLongText } from "@/lib/textUtils";
import { Pill } from "@/components/Pill/Pill";
import { PillTab, PillTabs } from "@/components/PillTabs/PillTabs";
import { RoleTabs } from "@/components/RoleTabs/RoleTabs";
import { Tab, Tabs } from "@/components/Tabs/Tabs";
import styles from "./page.module.scss";

interface CharacterPageClientProps {
    character: CharacterFull;
}

function formatName(name: string): string {
    const parts = name.split(", ");
    if (parts.length === 2) {
        return `${parts[1]} ${parts[0]}`;
    }
    return name;
}

function VoiceActorsContent({ voices }: { voices: CharacterVoiceActor[] }) {
    const languageGroups: Record<string, CharacterVoiceActor[]> = {};
    for (const voice of voices) {
        if (!languageGroups[voice.language]) {
            languageGroups[voice.language] = [];
        }
        languageGroups[voice.language].push(voice);
    }

    const languageOrder = ["Japanese", "English", "Korean", "Spanish", "German", "French", "Italian", "Portuguese"];
    const sortedLanguages = Object.keys(languageGroups).sort((a, b) => {
        const indexA = languageOrder.indexOf(a);
        const indexB = languageOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) {
            return a.localeCompare(b);
        }
        if (indexA === -1) {
            return 1;
        }
        if (indexB === -1) {
            return -1;
        }
        return indexA - indexB;
    });

    const tabs: PillTab[] = sortedLanguages.map(lang => ({
        id: lang.toLowerCase(),
        label: lang,
        count: languageGroups[lang].length,
    }));

    const renderContent = (tabId: string) => {
        const language = sortedLanguages.find(l => l.toLowerCase() === tabId) || sortedLanguages[0];
        const activeVoices = languageGroups[language] || [];
        return (
            <div className={styles.actorCards}>
                {activeVoices.map(voice => (
                    <a
                        key={voice.person.mal_id}
                        href={voice.person.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.actorCard}
                    >
                        <div className={styles.actorImage}>
                            {voice.person.images?.jpg?.image_url ? (
                                <Image
                                    src={voice.person.images.jpg.image_url}
                                    alt={voice.person.name}
                                    fill
                                    sizes="60px"
                                />
                            ) : (
                                <div className={styles.noImage} />
                            )}
                        </div>
                        <span className={styles.actorName}>{formatName(voice.person.name)}</span>
                    </a>
                ))}
            </div>
        );
    };

    return (
        <div className={styles.tabContentSection}>
            <PillTabs tabs={tabs} renderContent={renderContent} />
        </div>
    );
}

function AnimeAppearancesContent({ anime }: { anime: CharacterFull["anime"] }) {
    const renderAppearances = (items: CharacterAnimeAppearance[]) => (
        <div className={styles.appearancesGrid}>
            {items.map(appearance => {
                const imageUrl =
                    appearance.anime.images?.jpg?.large_image_url || appearance.anime.images?.jpg?.image_url;
                return (
                    <Link
                        key={appearance.anime.mal_id}
                        href={`/anime/${appearance.anime.mal_id}`}
                        className={styles.appearanceCard}
                    >
                        <div className={styles.appearanceImage}>
                            {imageUrl ? (
                                <Image src={imageUrl} alt={appearance.anime.title} fill sizes="140px" />
                            ) : (
                                <div className={styles.noImage} />
                            )}
                        </div>
                        <span className={styles.appearanceTitle}>{appearance.anime.title}</span>
                    </Link>
                );
            })}
        </div>
    );

    return (
        <div className={styles.tabContentSection}>
            <RoleTabs
                items={anime}
                getRole={item => item.role}
                renderItems={renderAppearances}
                emptyMessage={role => `No ${role.toLowerCase()} appearances`}
            />
        </div>
    );
}

function MangaAppearancesContent({ manga }: { manga: CharacterFull["manga"] }) {
    const [showAll, setShowAll] = useState(false);

    const displayManga = showAll ? manga : manga.slice(0, 6);
    const hasMore = manga.length > 6;

    return (
        <div className={styles.tabContentSection}>
            <div className={styles.appearancesGrid}>
                {displayManga.map(appearance => {
                    const imageUrl =
                        appearance.manga.images?.jpg?.large_image_url || appearance.manga.images?.jpg?.image_url;
                    return (
                        <a
                            key={appearance.manga.mal_id}
                            href={appearance.manga.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.appearanceCard}
                        >
                            <div className={styles.appearanceImage}>
                                {imageUrl ? (
                                    <Image src={imageUrl} alt={appearance.manga.title} fill sizes="140px" />
                                ) : (
                                    <div className={styles.noImage} />
                                )}
                            </div>
                            <span className={styles.appearanceTitle}>{appearance.manga.title}</span>
                            <span className={styles.appearanceRole}>{appearance.role}</span>
                        </a>
                    );
                })}
            </div>
            {hasMore && (
                <button className={styles.showMoreButton} onClick={() => setShowAll(!showAll)}>
                    {showAll ? "Show Less" : `Show ${manga.length - 6} More`}
                </button>
            )}
        </div>
    );
}

export function CharacterPageClient({ character }: CharacterPageClientProps) {
    const imageUrl = character.images?.webp?.image_url || character.images?.jpg?.image_url;
    const aboutParagraphs = character.about ? formatLongText(character.about) : [];

    const tabs: Tab[] = [];

    if (character.anime.length > 0) {
        tabs.push({
            id: "anime",
            label: `Anime (${character.anime.length})`,
            content: <AnimeAppearancesContent anime={character.anime} />,
        });
    }

    if (character.manga.length > 0) {
        tabs.push({
            id: "manga",
            label: `Manga (${character.manga.length})`,
            content: <MangaAppearancesContent manga={character.manga} />,
        });
    }

    if (character.voices.length > 0) {
        tabs.push({
            id: "voice-actors",
            label: `Voice Actors (${character.voices.length})`,
            content: <VoiceActorsContent voices={character.voices} />,
        });
    }

    return (
        <div className={styles.page}>
            <div className={styles.backdrop}>
                {imageUrl && <Image src={imageUrl} alt="" fill className={styles.backdropImage} />}
                <div className={styles.backdropOverlay} />
            </div>

            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.imageSection}>
                        <div className={styles.characterImage}>
                            {imageUrl ? (
                                <Image src={imageUrl} alt={character.name} fill sizes="280px" />
                            ) : (
                                <div className={styles.noImage} />
                            )}
                        </div>
                        <div className={styles.favorites}>
                            <i className="bi bi-heart-fill" />
                            <span>{character.favorites.toLocaleString()} favorites</span>
                        </div>
                        <a href={character.url} target="_blank" rel="noopener noreferrer" className={styles.malLink}>
                            <i className="bi bi-box-arrow-up-right" />
                            View on MyAnimeList
                        </a>
                    </div>

                    <div className={styles.infoSection}>
                        <div className={styles.header}>
                            <h1 className={styles.name}>{character.name}</h1>
                            {character.name_kanji && <p className={styles.nameKanji}>{character.name_kanji}</p>}
                        </div>

                        {character.nicknames.length > 0 && (
                            <div className={styles.nicknames}>
                                {character.nicknames.map((nickname, i) => (
                                    <Pill key={i}>{nickname}</Pill>
                                ))}
                            </div>
                        )}

                        {aboutParagraphs.length > 0 && (
                            <div className={styles.about}>
                                {aboutParagraphs.map((paragraph, i) => (
                                    <p key={i} className={paragraph.isAttribution ? styles.attribution : undefined}>
                                        {paragraph.text}
                                    </p>
                                ))}
                            </div>
                        )}

                        {tabs.length > 0 && (
                            <div className={styles.contentTabs}>
                                <Tabs tabs={tabs} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
