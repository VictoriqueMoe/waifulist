export type Season = "winter" | "spring" | "summer" | "fall";

export interface SeasonYear {
    season: Season;
    year: number;
}

const SEASON_MONTHS: Record<Season, number[]> = {
    winter: [1, 2, 3],
    spring: [4, 5, 6],
    summer: [7, 8, 9],
    fall: [10, 11, 12],
};

const SEASON_ORDER: Season[] = ["winter", "spring", "summer", "fall"];

export function getSeasonFromMonth(month: number): Season {
    if (month >= 1 && month <= 3) {
        return "winter";
    }
    if (month >= 4 && month <= 6) {
        return "spring";
    }
    if (month >= 7 && month <= 9) {
        return "summer";
    }
    return "fall";
}

export function getSeasonFromDate(date: Date): Season {
    return getSeasonFromMonth(date.getMonth() + 1);
}

export function getCurrentSeason(): SeasonYear {
    const now = new Date();
    return {
        season: getSeasonFromDate(now),
        year: now.getFullYear(),
    };
}

export function getSeasonMonthRange(season: Season): { startMonth: number; endMonth: number } {
    const months = SEASON_MONTHS[season];
    return {
        startMonth: months[0],
        endMonth: months[months.length - 1],
    };
}

const SEASON_DISPLAY_NAMES: Record<Season, string> = {
    winter: "Winter",
    spring: "Spring",
    summer: "Summer",
    fall: "Autumn",
};

export function getSeasonLabel(season: Season, year: number): string {
    return `${SEASON_DISPLAY_NAMES[season]} ${year}`;
}

export function getPreviousSeason(seasonYear: SeasonYear): SeasonYear {
    const currentIndex = SEASON_ORDER.indexOf(seasonYear.season);
    if (currentIndex === 0) {
        return {
            season: SEASON_ORDER[3],
            year: seasonYear.year - 1,
        };
    }
    return {
        season: SEASON_ORDER[currentIndex - 1],
        year: seasonYear.year,
    };
}

export function getNextSeason(seasonYear: SeasonYear): SeasonYear {
    const currentIndex = SEASON_ORDER.indexOf(seasonYear.season);
    if (currentIndex === 3) {
        return {
            season: SEASON_ORDER[0],
            year: seasonYear.year + 1,
        };
    }
    return {
        season: SEASON_ORDER[currentIndex + 1],
        year: seasonYear.year,
    };
}

export function isCurrentSeason(seasonYear: SeasonYear): boolean {
    const current = getCurrentSeason();
    return seasonYear.season === current.season && seasonYear.year === current.year;
}

export function parseSeasonFromStartDate(startDate: string | undefined): SeasonYear | null {
    if (!startDate) {
        return null;
    }

    const parts = startDate.split("-");
    if (parts.length < 2) {
        return null;
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return null;
    }

    return {
        season: getSeasonFromMonth(month),
        year,
    };
}

export function matchesSeason(startDate: string | undefined, targetSeason: Season, targetYear: number): boolean {
    const parsed = parseSeasonFromStartDate(startDate);
    if (!parsed) {
        return false;
    }
    return parsed.season === targetSeason && parsed.year === targetYear;
}

export function getAvailableYears(): number[] {
    const currentYear = new Date().getFullYear();
    const startYear = 1970;
    const endYear = currentYear + 1;

    const years: number[] = [];
    for (let year = endYear; year >= startYear; year--) {
        years.push(year);
    }
    return years;
}

export function getAllSeasons(): Season[] {
    return [...SEASON_ORDER];
}

const VALID_SEASONS = new Set<string>(SEASON_ORDER);

export function parseSeasonParam(param: string | null): Season | null {
    if (!param) {
        return null;
    }
    return VALID_SEASONS.has(param) ? (param as Season) : null;
}

export function parseYearParam(param: string | null): number | null {
    if (!param) {
        return null;
    }
    const year = parseInt(param, 10);
    if (isNaN(year) || year < 1970 || year > new Date().getFullYear() + 1) {
        return null;
    }
    return year;
}
