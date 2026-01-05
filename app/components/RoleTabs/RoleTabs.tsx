"use client";

import React from "react";
import { PillTab, PillTabs } from "@/components/PillTabs/PillTabs";

export type Role = "Main" | "Supporting";

interface RoleTabsProps<T> {
    items: T[];
    getRole: (item: T) => Role;
    renderItems: (items: T[], role: Role) => React.ReactNode;
    emptyMessage?: (role: Role) => string;
}

export function RoleTabs<T>({ items, getRole, renderItems, emptyMessage }: RoleTabsProps<T>) {
    const mainItems = items.filter(item => getRole(item) === "Main");
    const supportingItems = items.filter(item => getRole(item) === "Supporting");

    const tabs: PillTab[] = [
        { id: "main", label: "Main", count: mainItems.length },
        { id: "supporting", label: "Supporting", count: supportingItems.length },
    ];

    const renderContent = (tabId: string) => {
        const role: Role = tabId === "main" ? "Main" : "Supporting";
        const activeItems = role === "Main" ? mainItems : supportingItems;
        return renderItems(activeItems, role);
    };

    const handleEmptyMessage = (tabId: string) => {
        const role: Role = tabId === "main" ? "Main" : "Supporting";
        return emptyMessage ? emptyMessage(role) : `No ${role.toLowerCase()} items`;
    };

    return <PillTabs tabs={tabs} defaultTab="main" renderContent={renderContent} emptyMessage={handleEmptyMessage} />;
}
