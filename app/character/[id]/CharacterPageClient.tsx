"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { CharacterAnimeAppearance, CharacterFull, CharacterVoiceActor } from "@/types/character";
import { formatLongText } from "@/lib/textUtils";
import {
    ContentTabsWrapper,
    EntityPageLayout,
    PageHeader,
    SidebarItem,
    SidebarLink,
    TagList,
    TextSection,
} from "@/components/EntityPageLayout/EntityPageLayout";
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
                    <Link
                        key={voice.person.mal_id}
                        href={`/person/${voice.person.mal_id}`}
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
                    </Link>
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
    const renderAppearances = (items: typeof manga) => (
        <div className={styles.appearancesGrid}>
            {items.map(appearance => {
                const imageUrl =
                    appearance.manga.images?.jpg?.large_image_url || appearance.manga.images?.jpg?.image_url;
                return (
                    <Link
                        key={appearance.manga.mal_id}
                        href={`/manga/${appearance.manga.mal_id}`}
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
                    </Link>
                );
            })}
        </div>
    );

    return (
        <div className={styles.tabContentSection}>
            <RoleTabs
                items={manga}
                getRole={item => item.role}
                renderItems={renderAppearances}
                emptyMessage={role => `No ${role.toLowerCase()} appearances`}
            />
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

    const sidebarContent = (
        <>
            <SidebarItem icon="heart-fill" iconColor="#ec4899">
                {character.favorites.toLocaleString()} favorites
            </SidebarItem>
            <SidebarLink href={character.url} icon="box-arrow-up-right" external>
                View on MyAnimeList
            </SidebarLink>
        </>
    );

    return (
        <EntityPageLayout imageUrl={imageUrl} imageAlt={character.name} sidebarContent={sidebarContent}>
            <PageHeader title={character.name} subtitle={character.name_kanji} />

            {character.nicknames.length > 0 && (
                <TagList>
                    {character.nicknames.map((nickname, i) => (
                        <Pill key={i}>{nickname}</Pill>
                    ))}
                </TagList>
            )}

            <TextSection paragraphs={aboutParagraphs} />

            {tabs.length > 0 && (
                <ContentTabsWrapper>
                    <Tabs tabs={tabs} />
                </ContentTabsWrapper>
            )}
        </EntityPageLayout>
    );
}
