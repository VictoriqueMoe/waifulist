"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeSelector } from "@/components/ThemeSelector/ThemeSelector";
import styles from "./Header.module.scss";

export function Header() {
    const { user, loading, logout } = useAuth();
    const pathname = usePathname();

    const isActive = (path: string) => {
        if (path === "/") {
            return pathname === "/";
        }
        return pathname.startsWith(path);
    };

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    <span className={styles.logoIcon}>
                        <i className="bi bi-collection-play" />
                    </span>
                    <span className={styles.logoText}>WaifuList</span>
                </Link>

                <nav className={styles.nav}>
                    <Link href="/" className={`${styles.navLink} ${isActive("/") ? styles.active : ""}`}>
                        <i className="bi bi-house" />
                        <span>Home</span>
                    </Link>
                    <Link href="/browse" className={`${styles.navLink} ${isActive("/browse") ? styles.active : ""}`}>
                        <i className="bi bi-search" />
                        <span>Browse</span>
                    </Link>
                    {user && (
                        <Link
                            href="/my-list"
                            className={`${styles.navLink} ${isActive("/my-list") ? styles.active : ""}`}
                        >
                            <i className="bi bi-bookmark" />
                            <span>My List</span>
                        </Link>
                    )}
                </nav>

                <div className={styles.actions}>
                    <a
                        href="https://github.com/VictoriqueMoe/waifulist"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.githubLink}
                        title="View on GitHub"
                    >
                        <i className="bi bi-github" />
                    </a>
                    <ThemeSelector />
                    {!loading && (
                        <>
                            {user ? (
                                <div className={styles.userMenu}>
                                    <span className={styles.username}>
                                        <i className="bi bi-person-circle" /> {user.username}
                                    </span>
                                    <Link href="/settings" className={styles.settingsLink} title="Settings">
                                        <i className="bi bi-gear" />
                                    </Link>
                                    <button onClick={logout} className={styles.logoutButton}>
                                        <i className="bi bi-box-arrow-right" />
                                    </button>
                                </div>
                            ) : (
                                <Link href="/login" className={styles.loginLink}>
                                    <i className="bi bi-person" /> Sign In
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
