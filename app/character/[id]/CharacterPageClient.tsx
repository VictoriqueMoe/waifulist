"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CharacterAnimeAppearance, CharacterFull, CharacterVoiceActor } from "@/types/character";
import { PowerEntry, VSBattlesStats } from "@/types/vsbattles";
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
import { Modal } from "@/components/Modal/Modal";
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

interface PowerLevelContentProps {
    characterId: number;
}

function PowerLevelContent({ characterId }: PowerLevelContentProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<VSBattlesStats | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [selectedPower, setSelectedPower] = useState<PowerEntry | null>(null);

    const handleClosePowerModal = useCallback(() => {
        setSelectedPower(null);
    }, []);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch(`/api/vsbattles/${characterId}`);
                if (!res.ok) {
                    setNotFound(true);
                    return;
                }
                const data = await res.json();
                if (!data.found) {
                    setNotFound(true);
                    return;
                }
                setStats(data.stats);
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, [characterId]);

    if (loading) {
        return (
            <div className={styles.powerLevelLoading}>
                <div className={styles.powerLevelSpinner} />
                <span>Searching VS Battles Wiki...</span>
            </div>
        );
    }

    if (notFound || !stats) {
        return (
            <div className={styles.powerLevelNotFound}>
                <i className="bi bi-question-circle" />
                <p>No VS Battles Wiki entry found for this character.</p>
            </div>
        );
    }

    const infoFields = [
        { label: "Name", value: stats.name },
        { label: "Origin", value: stats.origin },
        { label: "Classification", value: stats.classification },
        { label: "Gender", value: stats.gender },
        { label: "Age", value: stats.age },
    ];

    const statFields = [
        { label: "Tier", value: stats.tier, icon: "trophy", wikiPage: "Tiering_System" },
        { label: "Attack Potency", value: stats.attackPotency, icon: "lightning", wikiPage: "Attack_Potency" },
        { label: "Speed", value: stats.speed, icon: "speedometer2", wikiPage: "Speed" },
        { label: "Durability", value: stats.durability, icon: "shield", wikiPage: "Durability" },
        {
            label: "Striking Strength",
            value: stats.strikingStrength,
            icon: "hand-index-thumb",
            wikiPage: "Striking_Strength",
        },
        {
            label: "Lifting Strength",
            value: stats.liftingStrength,
            icon: "arrow-up-circle",
            wikiPage: "Lifting_Strength",
        },
        { label: "Stamina", value: stats.stamina, icon: "battery-full", wikiPage: "Stamina" },
        { label: "Range", value: stats.range, icon: "arrows-expand", wikiPage: "Range" },
        { label: "Standard Equipment", value: stats.standardEquipment, icon: "box", wikiPage: "Standard_Equipment" },
        { label: "Intelligence", value: stats.intelligence, icon: "lightbulb", wikiPage: "Intelligence" },
    ];

    const formatStatText = (text: string) => {
        const parts = text.split(" | ");
        if (parts.length > 1) {
            return parts.map((part, i) => (
                <div key={i} className={styles.powerLevelStatPart}>
                    {stats.keys && stats.keys[i] && <span className={styles.powerLevelStatKey}>{stats.keys[i]}:</span>}
                    {formatLongText(part.trim()).map((para, j) => (
                        <p key={j}>{para.text}</p>
                    ))}
                </div>
            ));
        }
        return formatLongText(text).map((para, i) => <p key={i}>{para.text}</p>);
    };

    return (
        <div className={styles.tabContentSection}>
            <div className={styles.powerLevelHeader}>
                <h3>{stats.pageTitle}</h3>
                <a href={stats.pageUrl} target="_blank" rel="noopener noreferrer" className={styles.powerLevelLink}>
                    View on VS Battles Wiki <i className="bi bi-box-arrow-up-right" />
                </a>
            </div>

            <div className={styles.powerLevelInfo}>
                {infoFields.map(
                    field =>
                        field.value && (
                            <div key={field.label} className={styles.powerLevelInfoItem}>
                                <span className={styles.powerLevelInfoLabel}>{field.label}:</span>
                                <span className={styles.powerLevelInfoValue}>{field.value}</span>
                            </div>
                        ),
                )}
            </div>

            {stats.keys && stats.keys.length > 0 && (
                <div className={styles.powerLevelKeys}>
                    <span className={styles.powerLevelKeysLabel}>Forms:</span>
                    {stats.keys.map((key, i) => (
                        <Pill key={i}>{key}</Pill>
                    ))}
                </div>
            )}

            {statFields.map(
                field =>
                    field.value && (
                        <div key={field.label} className={styles.powerLevelLongStat}>
                            <h4>
                                <i className={`bi bi-${field.icon}`} />
                                {field.label}
                                <a
                                    href={`https://vsbattles.fandom.com/wiki/${field.wikiPage}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.statWikiLink}
                                    title={`Learn about ${field.label}`}
                                >
                                    <i className="bi bi-info-circle" />
                                </a>
                            </h4>
                            <div className={styles.powerLevelLongStatContent}>{formatStatText(field.value)}</div>
                        </div>
                    ),
            )}

            {stats.powers && stats.powers.length > 0 && (
                <div className={styles.powerLevelPowers}>
                    <h4>Powers and Abilities</h4>
                    <div className={styles.powerLevelPowersList}>
                        {stats.powers.map((power, i) => (
                            <button key={i} className={styles.powerPillButton} onClick={() => setSelectedPower(power)}>
                                <Pill>{power.name}</Pill>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedPower && (
                <Modal
                    title={selectedPower.name}
                    onClose={handleClosePowerModal}
                    footer={
                        <a
                            href={`https://vsbattles.fandom.com/wiki/${encodeURIComponent(selectedPower.name.replace(/ /g, "_"))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.powerModalLink}
                        >
                            Learn more about {selectedPower.name} <i className="bi bi-box-arrow-up-right" />
                        </a>
                    }
                >
                    {selectedPower.description ? (
                        formatLongText(selectedPower.description).map((para, i) => <p key={i}>{para.text}</p>)
                    ) : (
                        <p className={styles.powerModalNotFound}>No specific description for this character.</p>
                    )}
                </Modal>
            )}

            {stats.notableAttacks && (
                <div className={styles.powerLevelSection}>
                    <h4>Notable Attacks/Techniques</h4>
                    <div className={styles.powerLevelLongStatContent}>
                        {formatLongText(stats.notableAttacks).map((para, i) => (
                            <p key={i}>{para.text}</p>
                        ))}
                    </div>
                </div>
            )}

            {stats.weaknesses && (
                <div className={styles.powerLevelSection}>
                    <h4>Weaknesses</h4>
                    <div className={styles.powerLevelLongStatContent}>
                        {formatLongText(stats.weaknesses).map((para, i) => (
                            <p key={i}>{para.text}</p>
                        ))}
                    </div>
                </div>
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

    tabs.push({
        id: "power-level",
        label: "Power Level",
        content: <PowerLevelContent characterId={character.mal_id} />,
    });

    const sidebarContent = (
        <>
            <SidebarItem icon="heart-fill" iconColor="#ec4899">
                {character.favorites.toLocaleString()} favourites
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
