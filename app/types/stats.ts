export interface UserStats {
    username: string;
    totalAnime: number;
    statusCounts: Record<string, number>;
    genreCounts: { genre: string; count: number }[];
    ratingCounts: { rating: number; count: number }[];
    activityByMonth: { month: string; count: number }[];
    totalEpisodes: number;
    avgRating: number | null;
    memberSince: string;
}

export interface StatsApiResponse {
    success: boolean;
    data?: UserStats;
    error?: string;
}
