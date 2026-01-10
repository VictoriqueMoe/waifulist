"use client";

import React, { ReactNode } from "react";
import Image from "next/image";
import styles from "./EntityPageLayout.module.scss";

interface EntityPageLayoutProps {
    imageUrl?: string | null;
    imageAlt: string;
    sidebarContent?: ReactNode;
    children: ReactNode;
}

export function EntityPageLayout({ imageUrl, imageAlt, sidebarContent, children }: EntityPageLayoutProps) {
    return (
        <div className={styles.page}>
            <div className={styles.backdrop}>
                {imageUrl && <Image src={imageUrl} alt="" fill className={styles.backdropImage} />}
                <div className={styles.backdropOverlay} />
            </div>

            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.imageSection}>
                        <div className={styles.entityImage}>
                            {imageUrl ? (
                                <Image src={imageUrl} alt={imageAlt} fill sizes="280px" />
                            ) : (
                                <div className={styles.noImage} />
                            )}
                        </div>
                        {sidebarContent}
                    </div>

                    <div className={styles.infoSection}>{children}</div>
                </div>
            </div>
        </div>
    );
}

interface SidebarItemProps {
    icon: string;
    iconColor?: string;
    children: ReactNode;
}

export function SidebarItem({ icon, iconColor, children }: SidebarItemProps) {
    return (
        <div className={styles.sidebarItem}>
            <i className={`bi bi-${icon}`} style={iconColor ? { color: iconColor } : undefined} />
            <span>{children}</span>
        </div>
    );
}

interface SidebarLinkProps {
    href: string;
    icon: string;
    external?: boolean;
    children: ReactNode;
}

export function SidebarLink({ href, icon, external = false, children }: SidebarLinkProps) {
    return (
        <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className={styles.sidebarLink}
        >
            <i className={`bi bi-${icon}`} />
            {children}
        </a>
    );
}

interface SidebarStatsProps {
    children: ReactNode;
}

export function SidebarStats({ children }: SidebarStatsProps) {
    return <div className={styles.sidebarStats}>{children}</div>;
}

interface SidebarStatRowProps {
    label: string;
    value: ReactNode;
}

export function SidebarStatRow({ label, value }: SidebarStatRowProps) {
    return (
        <div className={styles.sidebarStatRow}>
            <span className={styles.sidebarStatLabel}>{label}</span>
            <span className={styles.sidebarStatValue}>{value}</span>
        </div>
    );
}

interface PageHeaderProps {
    title: string;
    subtitle?: string | null;
    altTitle?: string | null;
}

export function PageHeader({ title, subtitle, altTitle }: PageHeaderProps) {
    return (
        <div className={styles.header}>
            <h1 className={styles.name}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            {altTitle && <p className={styles.altTitle}>{altTitle}</p>}
        </div>
    );
}

interface TagListProps {
    children: ReactNode;
}

export function TagList({ children }: TagListProps) {
    return <div className={styles.tagList}>{children}</div>;
}

interface TextSectionProps {
    title?: string;
    paragraphs: { text: string; isAttribution?: boolean }[];
}

export function TextSection({ title, paragraphs }: TextSectionProps) {
    if (paragraphs.length === 0) {
        return null;
    }

    return (
        <div className={styles.textSection}>
            {title && <h2 className={styles.sectionTitle}>{title}</h2>}
            {paragraphs.map((paragraph, i) => (
                <p key={i} className={paragraph.isAttribution ? styles.attribution : undefined}>
                    {paragraph.text}
                </p>
            ))}
        </div>
    );
}

interface ContentTabsWrapperProps {
    children: ReactNode;
}

export function ContentTabsWrapper({ children }: ContentTabsWrapperProps) {
    return <div className={styles.contentTabs}>{children}</div>;
}

interface MetaRowProps {
    label: string;
    children: ReactNode;
}

export function MetaRow({ label, children }: MetaRowProps) {
    return (
        <div className={styles.metaRow}>
            <span className={styles.metaLabel}>{label}</span>
            {children}
        </div>
    );
}
