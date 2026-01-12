import { AiringScheduleResponse } from "@/types/airing";

export async function fetchAiringSchedule(): Promise<AiringScheduleResponse> {
    const response = await fetch("/api/airing");

    if (!response.ok) {
        throw new Error("Failed to fetch airing schedule");
    }

    return response.json();
}
