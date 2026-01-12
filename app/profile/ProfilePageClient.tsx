"use client";

import React from "react";
import Link from "next/link";
import {
    ArcElement,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { watchStatusLabels } from "@/types/anime";
import { useStats } from "@/hooks/useStats";
import { useTierLists } from "@/hooks/useTierList";
import { BookmarkedUsersSection } from "@/components/BookmarkedUsersSection/BookmarkedUsersSection";
import { SubscribedShowsSection } from "@/components/SubscribedShowsSection/SubscribedShowsSection";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useAiringSubscriptions } from "@/hooks/useAiringSubscriptions";
import { Spinner } from "@/components/Spinner/Spinner";
import { TierListCard } from "@/components/TierListCard";
import styles from "./page.module.scss";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const STATUS_COLORS: Record<string, string> = {
    watching: "#3b82f6",
    completed: "#22c55e",
    plan_to_watch: "#f59e0b",
    on_hold: "#8b5cf6",
    dropped: "#ef4444",
};

const RATING_LABELS: Record<number, string> = {
    "-1": "Dogshit",
    1: "1 Star",
    2: "2 Stars",
    3: "3 Stars",
    4: "4 Stars",
    5: "5 Stars",
    6: "Masterpiece",
};

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

export function ProfilePageClient() {
    const { stats, loading, error } = useStats();
    const { bookmarks, removeBookmark } = useBookmarks();
    const { tierLists, loading: tierListsLoading } = useTierLists();
    const { subscriptions, unsubscribe } = useAiringSubscriptions();

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.loading}>
                        <Spinner text="Loading stats..." />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.error}>
                        <i className="bi bi-exclamation-circle" />
                        <p>{error || "Failed to load statistics"}</p>
                    </div>
                </div>
            </div>
        );
    }

    const statusLabels = Object.keys(stats.statusCounts).map(
        s => watchStatusLabels[s as keyof typeof watchStatusLabels] || s,
    );
    const statusValues = Object.values(stats.statusCounts);
    const statusColors = Object.keys(stats.statusCounts).map(s => STATUS_COLORS[s] || "#6b7280");

    const statusChartData = {
        labels: statusLabels,
        datasets: [
            {
                data: statusValues,
                backgroundColor: statusColors,
                borderWidth: 0,
            },
        ],
    };

    const genreChartData = {
        labels: stats.genreCounts.map(g => g.genre),
        datasets: [
            {
                label: "Anime Count",
                data: stats.genreCounts.map(g => g.count),
                backgroundColor: "#8b5cf6",
                borderRadius: 4,
            },
        ],
    };

    const ratingChartData = {
        labels: stats.ratingCounts.map(r => RATING_LABELS[r.rating] || `${r.rating}`),
        datasets: [
            {
                label: "Anime Count",
                data: stats.ratingCounts.map(r => r.count),
                backgroundColor: stats.ratingCounts.map(r => {
                    if (r.rating === 6) {
                        return "#a855f7";
                    }
                    if (r.rating === -1) {
                        return "#78716c";
                    }
                    return "#3b82f6";
                }),
                borderRadius: 4,
            },
        ],
    };

    const activityChartData = {
        labels: stats.activityByMonth.map(a => formatMonthLabel(a.month)),
        datasets: [
            {
                label: "Anime Added",
                data: stats.activityByMonth.map(a => a.count),
                borderColor: "#22c55e",
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                fill: true,
                tension: 0.3,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            x: {
                grid: {
                    color: "rgba(255, 255, 255, 0.1)",
                },
                ticks: {
                    color: "#9ca3af",
                },
            },
            y: {
                grid: {
                    color: "rgba(255, 255, 255, 0.1)",
                },
                ticks: {
                    color: "#9ca3af",
                },
            },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom" as const,
                labels: {
                    color: "#9ca3af",
                    padding: 16,
                },
            },
        },
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1>
                        <i className="bi bi-person-circle" />
                        {stats.username}
                    </h1>
                    <p className={styles.subtitle}>Member since {formatDate(stats.memberSince)}</p>
                </div>

                {/* My List Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>
                            <i className="bi bi-bookmark" />
                            My List
                        </h2>
                        <Link href="/my-list" className={styles.viewAllLink}>
                            View All <i className="bi bi-arrow-right" />
                        </Link>
                    </div>
                    {stats.totalAnime > 0 ? (
                        <div className={styles.listPreview}>
                            <div className={styles.listStats}>
                                {Object.entries(stats.statusCounts).map(([status, count]) => (
                                    <div key={status} className={styles.listStatItem}>
                                        <span className={`${styles.statusDot} ${styles[status]}`} />
                                        <span className={styles.statusLabel}>
                                            {watchStatusLabels[status as keyof typeof watchStatusLabels]}
                                        </span>
                                        <span className={styles.statusCount}>{count}</span>
                                    </div>
                                ))}
                            </div>
                            <div className={styles.listTotal}>
                                <span>{stats.totalAnime} anime</span>
                                <span>{stats.totalEpisodes.toLocaleString()} episodes</span>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.emptySection}>
                            <p>No anime in your list yet</p>
                            <Link href="/browse" className={styles.emptyLink}>
                                Browse anime to add some
                            </Link>
                        </div>
                    )}
                </section>

                {/* My Tier Lists Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>
                            <i className="bi bi-list-ol" />
                            My Tier Lists
                        </h2>
                        <Link href="/tierlist" className={styles.viewAllLink}>
                            View All <i className="bi bi-arrow-right" />
                        </Link>
                    </div>
                    {tierListsLoading ? (
                        <div className={styles.sectionLoading}>
                            <Spinner text="Loading..." />
                        </div>
                    ) : tierLists.length > 0 ? (
                        <div className={styles.tierListGrid}>
                            {tierLists.slice(0, 3).map(tierList => (
                                <TierListCard
                                    key={tierList.publicId}
                                    publicId={tierList.publicId}
                                    name={tierList.name}
                                    characterCount={tierList.characterCount}
                                    updatedAt={tierList.updatedAt}
                                    isPublic={tierList.isPublic}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptySection}>
                            <p>No tier lists yet</p>
                            <Link href="/tierlist/create" className={styles.emptyLink}>
                                Create your first tier list
                            </Link>
                        </div>
                    )}
                </section>

                {/* Bookmarks Section */}
                <BookmarkedUsersSection bookmarks={bookmarks} onRemove={removeBookmark} />

                {/* Subscribed Shows Section */}
                <SubscribedShowsSection subscriptions={subscriptions} onRemove={unsubscribe} />

                {/* Stats Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2>
                            <i className="bi bi-bar-chart" />
                            Stats
                        </h2>
                    </div>

                    <div className={styles.summaryCards}>
                        <div className={styles.summaryCard}>
                            <i className="bi bi-collection-play" />
                            <div className={styles.summaryValue}>{stats.totalAnime}</div>
                            <div className={styles.summaryLabel}>Total Anime</div>
                        </div>
                        <div className={styles.summaryCard}>
                            <i className="bi bi-play-circle" />
                            <div className={styles.summaryValue}>{stats.totalEpisodes.toLocaleString()}</div>
                            <div className={styles.summaryLabel}>Episodes</div>
                        </div>
                        <div className={styles.summaryCard}>
                            <i className="bi bi-star" />
                            <div className={styles.summaryValue}>{stats.avgRating ?? "-"}</div>
                            <div className={styles.summaryLabel}>Avg Rating</div>
                        </div>
                    </div>

                    <div className={styles.chartsGrid}>
                        <div className={styles.chartCard}>
                            <h3>Status Breakdown</h3>
                            <div className={styles.chartContainer}>
                                <Doughnut data={statusChartData} options={doughnutOptions} />
                            </div>
                        </div>

                        <div className={styles.chartCard}>
                            <h3>Your Ratings</h3>
                            <div className={styles.chartContainer}>
                                <Bar data={ratingChartData} options={chartOptions} />
                            </div>
                        </div>
                    </div>

                    <div className={styles.chartCardWide}>
                        <h3>Top Genres</h3>
                        <div className={styles.chartContainerWide}>
                            <Bar
                                data={genreChartData}
                                options={{
                                    ...chartOptions,
                                    indexAxis: "y" as const,
                                }}
                            />
                        </div>
                    </div>

                    <div className={styles.chartCardWide}>
                        <h3>Activity Timeline</h3>
                        <div className={styles.chartContainerWide}>
                            <Line data={activityChartData} options={chartOptions} />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
