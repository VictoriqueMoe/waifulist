import { UserStats } from "@/types/stats";

export interface StatsApiResponse {
    success: boolean;
    data?: UserStats;
    error?: string;
}

export async function fetchUserStats(): Promise<StatsApiResponse> {
    try {
        const response = await fetch("/api/stats");
        const result: StatsApiResponse = await response.json();
        return result;
    } catch {
        return { success: false, error: "Failed to load statistics" };
    }
}
