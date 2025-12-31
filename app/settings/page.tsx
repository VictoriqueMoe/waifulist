"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/Button/Button";
import styles from "./page.module.scss";

export default function SettingsPage() {
    const router = useRouter();
    const { user, loading, updateUsername } = useAuth();
    const [newUsername, setNewUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        router.push("/login");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        const trimmedUsername = newUsername.trim();

        if (!trimmedUsername) {
            setError("Please enter a new username");
            return;
        }

        if (!password) {
            setError("Please enter your password to confirm");
            return;
        }

        setSubmitting(true);

        const result = await updateUsername(trimmedUsername, password);

        if (result.error) {
            setError(result.error);
        } else {
            setSuccess("Username updated successfully");
            setNewUsername("");
            setPassword("");
        }

        setSubmitting(false);
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <h1>Settings</h1>
                    <p className={styles.subtitle}>Manage your account settings</p>

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <h2>Change Username</h2>

                        {error && <div className={styles.error}>{error}</div>}
                        {success && <div className={styles.success}>{success}</div>}

                        <div className={styles.field}>
                            <label htmlFor="currentUsername">Current Username</label>
                            <input id="currentUsername" type="text" value={user.username} disabled />
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="newUsername">New Username</label>
                            <input
                                id="newUsername"
                                type="text"
                                value={newUsername}
                                onChange={e => setNewUsername(e.target.value)}
                                placeholder="Enter new username"
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
                                placeholder="Enter your password to confirm"
                                autoComplete="current-password"
                            />
                        </div>

                        <Button type="submit" disabled={submitting} className={styles.submitButton}>
                            {submitting ? "Updating..." : "Update Username"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
