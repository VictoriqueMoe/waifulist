"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { themes } from "@/types/theme";
import styles from "./ThemeSelector.module.scss";

export function ThemeSelector() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentTheme = themes.find(t => t.id === theme);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={styles.themeSelector} ref={dropdownRef}>
            <button
                className={styles.trigger}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className={styles.preview}>{currentTheme?.preview}</span>
                <span className={styles.name}>{currentTheme?.name}</span>
                <i className={`bi bi-chevron-down ${styles.chevron} ${isOpen ? styles.open : ""}`} />
            </button>

            {isOpen && (
                <div className={styles.dropdown} role="listbox">
                    {themes.map(t => (
                        <button
                            key={t.id}
                            className={`${styles.option} ${t.id === theme ? styles.active : ""}`}
                            onClick={() => {
                                setTheme(t.id);
                                setIsOpen(false);
                            }}
                            role="option"
                            aria-selected={t.id === theme}
                        >
                            <span className={styles.optionPreview}>{t.preview}</span>
                            <div className={styles.optionInfo}>
                                <span className={styles.optionName}>{t.name}</span>
                                <span className={styles.optionDesc}>{t.description}</span>
                            </div>
                            {t.id === theme && <i className="bi bi-check2" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
