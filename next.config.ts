import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "cdn.myanimelist.net",
            },
            {
                protocol: "https",
                hostname: "api-cdn.myanimelist.net",
            },
        ],
    },
};

export default nextConfig;
