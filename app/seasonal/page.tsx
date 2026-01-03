"use client";

import React, { Suspense } from "react";
import { SeasonalPageClient } from "./SeasonalPageClient";
import styles from "./page.module.scss";

function SeasonalContent() {
    return <SeasonalPageClient />;
}

export default function SeasonalPage() {
    return (
        <Suspense
            fallback={
                <div className={styles.page}>
                    <div className={styles.container}>
                        <div className={styles.loading}>
                            <div className={styles.spinner} />
                            <p>Loading...</p>
                        </div>
                    </div>
                </div>
            }
        >
            <SeasonalContent />
        </Suspense>
    );
}
