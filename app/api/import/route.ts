import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { runImport } from "@/services/import/ImportManager";
import type { ImportType } from "@/services/import/engines/IImportEngine";

const VALID_IMPORT_TYPES: ImportType[] = ["txt", "mal"];

export async function POST(request: NextRequest): Promise<Response> {
    const user = await getCurrentUser();
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorised" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body = await request.json();
        const content = body.content as string;
        const type: ImportType = VALID_IMPORT_TYPES.includes(body.type) ? body.type : "txt";

        if (!content) {
            return new Response(JSON.stringify({ error: "No file content provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const encoder = new TextEncoder();
        const abortController = new AbortController();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    await runImport({
                        content,
                        type,
                        signal: abortController.signal,
                        onEvent: event => {
                            if (abortController.signal.aborted) {
                                return;
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                        },
                    });
                    controller.close();
                } catch (err) {
                    console.log("Import stream error:", err);
                    if (!abortController.signal.aborted) {
                        const errorEvent = { type: "error", message: String(err) };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
                    }
                    controller.close();
                }
            },
            cancel() {
                console.log("Import cancelled - stream closed");
                abortController.abort();
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error) {
        console.error("Import error:", error);
        return new Response(JSON.stringify({ error: "Failed to import file" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
