import { ComparisonData } from "@/types/compare";

export interface CompareApiResponse {
    success: boolean;
    data?: ComparisonData;
    error?: string;
}

export async function fetchComparison(targetUuid: string): Promise<CompareApiResponse> {
    try {
        const response = await fetch(`/api/compare/${targetUuid}`);
        const result: CompareApiResponse = await response.json();
        return result;
    } catch {
        return { success: false, error: "Failed to load comparison data" };
    }
}
