import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFuseIndex, lookupByTitle } from "@/services/animeData";
import { Anime } from "@/types/anime";

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

        if (!content) {
            return new Response(JSON.stringify({ error: "No file content provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const lines = content
            .split("\n")
            .map(line => line.trim())
            .filter(line => line.length > 0);

        const fuse = await getFuseIndex();

        const encoder = new TextEncoder();
        let cancelled = false;

        const stream = new ReadableStream({
            async start(controller) {
                debugger;
                const matched: { title: string; anime: Anime }[] = [];
                const unmatched: string[] = [];
                const total = lines.length;
                let fuzzySearchCount = 0;

                try {
                    for (let i = 0; i < lines.length; i++) {
                        if (cancelled) {
                            console.log("Import cancelled by client");
                            return;
                        }

                        const title = lines[i];

                        // Fast path: exact title match via Redis hash (O(1))
                        let anime = await lookupByTitle(title);

                        // Slow path: fuzzy search if exact match fails
                        if (!anime) {
                            fuzzySearchCount++;
                            const results = fuse.search(title, { limit: 1 });
                            if (results.length > 0 && results[0].score !== undefined) {
                                anime = results[0].item;
                            }
                        }

                        if (anime) {
                            matched.push({ title, anime });
                        } else {
                            unmatched.push(title);
                        }

                        // Send progress updates every 100 items
                        if ((i + 1) % 100 === 0 || i === lines.length - 1) {
                            if (cancelled) {
                                return;
                            }

                            const progress = {
                                type: "progress",
                                current: i + 1,
                                total,
                                matchedCount: matched.length,
                            };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(progress)}\n\n`));
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }

                    console.log(
                        `Import complete: ${matched.length} matched, ${unmatched.length} unmatched, ${fuzzySearchCount} fuzzy searches`,
                    );

                    if (cancelled) {
                        return;
                    }

                    const result = {
                        type: "complete",
                        matched,
                        unmatched,
                        total,
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(result)}\n\n`));
                    controller.close();
                } catch (err) {
                    console.log("Import stream error:", err);
                }
            },
            cancel() {
                console.log("Import cancelled - stream closed");
                cancelled = true;
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
