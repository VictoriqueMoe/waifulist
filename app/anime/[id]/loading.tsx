import styles from "@/contexts/LoadingContext.module.scss";

export default function Loading() {
    return (
        <div className={styles.overlay}>
            <div className={styles.spinner} />
        </div>
    );
}
