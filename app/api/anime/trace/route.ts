import { NextRequest, NextResponse } from "next/server";
import { searchByImage } from "@/services/traceMoe";
import { TraceApiError } from "@/types/traceMoe";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

function isTraceApiError(error: unknown): error is TraceApiError {
    return typeof error === "object" && error !== null && "code" in error && "error" in error;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const contentType = request.headers.get("content-type") || "";

        if (!contentType.includes("multipart/form-data")) {
            return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
        }

        const formData = await request.formData();
        const imageFile = formData.get("image") as File | null;
        const cutBorders = formData.get("cutBorders") === "true";

        if (!imageFile) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        if (imageFile.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "File too large. Maximum size is 25MB" }, { status: 413 });
        }

        const arrayBuffer = await imageFile.arrayBuffer();
        const imageData = new Uint8Array(arrayBuffer);

        const { response, rateLimit } = await searchByImage(imageData, imageFile.type, { cutBorders });

        if (response.error) {
            return NextResponse.json({ error: response.error }, { status: 400 });
        }

        return NextResponse.json({
            ...response,
            rateLimit,
        });
    } catch (error) {
        console.error("[Trace API] Error:", error);

        if (isTraceApiError(error)) {
            const status =
                error.code === "RATE_LIMITED"
                    ? 429
                    : error.code === "QUOTA_EXCEEDED" || error.code === "CONCURRENCY_LIMIT"
                      ? 402
                      : 500;

            return NextResponse.json(
                {
                    error: error.error,
                    code: error.code,
                    retryAfter: error.retryAfter,
                },
                { status },
            );
        }

        const message = error instanceof Error ? error.message : "Failed to search image";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
