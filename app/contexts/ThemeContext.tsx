"use client";

import React, { createContext, useContext, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { defaultTheme, themes, ThemeType } from "@/types/theme";
import { LocalStorage, STORAGE_KEYS } from "@/constants/localStorage";

interface ThemeContextType {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    getThemeClass: () => string;
    isLightTheme: () => boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getServerSnapshot(): boolean {
    return false;
}

function subscribe(callback: () => void): () => void {
    window.addEventListener("storage", callback);
    return () => window.removeEventListener("storage", callback);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const mounted = useSyncExternalStore(subscribe, () => true, getServerSnapshot);

    const [theme, setThemeState] = useState<ThemeType>(() => {
        if (typeof window === "undefined") {
            return defaultTheme;
        }
        const savedTheme = LocalStorage.getString(STORAGE_KEYS.THEME) as ThemeType | null;
        if (savedTheme && themes.find(t => t.id === savedTheme)) {
            return savedTheme;
        }
        return defaultTheme;
    });

    useLayoutEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
        LocalStorage.setString(STORAGE_KEYS.THEME, newTheme);
    };

    const getThemeClass = (): string => {
        return `theme${theme.charAt(0).toUpperCase() + theme.slice(1)}`;
    };

    const isLightTheme = (): boolean => {
        const currentTheme = themes.find(t => t.id === theme);
        return currentTheme?.isLightTheme ?? false;
    };

    const displayTheme = mounted ? theme : defaultTheme;

    return (
        <ThemeContext.Provider value={{ theme: displayTheme, setTheme, getThemeClass, isLightTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
