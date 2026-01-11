"use client";

import React from "react";
import {
    getAllSeasons,
    getAvailableYears,
    getNextSeason,
    getPreviousSeason,
    getSeasonLabel,
    isCurrentSeason,
    Season,
    SeasonYear,
} from "@/lib/seasonUtils";
import styles from "./SeasonSelector.module.scss";

interface SeasonSelectorProps {
    value: SeasonYear;
    onChange: (seasonYear: SeasonYear) => void;
}

const SEASON_LABELS: Record<Season, string> = {
    winter: "Winter",
    spring: "Spring",
    summer: "Summer",
    fall: "Autumn",
};

export function SeasonSelector({ value, onChange }: SeasonSelectorProps) {
    const seasons = getAllSeasons();
    const years = getAvailableYears();

    const handleSeasonChange = (season: Season) => {
        onChange({ ...value, season });
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onChange({ ...value, year: parseInt(e.target.value, 10) });
    };

    const handlePrevious = () => {
        onChange(getPreviousSeason(value));
    };

    const handleNext = () => {
        onChange(getNextSeason(value));
    };

    const isCurrent = isCurrentSeason(value);

    return (
        <div className={styles.container}>
            <div className={styles.navigation}>
                <button
                    type="button"
                    className={styles.navButton}
                    onClick={handlePrevious}
                    aria-label="Previous season"
                >
                    <i className="bi bi-chevron-left" />
                </button>

                <div className={styles.selector}>
                    <div className={styles.seasonTabs}>
                        {seasons.map(season => (
                            <button
                                key={season}
                                type="button"
                                className={`${styles.seasonTab} ${value.season === season ? styles.active : ""}`}
                                onClick={() => handleSeasonChange(season)}
                            >
                                {SEASON_LABELS[season]}
                            </button>
                        ))}
                    </div>

                    <select className={styles.yearSelect} value={value.year} onChange={handleYearChange}>
                        {years.map(year => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                <button type="button" className={styles.navButton} onClick={handleNext} aria-label="Next season">
                    <i className="bi bi-chevron-right" />
                </button>
            </div>

            <div className={styles.label}>
                <span className={styles.seasonLabel}>{getSeasonLabel(value.season, value.year)}</span>
                {isCurrent && <span className={styles.currentBadge}>Current</span>}
            </div>
        </div>
    );
}
