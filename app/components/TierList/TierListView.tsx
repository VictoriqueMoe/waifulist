"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { TIER_COLORS, TIER_RANKS, TierListCharacter, TierListWithCharacters, TierRank } from "@/types/tierlist";
import { ANILIST_FAILURE_COPY } from "@/types/anilist";
import { useCharacterUrl } from "@/hooks/useCharacterUrl";
import styles from "./TierListView.module.scss";

interface TierListViewProps {
    tierList: TierListWithCharacters;
}

export function TierListView({ tierList }: TierListViewProps) {
    const totalCharacters = TIER_RANKS.reduce((sum, rank) => sum + tierList.tiers[rank].length, 0);
    const unavailable = tierList.charactersUnavailable;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{tierList.name}</h1>
                <div className={styles.meta}>
                    <span>by {tierList.username}</span>
                    <span>{totalCharacters} characters</span>
                </div>
            </div>

            {unavailable && unavailable.missingCount > 0 && (
                <div className={styles.unavailableNotice}>
                    <i className="bi bi-exclamation-triangle" />
                    <span>
                        {unavailable.missingCount} {unavailable.missingCount === 1 ? "character is" : "characters are"}{" "}
                        hidden: {ANILIST_FAILURE_COPY[unavailable.reason].description}
                    </span>
                </div>
            )}

            <div className={styles.tierList}>
                {TIER_RANKS.map(rank => (
                    <TierRow
                        key={rank}
                        rank={rank}
                        characters={tierList.tiers[rank]}
                        customName={tierList.tierNames?.[rank]}
                    />
                ))}
            </div>
        </div>
    );
}

interface TierRowProps {
    rank: TierRank;
    characters: TierListWithCharacters["tiers"][TierRank];
    customName?: string;
}

function TierRow({ rank, characters, customName }: TierRowProps) {
    const displayName = customName || rank;

    if (characters.length === 0) {
        return (
            <div className={styles.tierRow}>
                <div
                    className={styles.tierLabel}
                    style={{ backgroundColor: TIER_COLORS[rank] }}
                    title={customName ? `${rank}: ${customName}` : rank}
                >
                    {displayName}
                </div>
                <div className={styles.tierCharacters}>
                    <div className={styles.emptyTier}>No characters</div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.tierRow}>
            <div
                className={styles.tierLabel}
                style={{ backgroundColor: TIER_COLORS[rank] }}
                title={customName ? `${rank}: ${customName}` : rank}
            >
                {displayName}
            </div>
            <div className={styles.tierCharacters}>
                {characters.map((character, index) => (
                    <CharacterCard key={`${character.anilistId}-${index}`} character={character} />
                ))}
            </div>
        </div>
    );
}

interface CharacterCardProps {
    character: TierListCharacter;
}

function CharacterCard({ character }: CharacterCardProps) {
    const { getCharacterUrl, loading: isLoading } = useCharacterUrl();

    const handleClick = async () => {
        if (isLoading) {
            return;
        }

        const mediaWithMalId = character.anime.find(a => a.malId !== null);
        const mediaType = mediaWithMalId?.type ?? "anime";
        const url = await getCharacterUrl(
            character.name,
            mediaWithMalId?.malId ?? null,
            character.anilistId,
            mediaType,
        );
        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <div
            className={`${styles.characterCard} ${styles.clickable} ${isLoading ? styles.loading : ""}`}
            onClick={handleClick}
        >
            <Image
                src={character.image}
                alt={character.name}
                width={80}
                height={110}
                className={styles.characterImage}
            />
            <div className={styles.characterOverlay}>
                <div className={styles.characterName}>{character.name}</div>
                {character.anime.length > 0 && character.anime[0].malId && (
                    <Link
                        href={`/${character.anime[0].type ?? "anime"}/${character.anime[0].malId}`}
                        className={styles.animeLink}
                        onClick={e => e.stopPropagation()}
                    >
                        {character.anime[0].title}
                    </Link>
                )}
                {character.anime.length > 1 && (
                    <div className={styles.moreAnime}>+{character.anime.length - 1} more</div>
                )}
            </div>
            {isLoading && <div className={styles.loadingOverlay} />}
        </div>
    );
}
