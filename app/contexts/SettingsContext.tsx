"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import type { BrowseSettings, CalendarSettings, MyListSettings, UserSettings } from "@/types/settings";
import {
    fetchUserSettings,
    updateBrowseSettingsApi,
    updateCalendarSettingsApi,
    updateMyListSettingsApi,
} from "@/services/settingsClientService";

export type { BrowseSettings, CalendarSettings, MyListSettings, UserSettings };

interface ResolvedUserSettings {
    browse: Required<BrowseSettings>;
    myList: Required<MyListSettings>;
    calendar: Required<CalendarSettings>;
}

const DEFAULT_SETTINGS: ResolvedUserSettings = {
    browse: {
        sort: "rating",
        hideSpecials: false,
    },
    myList: {
        sort: "added",
        genres: [],
    },
    calendar: {
        showSubscribedOnly: false,
    },
};

interface SettingsContextType {
    settings: ResolvedUserSettings;
    loading: boolean;
    updateBrowseSettings: (updates: Partial<BrowseSettings>) => Promise<void>;
    updateMyListSettings: (updates: Partial<MyListSettings>) => Promise<void>;
    updateCalendarSettings: (updates: Partial<CalendarSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: React.PropsWithChildren) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<ResolvedUserSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const previousUserId = useRef<number | null>(null);
    const effectVersion = useRef(0);

    useEffect(() => {
        const version = ++effectVersion.current;
        const currentUserId = user?.id ?? null;

        if (previousUserId.current !== null && currentUserId === null) {
            previousUserId.current = null;
            Promise.resolve().then(() => {
                if (effectVersion.current === version) {
                    setSettings(DEFAULT_SETTINGS);
                    setLoading(false);
                }
            });
            return;
        }

        if (!user) {
            previousUserId.current = null;
            Promise.resolve().then(() => {
                if (effectVersion.current === version) {
                    setLoading(false);
                }
            });
            return;
        }

        if (previousUserId.current === currentUserId) {
            return;
        }

        previousUserId.current = currentUserId;

        (async () => {
            setLoading(true);
            try {
                const userSettings = await fetchUserSettings();
                if (effectVersion.current === version && userSettings) {
                    setSettings({
                        browse: { ...DEFAULT_SETTINGS.browse, ...userSettings.browse },
                        myList: { ...DEFAULT_SETTINGS.myList, ...userSettings.myList },
                        calendar: { ...DEFAULT_SETTINGS.calendar, ...userSettings.calendar },
                    });
                }
            } catch (error) {
                console.error(error);
            } finally {
                if (effectVersion.current === version) {
                    setLoading(false);
                }
            }
        })();
    }, [user]);

    const updateBrowseSettings = useCallback(
        async (updates: Partial<BrowseSettings>) => {
            const newBrowse = { ...settings.browse, ...updates };
            setSettings(prev => ({ ...prev, browse: newBrowse }));

            if (!user) {
                return;
            }

            try {
                await updateBrowseSettingsApi(updates);
            } catch (error) {
                console.error("Failed to save browse settings:", error);
            }
        },
        [user, settings.browse],
    );

    const updateMyListSettings = useCallback(
        async (updates: Partial<MyListSettings>) => {
            const newMyList = { ...settings.myList, ...updates };
            setSettings(prev => ({ ...prev, myList: newMyList }));

            if (!user) {
                return;
            }

            try {
                await updateMyListSettingsApi(updates);
            } catch (error) {
                console.error("Failed to save myList settings:", error);
            }
        },
        [user, settings.myList],
    );

    const updateCalendarSettings = useCallback(
        async (updates: Partial<CalendarSettings>) => {
            const newCalendar = { ...settings.calendar, ...updates };
            setSettings(prev => ({ ...prev, calendar: newCalendar }));

            if (!user) {
                return;
            }

            try {
                await updateCalendarSettingsApi(updates);
            } catch (error) {
                console.error("Failed to save calendar settings:", error);
            }
        },
        [user, settings.calendar],
    );

    const value = useMemo(
        () => ({ settings, loading, updateBrowseSettings, updateMyListSettings, updateCalendarSettings }),
        [settings, loading, updateBrowseSettings, updateMyListSettings, updateCalendarSettings],
    );

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
