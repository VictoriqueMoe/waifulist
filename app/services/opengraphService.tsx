import { ImageResponse } from "next/og";
import { getRedis, REDIS_TTL } from "@/lib/redis";

export const OG_SIZE = { width: 1200, height: 630 };

const PETALS = [
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

export interface OGTheme {
    gradient: string;
    petalColor: string;
    petalShadow: string;
    labelColor: string;
}

export const OG_THEMES = {
    pink: {
        gradient:
            "linear-gradient(135deg, rgba(236, 72, 153, 0.85) 0%, rgba(219, 39, 119, 0.7) 25%, rgba(15, 15, 26, 0.9) 60%, rgba(30, 15, 30, 0.95) 100%)",
        petalColor: "255, 183, 197",
        petalShadow: "255, 183, 197",
        labelColor: "#f9a8d4",
    },
    purple: {
        gradient:
            "linear-gradient(135deg, rgba(139, 92, 246, 0.85) 0%, rgba(124, 58, 237, 0.7) 25%, rgba(15, 15, 26, 0.9) 60%, rgba(30, 15, 40, 0.95) 100%)",
        petalColor: "196, 181, 253",
        petalShadow: "196, 181, 253",
        labelColor: "#c4b5fd",
    },
} as const;

export interface OGImageConfig {
    id: string;
    images: string[];
    theme: OGTheme;
    label: string;
    title: string;
    subtitle?: string;
    stats: string;
    cacheKey: string;
}

export function createOGHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

export function createNotFoundResponse(message: string): ImageResponse {
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
            <span style={{ fontSize: 48, color: "#fff" }}>{message}</span>
        </div>,
        { ...OG_SIZE },
    );
}

export async function generateOGImage(config: OGImageConfig): Promise<Response> {
    const redis = getRedis();

    try {
        const cached = await redis.getBuffer(config.cacheKey);
        if (cached) {
            return new Response(new Uint8Array(cached), {
                headers: { "Content-Type": "image/png" },
            });
        }
    } catch {}

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
                {config.images.map((image, i) => (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            flex: 1,
                            overflow: "hidden",
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={image}
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                            }}
                            alt=""
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
                    background: config.theme.gradient,
                }}
            />

            {PETALS.map((petal, i) => (
                <div
                    key={i}
                    style={{
                        display: "flex",
                        position: "absolute",
                        top: petal.top,
                        left: petal.left,
                        width: petal.size,
                        height: petal.size * 1.3,
                        background: `rgba(${config.theme.petalColor}, ${petal.opacity})`,
                        borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                        transform: `rotate(${petal.rotate}deg)`,
                        boxShadow: `0 0 10px rgba(${config.theme.petalShadow}, 0.3)`,
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
                        color: config.theme.labelColor,
                        fontWeight: 700,
                        marginBottom: 20,
                        textTransform: "uppercase",
                        letterSpacing: 4,
                    }}
                >
                    {config.label}
                </span>
                <span
                    style={{
                        fontSize: config.subtitle ? 64 : 72,
                        fontWeight: 800,
                        color: "#ffffff",
                        lineHeight: 1.1,
                        marginBottom: 24,
                        textShadow: "0 4px 30px rgba(0,0,0,0.5)",
                        maxWidth: 800,
                    }}
                >
                    {config.title}
                </span>
                {config.subtitle && (
                    <span
                        style={{
                            fontSize: 32,
                            color: "#e0e0e0",
                            fontWeight: 500,
                            marginBottom: 12,
                        }}
                    >
                        {config.subtitle}
                    </span>
                )}
                <span
                    style={{
                        fontSize: config.subtitle ? 28 : 36,
                        color: config.subtitle ? "#a0a0a0" : "#e0e0e0",
                        fontWeight: config.subtitle ? 400 : 500,
                    }}
                >
                    {config.stats}
                </span>
            </div>
        </div>,
        { ...OG_SIZE },
    );

    try {
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await redis.setex(config.cacheKey, REDIS_TTL.OG_IMAGE, buffer);

        return new Response(new Uint8Array(arrayBuffer), {
            headers: { "Content-Type": "image/png" },
        });
    } catch {
        return imageResponse;
    }
}
