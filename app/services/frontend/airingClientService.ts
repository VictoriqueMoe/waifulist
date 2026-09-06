import { AiringScheduleResponse } from "@/types/airing";
import { errorFromResponse } from "./upstreamError";

export async function fetchAiringSchedule(): Promise<AiringScheduleResponse> {
    const response = await fetch("/api/airing");

    if (!response.ok) {
        throw await errorFromResponse(response, "Failed to fetch airing schedule");
    }

    return response.json();
}
