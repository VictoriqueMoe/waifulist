"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeSelector } from "@/components/ThemeSelector/ThemeSelector";
import styles from "./Header.module.scss";

export function Header() {
    const { user, loading, logout } = useAuth();
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isActive = (path: string) => {
        if (path === "/") {
            return pathname === "/";
        }
        return pathname.startsWith(path);
    };

    const closeMenu = () => setMobileMenuOpen(false);

    useEffect(() => {
        if (mobileMenuOpen) {
            const scrollY = window.scrollY;
            document.body.classList.add("mobile-menu-open");
            document.body.style.top = `-${scrollY}px`;
        } else {
            const scrollY = document.body.style.top;
            document.body.classList.remove("mobile-menu-open");
            document.body.style.top = "";
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY, 10) * -1);
            }
        }
    }, [mobileMenuOpen]);

    const handleLogout = () => {
        closeMenu();
        void logout();
    };

    return (
        <>
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
                        <Link
                            href="/browse"
                            className={`${styles.navLink} ${isActive("/browse") ? styles.active : ""}`}
                        >
                            <i className="bi bi-search" />
                            <span>Browse</span>
                        </Link>
                        <Link
                            href="/seasonal"
                            className={`${styles.navLink} ${isActive("/seasonal") ? styles.active : ""}`}
                        >
                            <i className="bi bi-calendar3" />
                            <span>Seasonal</span>
                        </Link>
                        <Link href="/trace" className={`${styles.navLink} ${isActive("/trace") ? styles.active : ""}`}>
                            <i className="bi bi-search-heart" />
                            <span>Trace</span>
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
                        <div className={styles.themeWrapper}>
                            <ThemeSelector />
                        </div>

                        {/* Desktop user menu */}
                        {!loading && (
                            <div className={styles.desktopOnly}>
                                {user ? (
                                    <div className={styles.userMenu}>
                                        <Link href="/profile" className={styles.username}>
                                            <i className="bi bi-person-circle" /> {user.username}
                                        </Link>
                                        <Link href="/settings" className={styles.settingsLink} title="Settings">
                                            <i className="bi bi-gear" />
                                        </Link>
                                        <button onClick={logout} className={styles.logoutButton}>
                                            <i className="bi bi-box-arrow-right" />
                                        </button>
                                    </div>
                                ) : (
                                    <Link href="/login" className={styles.loginLink}>
                                        <i className="bi bi-person" />
                                        <span className={styles.loginText}>Sign In</span>
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* Mobile hamburger button */}
                        <button
                            className={styles.hamburger}
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            <i className={mobileMenuOpen ? "bi bi-x-lg" : "bi bi-list"} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile menu overlay - outside header to avoid backdrop-filter containment */}
            {mobileMenuOpen && <div className={styles.overlay} onClick={closeMenu} />}

            {/* Mobile slide-out menu - outside header to avoid backdrop-filter containment */}
            <div className={`${styles.mobileMenu} ${mobileMenuOpen ? styles.open : ""}`}>
                {loading ? (
                    <div className={styles.mobileLoading}>
                        <span>Loading...</span>
                    </div>
                ) : user ? (
                    <>
                        <Link href="/profile" className={styles.mobileUserInfo} onClick={closeMenu}>
                            <i className="bi bi-person-circle" />
                            <span>{user.username}</span>
                        </Link>
                        <nav className={styles.mobileNav}>
                            <Link href="/settings" className={styles.mobileNavLink} onClick={closeMenu}>
                                <i className="bi bi-gear" />
                                <span>Settings</span>
                            </Link>
                            <button onClick={handleLogout} className={styles.mobileNavLink}>
                                <i className="bi bi-box-arrow-right" />
                                <span>Sign Out</span>
                            </button>
                        </nav>
                    </>
                ) : (
                    <nav className={styles.mobileNav}>
                        <Link href="/login" className={styles.mobileNavLink} onClick={closeMenu}>
                            <i className="bi bi-person" />
                            <span>Sign In</span>
                        </Link>
                    </nav>
                )}
                <div className={styles.mobileFooter}>
                    <a
                        href="https://github.com/VictoriqueMoe/waifulist"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.mobileGithub}
                    >
                        <i className="bi bi-github" />
                        <span>GitHub</span>
                    </a>
                    <div className={styles.mobileTheme}>
                        <span>Theme</span>
                        <ThemeSelector align="left" />
                    </div>
                </div>
            </div>
        </>
    );
}
