"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getCurrentSeason, parseSeasonParam, parseYearParam, SeasonYear } from "@/lib/utils/seasonUtils";
import { useSeasonalAnime } from "@/hooks/useSeasonalAnime";
import { useSchedule } from "@/hooks/useSchedule";
import { formatTimeUntilAiring, useAiringSchedule } from "@/hooks/useAiringSchedule";
import { useAiringSubscriptions } from "@/hooks/useAiringSubscriptions";
import { useGenreFilter } from "@/hooks";
import { useWatchList } from "@/contexts/WatchListContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { SeasonSelector } from "@/components/SeasonSelector/SeasonSelector";
import { GenreFilter } from "@/components/GenreFilter/GenreFilter";
import { AnimeCard } from "@/components/AnimeCard/AnimeCard";
import { Pagination } from "@/components/Pagination/Pagination";
import { Spinner } from "@/components/Spinner/Spinner";
import { SubscribeButton } from "@/components/SubscribeButton/SubscribeButton";
import { DAY_LABELS, DayOfWeek, DAYS_OF_WEEK, getCurrentDayOfWeek, mapScheduleAnimeToAnime } from "@/types/schedule";
import { AIRING_BUCKET_LABELS } from "@/types/airing";
import { PAGE_SIZE } from "@/constants/pagination";
import styles from "./page.module.scss";

type CalendarView = "seasonal" | "schedule" | "timeline";

