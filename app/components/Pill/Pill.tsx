import styles from "./Pill.module.scss";
import React from "react";

type PillProps = React.PropsWithChildren<{
    variant?: "default" | "accent";
    size?: "sm" | "md";
    className?: string;
}>;

export function Pill({ children, variant = "default", size = "md", className }: PillProps) {
    const classNames = [styles.pill, styles[variant], styles[size], className].filter(Boolean).join(" ");

    return <span className={classNames}>{children}</span>;
}
