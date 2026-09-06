import { AniListFailureReason, isAniListFailureReason } from "@/types/anilist";

export class AniListUnavailableClientError extends Error {
    public readonly reason: AniListFailureReason;
    public readonly upstreamMessage: string | null;

    public constructor(message: string, reason: AniListFailureReason, upstreamMessage: string | null) {
        super(message);

        this.name = "AniListUnavailableClientError";
        this.reason = reason;
        this.upstreamMessage = upstreamMessage;
    }
}

async function readJsonBody(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

export async function errorFromResponse(response: Response, fallbackMessage: string): Promise<Error> {
    const body = await readJsonBody(response);

    if (typeof body !== "object" || body === null) {
        return new Error(fallbackMessage);
    }

    const { error, source, reason, upstreamMessage } = body as Record<string, unknown>;
    const message = typeof error === "string" && error.length > 0 ? error : fallbackMessage;

    if (source === "anilist" && isAniListFailureReason(reason)) {
        return new AniListUnavailableClientError(
            message,
            reason,
            typeof upstreamMessage === "string" ? upstreamMessage : null,
        );
    }

    return new Error(message);
}

export function failureReasonOf(error: unknown): AniListFailureReason | null {
    return error instanceof AniListUnavailableClientError ? error.reason : null;
}

export function upstreamDetailOf(error: unknown): string | null {
    return error instanceof AniListUnavailableClientError ? error.upstreamMessage : null;
}
