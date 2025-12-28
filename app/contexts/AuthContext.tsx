"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface User {
    id: number;
    username: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string) => Promise<{ error?: string }>;
    register: (username: string, password: string) => Promise<{ error?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkSession() {
            try {
                const response = await fetch("/api/auth/me");
                const data = await response.json();
                setUser(data.user || null);
            } catch {
                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        checkSession();
    }, []);

    const login = useCallback(async (username: string, password: string): Promise<{ error?: string }> => {
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { error: data.error || "Login failed" };
            }

            setUser(data.user);
            return {};
        } catch {
            return { error: "Login failed" };
        }
    }, []);

    const register = useCallback(async (username: string, password: string): Promise<{ error?: string }> => {
        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                return { error: data.error || "Registration failed" };
            }

            setUser(data.user);
            return {};
        } catch {
            return { error: "Registration failed" };
        }
    }, []);

    const logout = useCallback(async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
    }, []);

    return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
