import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFuseIndex, getTitleIndex } from "@/services/animeData";
import { Anime } from "@/types/anime";

export async function POST(request: NextRequest): Promise<Response> {
    const user = await getCurrentUser();
    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
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

        const [titleIndex, fuse] = await Promise.all([getTitleIndex(), getFuseIndex()]);

        const normalizeTitle = (title: string) =>
            title
                .toLowerCase()
                .trim()
                .replace(/[^\w\s]/g, "");

        const encoder = new TextEncoder();
        let cancelled = false;

        const stream = new ReadableStream({
            async start(controller) {
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
                        const normalized = normalizeTitle(title);

                        let anime = titleIndex.get(normalized);

                        if (!anime) {
                            fuzzySearchCount++;
                            const results = fuse.search(title, { limit: 1 });
                            if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.35) {
                                anime = results[0].item;
                            }
                        }

                        if (anime) {
                            matched.push({ title, anime });
                        } else {
                            unmatched.push(title);
                        }

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
                        `Import complete: ${matched.length} exact matches, ${fuzzySearchCount} fuzzy searches needed`,
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
