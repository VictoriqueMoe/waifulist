export const STORAGE_KEYS = {
    THEME: "waifulist-theme",
    WATCHED_LIST: "waifulist-watched",
} as const;

export const LocalStorage = {
    getString: (key: string): string | null => {
        if (typeof window === "undefined") {
            return null;
        }
        return localStorage.getItem(key);
    },

    setString: (key: string, value: string): void => {
        if (typeof window === "undefined") {
            return;
        }
        localStorage.setItem(key, value);
    },

    getJSON: <T>(key: string): T | null => {
        if (typeof window === "undefined") {
            return null;
        }
        const value = localStorage.getItem(key);
        if (!value) {
            return null;
        }
        try {
            return JSON.parse(value) as T;
        } catch {
            return null;
        }
    },

    setJSON: <T>(key: string, value: T): void => {
        if (typeof window === "undefined") {
            return;
        }
        localStorage.setItem(key, JSON.stringify(value));
    },

    remove: (key: string): void => {
        if (typeof window === "undefined") {
            return;
        }
        localStorage.removeItem(key);
    },
};
