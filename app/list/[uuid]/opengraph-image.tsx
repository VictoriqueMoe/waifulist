import { ImageResponse } from "next/og";
import { getRecentAnime, getTopRatedAnime, getUserByPublicId, getWatchedCount } from "@/lib/db";
import { getAnimeById } from "@/services/animeData";
import { getRedis, REDIS_KEYS, REDIS_TTL } from "@/lib/redis";

export const size = { width: 1200, height: 630 };

function createHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

export default async function OGImage({ params }: { params: Promise<{ uuid: string }> }) {
    const { uuid } = await params;
    const user = getUserByPublicId(uuid);

    if (!user) {
        return new ImageResponse(
            <div
                style={{
                    display: "flex",
                    background: "#1a1a2e",
                    width: "100%",
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <span style={{ fontSize: 48, color: "#fff" }}>List Not Found</span>
            </div>,
            { ...size },
        );
    }
    const itemCount = getWatchedCount(user.id);
    const topRated = getTopRatedAnime(user.id, 5);
    const topAnimeIds = topRated.map(item => item.anime_id);

    if (topAnimeIds.length < 5) {
        const recent = getRecentAnime(user.id, 5 - topAnimeIds.length, topAnimeIds);
        topAnimeIds.push(...recent.map(item => item.anime_id));
    }

    const cacheHash = createHash(`${user.username}:${itemCount}:${topAnimeIds.join(",")}`);
    const cacheKey = REDIS_KEYS.OG_IMAGE(uuid, cacheHash);

    // Check Redis cache
    const redis = getRedis();
    try {
        const cached = await redis.getBuffer(cacheKey);
        if (cached) {
            return new Response(new Uint8Array(cached), {
                headers: { "Content-Type": "image/png" },
            });
        }
    } catch {}

    const animeCovers: string[] = [];
    for (const id of topAnimeIds) {
        const anime = await getAnimeById(id, false);
        if (anime?.main_picture?.large) {
            const jpgUrl = anime.main_picture.large.replace(".webp", ".jpg");
            animeCovers.push(jpgUrl);
        }
    }

    const petals = [
        { top: 40, left: 850, rotate: 25, size: 24, opacity: 0.7 },
        { top: 120, left: 950, rotate: -15, size: 18, opacity: 0.5 },
        { top: 80, left: 1050, rotate: 45, size: 22, opacity: 0.6 },
        { top: 200, left: 1100, rotate: -30, size: 20, opacity: 0.4 },
        { top: 350, left: 900, rotate: 60, size: 16, opacity: 0.5 },
        { top: 450, left: 1000, rotate: -45, size: 26, opacity: 0.6 },
        { top: 500, left: 850, rotate: 15, size: 20, opacity: 0.4 },
        { top: 550, left: 1100, rotate: -20, size: 18, opacity: 0.5 },
        { top: 150, left: 100, rotate: 30, size: 20, opacity: 0.3 },
        { top: 400, left: 50, rotate: -35, size: 16, opacity: 0.25 },
    ];

    const imageResponse = new ImageResponse(
        <div
            style={{
                display: "flex",
                width: "100%",
                height: "100%",
                background: "#0a0a0f",
                position: "relative",
            }}
        >
            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                }}
            >
                {animeCovers.map((cover, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            flex: 1,
                            overflow: "hidden",
                        }}
                    >
                        <img
                            src={cover}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                            alt={"anime list"}
                        />
                    </div>
                ))}
            </div>

            <div
                style={{
                    display: "flex",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                        "linear-gradient(135deg, rgba(236, 72, 153, 0.85) 0%, rgba(219, 39, 119, 0.7) 25%, rgba(15, 15, 26, 0.9) 60%, rgba(30, 15, 30, 0.95) 100%)",
                }}
            />

            {/* Sakura petals */}
            {petals.map((petal, i) => (
                <div
                    key={i}
                    style={{
                        display: "flex",
                        position: "absolute",
                        top: petal.top,
                        left: petal.left,
                        width: petal.size,
                        height: petal.size * 1.3,
                        background: `rgba(255, 183, 197, ${petal.opacity})`,
                        borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                        transform: `rotate(${petal.rotate}deg)`,
                        boxShadow: "0 0 10px rgba(255, 183, 197, 0.3)",
                    }}
                />
            ))}

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: 80,
                    position: "relative",
                }}
            >
                <span
                    style={{
                        fontSize: 28,
                        color: "#f9a8d4",
                        fontWeight: 700,
                        marginBottom: 20,
                        textTransform: "uppercase",
                        letterSpacing: 4,
                    }}
                >
                    WaifuList
                </span>
                <span
                    style={{
                        fontSize: 72,
                        fontWeight: 800,
                        color: "#ffffff",
                        lineHeight: 1.1,
                        marginBottom: 24,
                        textShadow: "0 4px 30px rgba(0,0,0,0.5)",
                    }}
                >
                    {user.username}&#39;s Anime List
                </span>
                <span
                    style={{
                        fontSize: 36,
                        color: "#e0e0e0",
                        fontWeight: 500,
                    }}
                >
                    {itemCount} anime tracked
                </span>
            </div>
        </div>,
        { ...size },
    );

    try {
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await redis.set(cacheKey, buffer, "EX", REDIS_TTL.OG_IMAGE);

        return new Response(new Uint8Array(arrayBuffer), {
            headers: { "Content-Type": "image/png" },
        });
    } catch {
        return imageResponse;
    }
}
