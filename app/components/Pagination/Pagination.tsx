"use client";

import React, { useState } from "react";
import styles from "./Pagination.module.scss";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    const [inputValue, setInputValue] = useState("");

    if (totalPages <= 1) {
        return null;
    }

    const getPageNumbers = () => {
        const pages: (number | "ellipsis")[] = [];
        const range = 2;

        pages.push(1);

        const start = Math.max(2, currentPage - range);
        const end = Math.min(totalPages - 1, currentPage + range);

        if (start > 2) {
            pages.push("ellipsis");
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (end < totalPages - 1) {
            pages.push("ellipsis");
        }

        if (totalPages > 1) {
            pages.push(totalPages);
        }

        return pages;
    };

    const handleInputSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const page = parseInt(inputValue, 10);
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
            setInputValue("");
        }
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className={styles.pagination}>
            <button
                className={styles.navButton}
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                title="First page"
            >
                <i className="bi bi-chevron-double-left" />
            </button>
            <button
                className={styles.navButton}
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous page"
            >
                <i className="bi bi-chevron-left" />
            </button>

            <div className={styles.pageNumbers}>
                {pageNumbers.map((page, index) =>
                    page === "ellipsis" ? (
                        <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                            ...
                        </span>
                    ) : (
                        <button
                            key={page}
                            className={`${styles.pageButton} ${page === currentPage ? styles.active : ""}`}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    ),
                )}
            </div>

            <button
                className={styles.navButton}
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next page"
            >
                <i className="bi bi-chevron-right" />
            </button>
            <button
                className={styles.navButton}
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
            >
                <i className="bi bi-chevron-double-right" />
            </button>

            <form onSubmit={handleInputSubmit} className={styles.jumpToPage}>
                <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder="Go to"
                    className={styles.pageInput}
                />
                <button type="submit" className={styles.goButton} disabled={!inputValue}>
                    Go
                </button>
            </form>
        </div>
    );
}
