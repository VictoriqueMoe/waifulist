"use client";

import React from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import styles from "./StatisticsSection.module.scss";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, ArcElement, Legend);

export interface ScoreEntry {
    score: number;
    votes: number;
    percentage: number;
}

export interface StatisticsData {
    statusLabels: string[];
    statusValues: number[];
    statusTitle: string;
    total: number;
    scores: ScoreEntry[];
}

interface StatisticsSectionProps {
    data: StatisticsData;
}

function getChartColors() {
    if (typeof window === "undefined") {
        return { textColor: "#a1a1aa", gridColor: "rgba(161, 161, 170, 0.2)" };
    }
    const computedStyle = getComputedStyle(document.documentElement);
    return {
        textColor: computedStyle.getPropertyValue("--text-muted").trim() || "#a1a1aa",
        gridColor: computedStyle.getPropertyValue("--border-primary").trim() || "rgba(161, 161, 170, 0.2)",
    };
}

const STATUS_COLORS = [
    "rgba(59, 130, 246, 0.8)",
    "rgba(34, 197, 94, 0.8)",
    "rgba(234, 179, 8, 0.8)",
    "rgba(239, 68, 68, 0.8)",
    "rgba(168, 85, 247, 0.8)",
];

export function StatisticsSection({ data }: StatisticsSectionProps) {
    const { textColor, gridColor } = getChartColors();

    const statusChartData = {
        labels: data.statusLabels,
        datasets: [
            {
                data: data.statusValues,
                backgroundColor: STATUS_COLORS,
                borderWidth: 0,
            },
        ],
    };

    const statusChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 800,
            easing: "easeOutQuart" as const,
        },
        plugins: {
            legend: {
                position: "right" as const,
                labels: {
                    color: textColor,
                    padding: 12,
                    usePointStyle: true,
                    pointStyle: "circle",
                    font: { size: 11 },
                },
            },
            tooltip: {
                callbacks: {
                    label: (context: { dataIndex: number; parsed: number }) => {
                        const value = context.parsed;
                        const percentage = ((value / data.total) * 100).toFixed(1);
                        return ` ${value.toLocaleString()} (${percentage}%)`;
                    },
                },
            },
        },
    };

    const scoreChartData = {
        labels: data.scores.map(s => s.score.toString()),
        datasets: [
            {
                data: data.scores.map(s => s.percentage),
                backgroundColor: data.scores.map(s => {
                    if (s.score <= 3) {
                        return "rgba(239, 68, 68, 0.8)";
                    }
                    if (s.score <= 5) {
                        return "rgba(249, 115, 22, 0.8)";
                    }
                    if (s.score <= 7) {
                        return "rgba(234, 179, 8, 0.8)";
                    }
                    if (s.score <= 9) {
                        return "rgba(34, 197, 94, 0.8)";
                    }
                    return "rgba(59, 130, 246, 0.8)";
                }),
                borderRadius: 4,
            },
        ],
    };

    const scoreChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 800,
            easing: "easeOutQuart" as const,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label: (context: any) => {
                        const score = data.scores[context.dataIndex];
                        return ` ${score.percentage}% (${score.votes.toLocaleString()} votes)`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: textColor },
            },
            y: {
                grid: { color: gridColor },
                ticks: {
                    color: textColor,
                    callback: (value: number | string) => `${value}%`,
                },
            },
        },
    };

    return (
        <div className={styles.statisticsSection}>
            <h3 className={styles.statisticsTitle}>Statistics from MAL</h3>
            <div className={styles.chartsRow}>
                <div className={styles.statusChart}>
                    <h4 className={styles.chartTitle}>
                        {data.statusTitle}{" "}
                        <span className={styles.totalCount}>{data.total.toLocaleString()} users</span>
                    </h4>
                    <div className={styles.doughnutContainer}>
                        <Doughnut data={statusChartData} options={statusChartOptions} />
                    </div>
                </div>
                <div className={styles.scoreChart}>
                    <h4 className={styles.chartTitle}>Score Distribution</h4>
                    <div className={styles.chartContainer}>
                        <Bar data={scoreChartData} options={scoreChartOptions} />
                    </div>
                </div>
            </div>
        </div>
    );
}