export function CalendarPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { ensureLoaded } = useWatchList();

    const viewParam = searchParams.get("view");
    const [view, setView] = useState<CalendarView>(
        viewParam === "schedule" ? "schedule" : viewParam === "timeline" ? "timeline" : "seasonal",
    );

    const seasonParam = parseSeasonParam(searchParams.get("season"));
    const yearParam = parseYearParam(searchParams.get("year"));
    const pageParam = parseInt(searchParams.get("page") || "1", 10);

    const defaultSeason = getCurrentSeason();
    const [seasonYear, setSeasonYear] = useState<SeasonYear>({
        season: seasonParam || defaultSeason.season,
        year: yearParam || defaultSeason.year,
    });
    const [page, setPage] = useState(pageParam);
    const [activeDay, setActiveDay] = useState<DayOfWeek>(getCurrentDayOfWeek());

    const { allGenres, selectedGenres, genresLoading, handleGenreChange: baseHandleGenreChange } = useGenreFilter();

    const {
        anime: seasonalAnime,
        totalCount,
        filteredCount,
        loading: seasonalLoading,
    } = useSeasonalAnime({
        year: seasonYear.year,
        season: seasonYear.season,
        page,
        pageSize: PAGE_SIZE,
        genres: selectedGenres,
    });

    const { loading: scheduleLoading, error: scheduleError, getAnimeForDay, lastUpdated } = useSchedule();
    const {
        grouped: airingGrouped,
        loading: airingLoading,
        error: airingError,
        fetchedAt: airingFetchedAt,
    } = useAiringSchedule();

    const { user } = useAuth();
    const { isSubscribed, subscribe, unsubscribe, subscribedIds } = useAiringSubscriptions();
    const { settings, updateCalendarSettings } = useSettings();
    const showSubscribedOnly = settings.calendar.showSubscribedOnly;

    const totalPages = Math.ceil(filteredCount / PAGE_SIZE);
    const animeForDay = getAnimeForDay(activeDay);
    const displayDays = DAYS_OF_WEEK.filter(day => day !== "other" && day !== "unknown");
    const todayDay = getCurrentDayOfWeek();

    useEffect(() => {
        ensureLoaded();
    }, [ensureLoaded]);

    const updateUrl = useCallback(
        (newView: CalendarView, newSeasonYear?: SeasonYear, newPage?: number) => {
            const url = new URL(window.location.href);
            url.searchParams.set("view", newView);
            if (newView === "seasonal") {
                const sy = newSeasonYear || seasonYear;
                const p = newPage ?? page;
                url.searchParams.set("year", sy.year.toString());
                url.searchParams.set("season", sy.season);
                if (p > 1) {
                    url.searchParams.set("page", p.toString());
                } else {
                    url.searchParams.delete("page");
                }
            } else {
                url.searchParams.delete("year");
                url.searchParams.delete("season");
                url.searchParams.delete("page");
            }
            router.replace(url.pathname + url.search, { scroll: false });
        },
        [router, seasonYear, page],
    );

    const handleViewChange = useCallback(
        (newView: CalendarView) => {
            setView(newView);
            updateUrl(newView);
        },
        [updateUrl],
    );

    const handleGenreChange = useCallback(
        (genres: string[]) => {
            baseHandleGenreChange(genres);
            setPage(1);
        },
        [baseHandleGenreChange],
    );

    const handleSeasonChange = useCallback(
        (newSeasonYear: SeasonYear) => {
            setSeasonYear(newSeasonYear);
            setPage(1);
            updateUrl("seasonal", newSeasonYear, 1);
        },
        [updateUrl],
    );

    const handlePageChange = useCallback(
        (newPage: number) => {
            setPage(newPage);
            updateUrl("seasonal", seasonYear, newPage);
            window.scrollTo({ top: 0, behavior: "smooth" });
        },
        [seasonYear, updateUrl],
    );

    const handleDayChange = useCallback((day: DayOfWeek) => {
        setActiveDay(day);
    }, []);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Calendar</h1>
                <p className={styles.subtitle}>
                    {view === "seasonal"
                        ? "Browse anime by season and year"
                        : view === "schedule"
                          ? "Currently airing anime by day"
                          : "Upcoming episode countdowns"}
                </p>
            </div>

            <div className={styles.viewTabs}>
                <button
                    className={`${styles.viewTab} ${view === "seasonal" ? styles.active : ""}`}
                    onClick={() => handleViewChange("seasonal")}
                >
                    <i className="bi bi-calendar3" />
                    <span>Seasonal</span>
                </button>
                <button
                    className={`${styles.viewTab} ${view === "schedule" ? styles.active : ""}`}
                    onClick={() => handleViewChange("schedule")}
                >
                    <i className="bi bi-clock" />
                    <span>Schedule</span>
                </button>
                <button
                    className={`${styles.viewTab} ${view === "timeline" ? styles.active : ""}`}
                    onClick={() => handleViewChange("timeline")}
                >
                    <i className="bi bi-hourglass-split" />
                    <span>Timeline</span>
                </button>
            </div>

            {view === "seasonal" ? (
                <>
                    <div className={styles.selectorWrapper}>
                        <SeasonSelector value={seasonYear} onChange={handleSeasonChange} />
                    </div>

                    <div className={styles.genreFilterWrapper}>
                        <GenreFilter
                            genres={allGenres}
                            selected={selectedGenres}
                            onChangeAction={handleGenreChange}
                            loading={genresLoading}
                            defaultCollapsed
                        />
                    </div>

                    {seasonalLoading ? (
                        <div className={styles.loading}>
                            <Spinner text="Loading..." />
                        </div>
                    ) : seasonalAnime.length > 0 ? (
                        <>
                            <div className={styles.resultInfo}>
                                <span>
                                    {selectedGenres.length > 0
                                        ? `${filteredCount} of ${totalCount} anime`
                                        : `${totalCount} anime found`}{" "}
                                    for {seasonYear.season.charAt(0).toUpperCase()}
                                    {seasonYear.season.slice(1)} {seasonYear.year}
                                </span>
                            </div>

                            <div className={styles.grid}>
                                {seasonalAnime.map(item => (
                                    <AnimeCard key={item.mal_id} anime={item} showStartDate />
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </>
                    ) : (
                        <div className={styles.empty}>
                            <i className="bi bi-calendar-x" />
                            <h3>No anime found</h3>
                            <p>
                                {selectedGenres.length > 0
                                    ? `No anime match the selected genres for ${seasonYear.season.charAt(0).toUpperCase()}${seasonYear.season.slice(1)} ${seasonYear.year}`
                                    : `There are no anime for ${seasonYear.season.charAt(0).toUpperCase()}${seasonYear.season.slice(1)} ${seasonYear.year}`}
                            </p>
                        </div>
                    )}
                </>
            ) : view === "schedule" ? (
                <>
                    {scheduleLoading ? (
                        <div className={styles.loading}>
                            <Spinner text="Loading schedule..." />
                        </div>
                    ) : scheduleError ? (
                        <div className={styles.error}>
                            <i className="bi bi-exclamation-triangle" />
                            <h3>Failed to load schedule</h3>
                            <p>{scheduleError}</p>
                        </div>
                    ) : (
                        <>
                            {lastUpdated && (
                                <p className={styles.lastUpdated}>
                                    Last updated: {new Date(lastUpdated).toLocaleString()}
                                </p>
                            )}

                            {user && (
                                <div className={styles.filterToggle}>
                                    <label className={styles.toggleLabel}>
                                        <input
                                            type="checkbox"
                                            checked={showSubscribedOnly}
                                            onChange={e =>
                                                updateCalendarSettings({ showSubscribedOnly: e.target.checked })
                                            }
                                        />
                                        <span>Show subscribed only</span>
                                    </label>
                                </div>
                            )}

                            <div className={styles.dayTabs}>
                                {displayDays.map(day => {
                                    const count = getAnimeForDay(day).length;
                                    const isToday = day === todayDay;
                                    const isActive = day === activeDay;
                                    return (
                                        <button
                                            key={day}
                                            className={`${styles.dayTab} ${isActive ? styles.active : ""} ${isToday ? styles.today : ""}`}
                                            onClick={() => handleDayChange(day)}
                                        >
                                            <span className={styles.dayName}>{DAY_LABELS[day]}</span>
                                            <span className={styles.count}>{count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {(() => {
                                const filteredAnime = showSubscribedOnly
                                    ? animeForDay.filter(a => subscribedIds.has(a.mal_id))
                                    : animeForDay;

                                return (
                                    <>
                                        <div className={styles.resultInfo}>
                                            <span>
                                                {filteredAnime.length} anime airing on {DAY_LABELS[activeDay]}
                                                {activeDay === todayDay && " (Today)"}
                                                {showSubscribedOnly && " (subscribed)"}
                                            </span>
                                        </div>

                                        {filteredAnime.length > 0 ? (
                                            <div className={styles.grid}>
                                                {filteredAnime.map(anime => (
                                                    <div key={anime.mal_id} className={styles.cardWrapper}>
                                                        <AnimeCard anime={mapScheduleAnimeToAnime(anime)} />
                                                        {user && (
                                                            <SubscribeButton
                                                                malId={anime.mal_id}
                                                                title={anime.title_english || anime.title}
                                                                isSubscribed={isSubscribed(anime.mal_id)}
                                                                onSubscribe={subscribe}
                                                                onUnsubscribe={unsubscribe}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className={styles.empty}>
                                                <i className="bi bi-calendar-x" />
                                                <h3>No anime scheduled</h3>
                                                <p>
                                                    {showSubscribedOnly
                                                        ? "No subscribed anime scheduled for this day"
                                                        : `There are no anime scheduled for ${DAY_LABELS[activeDay]}`}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </>
                    )}
                </>
            ) : (
                <>
                    {airingLoading ? (
                        <div className={styles.loading}>
                            <Spinner text="Loading timeline..." />
                        </div>
                    ) : airingError ? (
                        <div className={styles.error}>
                            <i className="bi bi-exclamation-triangle" />
                            <h3>Failed to load timeline</h3>
                            <p>{airingError}</p>
                        </div>
                    ) : airingGrouped.length > 0 ? (
                        <>
                            {airingFetchedAt && (
                                <p className={styles.lastUpdated}>
                                    Last updated: {new Date(airingFetchedAt).toLocaleString()}
                                </p>
                            )}

                            {user && (
                                <div className={styles.filterToggle}>
                                    <label className={styles.toggleLabel}>
                                        <input
                                            type="checkbox"
                                            checked={showSubscribedOnly}
                                            onChange={e =>
                                                updateCalendarSettings({ showSubscribedOnly: e.target.checked })
                                            }
                                        />
                                        <span>Show subscribed only</span>
                                    </label>
                                </div>
                            )}

                            {(() => {
                                const filteredGroups = showSubscribedOnly
                                    ? airingGrouped
                                          .map(group => ({
                                              ...group,
                                              items: group.items.filter(item => subscribedIds.has(item.malId)),
                                          }))
                                          .filter(group => group.items.length > 0)
                                    : airingGrouped;

                                if (filteredGroups.length === 0) {
                                    return (
                                        <div className={styles.empty}>
                                            <i className="bi bi-hourglass" />
                                            <h3>No subscribed shows</h3>
                                            <p>Subscribe to shows to see them here</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className={styles.timeline}>
                                        {filteredGroups.map(group => (
                                            <div key={group.bucket} className={styles.timelineSection}>
                                                <div className={styles.timelineSectionHeader}>
                                                    <span
                                                        className={`${styles.timelineSectionLabel} ${group.bucket === "airing_now" ? styles.airingNow : ""}`}
                                                    >
                                                        {AIRING_BUCKET_LABELS[group.bucket]}
                                                    </span>
                                                </div>
                                                <div className={styles.timelineItems}>
                                                    {group.items.map(item => {
                                                        const isAiringNow = item.timeUntilAiring <= 0;
                                                        const airingDate = new Date(item.airingAt * 1000);
                                                        return (
                                                            <div
                                                                key={`${item.malId}-${item.episode}`}
                                                                className={styles.timelineItemWrapper}
                                                            >
                                                                <Link
                                                                    href={`/anime/${item.malId}`}
                                                                    className={`${styles.timelineItem} ${isAiringNow ? styles.airingNow : ""}`}
                                                                >
                                                                    <div className={styles.timelineItemImage}>
                                                                        <Image
                                                                            src={item.coverImage}
                                                                            alt={item.titleEnglish || item.title}
                                                                            width={56}
                                                                            height={80}
                                                                            unoptimized
                                                                        />
                                                                    </div>
                                                                    <div className={styles.timelineItemInfo}>
                                                                        <span className={styles.timelineItemTitle}>
                                                                            {item.titleEnglish || item.title}
                                                                        </span>
                                                                        <span className={styles.timelineItemMeta}>
                                                                            Episode {item.episode}
                                                                        </span>
                                                                    </div>
                                                                    <div className={styles.timelineItemCountdown}>
                                                                        <span
                                                                            className={`${styles.countdownBadge} ${isAiringNow ? styles.airingNow : ""}`}
                                                                        >
                                                                            {formatTimeUntilAiring(
                                                                                item.timeUntilAiring,
                                                                            )}
                                                                        </span>
                                                                        {!isAiringNow && (
                                                                            <span className={styles.countdownTime}>
                                                                                {airingDate.toLocaleTimeString([], {
                                                                                    hour: "2-digit",
                                                                                    minute: "2-digit",
                                                                                })}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </Link>
                                                                {user && (
                                                                    <SubscribeButton
                                                                        malId={item.malId}
                                                                        title={item.titleEnglish || item.title}
                                                                        isSubscribed={isSubscribed(item.malId)}
                                                                        onSubscribe={subscribe}
                                                                        onUnsubscribe={unsubscribe}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </>
                    ) : (
                        <div className={styles.empty}>
                            <i className="bi bi-hourglass" />
                            <h3>No upcoming episodes</h3>
                            <p>There are no anime episodes scheduled to air soon</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
