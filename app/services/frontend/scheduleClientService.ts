import { ScheduleResponse } from "@/types/schedule";
import { errorFromResponse } from "./upstreamError";

export async function fetchSchedule(): Promise<ScheduleResponse> {
    const response = await fetch("/api/schedule");

    if (!response.ok) {
        throw await errorFromResponse(response, "Failed to fetch schedule");
    }

    return response.json();
}
