"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    fetchCurrentUser,
    loginUser,
    logoutUser,
    registerUser,
    updateUserUsername,
    User,
} from "@/services/authClientService";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (username: string, password: string, turnstileToken: string) => Promise<{ error?: string }>;
    register: (username: string, password: string, turnstileToken: string) => Promise<{ error?: string }>;
    logout: () => Promise<void>;
    updateUsername: (newUsername: string, password: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: React.PropsWithChildren) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkSession() {
            const currentUser = await fetchCurrentUser();
            setUser(currentUser);
            setLoading(false);
        }

        checkSession();
    }, []);

    const login = useCallback(
        async (username: string, password: string, turnstileToken: string): Promise<{ error?: string }> => {
            const result = await loginUser(username, password, turnstileToken);
            if (result.user) {
                setUser(result.user);
                return {};
            }
            return { error: result.error };
        },
        [],
    );

    const register = useCallback(
        async (username: string, password: string, turnstileToken: string): Promise<{ error?: string }> => {
            const result = await registerUser(username, password, turnstileToken);
            if (result.user) {
                setUser(result.user);
                return {};
            }
            return { error: result.error };
        },
        [],
    );

    const logout = useCallback(async () => {
        await logoutUser();
        setUser(null);
    }, []);

    const updateUsername = useCallback(async (newUsername: string, password: string): Promise<{ error?: string }> => {
        const result = await updateUserUsername(newUsername, password);
        if (result.user) {
            setUser(result.user);
            return {};
        }
        return { error: result.error };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUsername }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
