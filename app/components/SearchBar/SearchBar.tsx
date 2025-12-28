"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SearchBar.module.scss";

interface SearchBarProps {
    initialValue?: string;
    placeholder?: string;
    onSearch?: (query: string) => void;
    onLiveSearch?: (query: string) => void;
    navigateOnSearch?: boolean;
    debounceMs?: number;
}

export function SearchBar({
    initialValue = "",
    placeholder = "Search anime...",
    onSearch,
    onLiveSearch,
    navigateOnSearch = false,
    debounceMs = 300,
}: SearchBarProps) {
    const [query, setQuery] = useState(initialValue);
    const router = useRouter();
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!onLiveSearch) {
            return;
        }

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            onLiveSearch(query);
        }, debounceMs);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [query, onLiveSearch, debounceMs]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) {
            return;
        }

        if (onSearch) {
            onSearch(query.trim());
        }

        if (navigateOnSearch) {
            router.push(`/browse?q=${encodeURIComponent(query.trim())}`);
        }
    };

    const handleClear = () => {
        setQuery("");
        if (onLiveSearch) {
            onLiveSearch("");
        }
    };

    return (
        <form className={styles.searchBar} onSubmit={handleSubmit}>
            <i className={`bi bi-search ${styles.icon}`} />
            <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={placeholder}
                className={styles.input}
            />
            {query && (
                <button type="button" className={styles.clear} onClick={handleClear} aria-label="Clear search">
                    <i className="bi bi-x" />
                </button>
            )}
        </form>
    );
}
