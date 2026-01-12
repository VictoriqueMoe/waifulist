import { AiringSubscription } from "@/types/subscription";

export async function fetchSubscriptions(): Promise<AiringSubscription[]> {
    const response = await fetch("/api/airing-subscriptions");
    if (!response.ok) {
        if (response.status === 401) {
            return [];
        }
        throw new Error("Failed to fetch subscriptions");
    }
    const data = await response.json();
    return data.subscriptions;
}

export async function addSubscription(malId: number, title: string): Promise<boolean> {
    const response = await fetch("/api/airing-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ malId, title }),
    });
    return response.ok;
}

export async function removeSubscription(malId: number): Promise<boolean> {
    const response = await fetch("/api/airing-subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ malId }),
    });
    return response.ok;
}

export async function checkSubscription(malId: number): Promise<boolean> {
    const response = await fetch(`/api/airing-subscriptions/check/${malId}`);
    if (!response.ok) {
        return false;
    }
    const data = await response.json();
    return data.isSubscribed;
}
