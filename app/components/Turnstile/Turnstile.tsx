"use client";

import React, { useEffect, useRef } from "react";
import styles from "./Turnstile.module.scss";

interface TurnstileProps {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    onError?: () => void;
    resetSignal?: number;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function Turnstile({ onVerify, onExpire, onError, resetSignal }: TurnstileProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null | undefined>(undefined);

    useEffect(() => {
        if (!SITE_KEY) {
            onVerify("disabled");
            return;
        }

        const renderWidget = () => {
            if (!containerRef.current || !window.turnstile) {
                return;
            }

            if (widgetIdRef.current) {
                window.turnstile.remove(widgetIdRef.current);
            }

            widgetIdRef.current = window.turnstile.render(containerRef.current, {
                sitekey: SITE_KEY,
                callback: onVerify,
                "expired-callback": onExpire,
                "error-callback": onError,
                theme: "dark",
            });
        };

        if (window.turnstile) {
            renderWidget();
        } else {
            const script = document.createElement("script");
            script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
            script.async = true;
            script.onload = renderWidget;
            document.head.appendChild(script);
        }

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
            }
        };
    }, [onVerify, onExpire, onError, resetSignal]);

    if (!SITE_KEY) {
        return null;
    }

    return <div ref={containerRef} className={styles.turnstile} />;
}
