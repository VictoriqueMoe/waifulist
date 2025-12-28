import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WatchListProvider } from "@/contexts/WatchListContext";
import { Header } from "@/components/Header/Header";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.scss";
import React from "react";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const opts = {
    title: "WaifuList - Anime Tracker",
    description: "Track your anime watching progress with WaifuList",
};

export const metadata: Metadata = {
    ...opts,
    authors: [{ name: "Victoria" }],
    icons: {
        apple: "/favicon.ico",
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
    },
    keywords: [
        "anime",
        "anime tracker",
        "anime list",
        "watchlist",
        "myanimelist",
        "anime database",
        "anime rating",
        "anime progress",
        "watch history",
        "anime catalog",
    ],
    manifest: "/site.webmanifest",
    openGraph: {
        ...opts,
        images: [
            {
                alt: "WaifuList",
                height: 335,
                type: "image/webp",
                url: "https://waifuvault.moe/assets/custom/images/vic_vault.webp",
                width: 300,
            },
        ],
        siteName: "WaifuList",
        type: "website",
    },
    twitter: {
        ...opts,
        card: "summary_large_image",
        images: ["https://waifuvault.moe/assets/custom/images/vic_vault.webp"],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${geistSans.variable} ${geistMono.variable}`}>
                <ThemeProvider>
                    <AuthProvider>
                        <WatchListProvider>
                            <Header />
                            <main>{children}</main>
                        </WatchListProvider>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
