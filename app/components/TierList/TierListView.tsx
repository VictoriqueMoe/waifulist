"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { TIER_COLORS, TIER_RANKS, TierListCharacter, TierListWithCharacters, TierRank } from "@/types/tierlist";
import { useCharacterUrl } from "@/hooks/useCharacterUrl";
import styles from "./TierListView.module.scss";

interface TierListViewProps {
    tierList: TierListWithCharacters;
}

export function TierListView({ tierList }: TierListViewProps) {
    const totalCharacters = TIER_RANKS.reduce((sum, rank) => sum + tierList.tiers[rank].length, 0);

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{tierList.name}</h1>
                <div className={styles.meta}>
                    <span>by {tierList.username}</span>
                    <span>{totalCharacters} characters</span>
                </div>
            </div>

            <div className={styles.tierList}>
                {TIER_RANKS.map(rank => (
                    <TierRow key={rank} rank={rank} characters={tierList.tiers[rank]} />
                ))}
            </div>
        </div>
    );
}

interface TierRowProps {
    rank: TierRank;
    characters: TierListWithCharacters["tiers"][TierRank];
}

function TierRow({ rank, characters }: TierRowProps) {
    if (characters.length === 0) {
        return (
            <div className={styles.tierRow}>
                <div className={styles.tierLabel} style={{ backgroundColor: TIER_COLORS[rank] }}>
                    {rank}
                </div>
                <div className={styles.tierCharacters}>
                    <div className={styles.emptyTier}>No characters</div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.tierRow}>
            <div className={styles.tierLabel} style={{ backgroundColor: TIER_COLORS[rank] }}>
                {rank}
            </div>
            <div className={styles.tierCharacters}>
                {characters.map(character => (
                    <CharacterCard key={character.anilistId} character={character} />
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
