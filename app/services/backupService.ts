export async function dispatchBackup(): Promise<string | null> {
    try {
        const response = await fetch("/api/backup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(`Backup Failed: ${error.error || "Backup failed"}`);
            return null;
        }

        return await response.text();
    } catch (error) {
        console.error(`Backup Failed: ${error}`);
        return null;
    }
}

export async function dispatchRestore(content: string): Promise<boolean | null> {
    try {
        const response = await fetch("/api/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(`Restore Failed: ${error.error || "Restore failed"}`);
            return null;
        }
        return true;
    } catch (error) {
        console.error(`Restore Failed: ${error}`);
        return null;
    }
}
