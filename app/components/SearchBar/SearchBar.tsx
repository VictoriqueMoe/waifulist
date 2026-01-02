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
    const [hasUserTyped, setHasUserTyped] = useState(false);
    const router = useRouter();
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const onLiveSearchRef = useRef(onLiveSearch);

    useEffect(() => {
        onLiveSearchRef.current = onLiveSearch;
    }, [onLiveSearch]);

    useEffect(() => {
        if (!onLiveSearchRef.current || !hasUserTyped) {
            return;
        }

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            onLiveSearchRef.current?.(query);
        }, debounceMs);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [query, debounceMs, hasUserTyped]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setHasUserTyped(true);
    };

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
        setHasUserTyped(true);
    };

    return (
        <form className={styles.searchBar} onSubmit={handleSubmit}>
            <i className={`bi bi-search ${styles.icon}`} />
            <input
                type="text"
                value={query}
                onChange={handleChange}
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
