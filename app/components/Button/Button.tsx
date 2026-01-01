"use client";

import React from "react";
import styles from "./Button.module.scss";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
};

export function Button({ variant = "primary", size = "md", children, className, ...props }: ButtonProps) {
    return (
        <button className={`${styles.button} ${styles[variant]} ${styles[size]} ${className || ""}`} {...props}>
            {children}
        </button>
    );
}
