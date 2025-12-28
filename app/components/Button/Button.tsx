"use client";

import React from "react";
import styles from "./Button.module.scss";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
}

export function Button({ variant = "primary", size = "md", children, className, ...props }: ButtonProps) {
    return (
        <button className={`${styles.button} ${styles[variant]} ${styles[size]} ${className || ""}`} {...props}>
            {children}
        </button>
    );
}
