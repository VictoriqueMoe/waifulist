"use client";

import Link from "next/link";
import { AiringSubscription } from "@/types/subscription";
import styles from "./SubscribedShowsSection.module.scss";

interface SubscribedShowsSectionProps {
    subscriptions: AiringSubscription[];
    onRemove: (malId: number) => void;
}

export function SubscribedShowsSection({ subscriptions, onRemove }: SubscribedShowsSectionProps) {
    if (subscriptions.length === 0) {
        return null;
    }

    return (
        <div className={styles.section}>
            <h2 className={styles.title}>
                <i className="bi bi-bell-fill" />
                Subscribed Shows
            </h2>
            <p className={styles.subtitle}>Currently airing anime you&apos;re tracking</p>
            <div className={styles.grid}>
                {subscriptions.map(sub => (
                    <div key={sub.malId} className={styles.card}>
                        <button
                            className={styles.removeButton}
                            onClick={() => onRemove(sub.malId)}
                            title="Unsubscribe"
                            aria-label={`Unsubscribe from ${sub.title}`}
                        >
                            <i className="bi bi-x" />
                        </button>
                        <Link href={`/anime/${sub.malId}`} className={styles.cardLink}>
                            <div className={styles.icon}>
                                <i className="bi bi-tv" />
                            </div>
                            <div className={styles.info}>
                                <span className={styles.showTitle}>{sub.title}</span>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
            <Link href="/calendar?view=timeline" className={styles.viewAll}>
                View Timeline <i className="bi bi-arrow-right" />
            </Link>
        </div>
    );
}
