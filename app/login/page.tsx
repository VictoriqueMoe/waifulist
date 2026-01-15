"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/Button/Button";
import { Turnstile } from "@/components/Turnstile/Turnstile";
import styles from "./page.module.scss";

export default function LoginPage() {
    const router = useRouter();
    const { login, register } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [turnstileToken, setTurnstileToken] = useState("");
    const [turnstileReset, setTurnstileReset] = useState(0);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleTurnstileVerify = useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken("");
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!username.trim() || !password) {
            setError("Please fill in all fields");
            return;
        }

        if (isRegister) {
            if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }
        }

        if (!turnstileToken) {
            setError("Please complete the verification");
            return;
        }

        setLoading(true);

        const result = isRegister
            ? await register(username, password, turnstileToken)
            : await login(username, password, turnstileToken);

        if (result.error) {
            setError(result.error);
            setLoading(false);
            setTurnstileReset(x => x + 1);
        } else {
            router.push("/my-list");
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <h1>{isRegister ? "Create Account" : "Welcome Back"}</h1>
                    <p className={styles.subtitle}>
                        {isRegister ? "Sign up to start tracking your anime" : "Sign in to your account"}
                    </p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {error && <div className={styles.error}>{error}</div>}

                        <div className={styles.field}>
                            <label htmlFor="username">Username</label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter username"
                                autoComplete="username"
                            />
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter password"
                                autoComplete={isRegister ? "new-password" : "current-password"}
                            />
                        </div>

                        {isRegister && (
                            <div className={styles.field}>
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm password"
                                    autoComplete="new-password"
                                />
                            </div>
                        )}

                        <Turnstile
                            onVerify={handleTurnstileVerify}
                            onExpire={handleTurnstileExpire}
                            resetSignal={turnstileReset}
                        />

                        <Button type="submit" disabled={loading || !turnstileToken} className={styles.submitButton}>
                            {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
                        </Button>
                    </form>

                    <div className={styles.switch}>
                        {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                        <button type="button" onClick={() => setIsRegister(!isRegister)}>
                            {isRegister ? "Sign In" : "Sign Up"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
