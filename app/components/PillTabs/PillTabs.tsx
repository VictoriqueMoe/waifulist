"use client";

import React, { useState } from "react";
import styles from "./PillTabs.module.scss";

export interface PillTab {
    id: string;
    label: string;
    count: number;
}

interface PillTabsProps {
    tabs: PillTab[];
    defaultTab?: string;
    renderContent: (tabId: string) => React.ReactNode;
    emptyMessage?: (tabId: string) => string;
}

export function PillTabs({ tabs, defaultTab, renderContent, emptyMessage }: PillTabsProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");
    const [isTransitioning, setIsTransitioning] = useState(false);

    const activeTabData = tabs.find(t => t.id === activeTab);

    const handleTabChange = (tabId: string) => {
        if (tabId === activeTab) {
            return;
        }
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveTab(tabId);
            setIsTransitioning(false);
        }, 150);
    };

    return (
        <div className={styles.pillTabs}>
            <div className={styles.tabBar}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        {tab.label}
                        <span className={styles.count}>{tab.count}</span>
                    </button>
                ))}
            </div>
            <div className={`${styles.content} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}>
                {activeTabData?.count === 0 ? (
                    <p className={styles.emptyMessage}>{emptyMessage ? emptyMessage(activeTab) : `No items`}</p>
                ) : (
                    renderContent(activeTab)
                )}
            </div>
        </div>
    );
}
