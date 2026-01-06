import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcrypt";
import type { UserSettings } from "@/types/settings";
import type { WatchStatus } from "@/types/anime";

const SALT_ROUNDS = 12;

export class DatabaseError extends Error {
    constructor(
        message: string,
        public readonly operation: string,
        public readonly cause?: unknown,
    ) {
        super(message);
        this.name = "DatabaseError";
    }
}

const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

const dataDir = path.join(process.cwd(), "data");
if (!isBuildPhase && !fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "waifulist.db");
const db = isBuildPhase ? ({} as Database.Database) : new Database(dbPath);

if (!isBuildPhase) {
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            public_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS watched_anime (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            anime_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            episodes_watched INTEGER DEFAULT 0,
            rating INTEGER DEFAULT NULL,
            notes TEXT DEFAULT NULL,
            date_added TEXT NOT NULL DEFAULT (datetime('now')),
            date_updated TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, anime_id)
        );

        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY,
            settings TEXT NOT NULL DEFAULT '{}',
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_watched_user ON watched_anime(user_id);
        CREATE INDEX IF NOT EXISTS idx_watched_status ON watched_anime(user_id, status);

        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            bookmarked_user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (bookmarked_user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, bookmarked_user_id)
        );

        CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
    `);

    function addColumnIfNotExists(table: string, column: string, definition: string): void {
        const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
        const columnExists = tableInfo.some(col => col.name === column);
        if (!columnExists) {
            db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        }
    }

    addColumnIfNotExists("watched_anime", "rating", "INTEGER DEFAULT NULL");
    addColumnIfNotExists("watched_anime", "notes", "TEXT DEFAULT NULL");
    addColumnIfNotExists("users", "public_id", "TEXT");

    const backfillPublicIds = db.transaction(() => {
        const usersWithoutPublicId = db.prepare("SELECT id FROM users WHERE public_id IS NULL").all() as {
            id: number;
        }[];
        if (usersWithoutPublicId.length > 0) {
            const updateStmt = db.prepare("UPDATE users SET public_id = ? WHERE id = ?");
            for (const user of usersWithoutPublicId) {
                updateStmt.run(crypto.randomUUID(), user.id);
            }
        }
    });
    backfillPublicIds();

    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id)");
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export interface User {
    id: number;
    username: string;
    password_hash: string;
    public_id: string;
    created_at: string;
}

export async function createUser(username: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);
    const publicId = crypto.randomUUID();

    const createUserTransaction = db.transaction(() => {
        const stmt = db.prepare("INSERT INTO users (username, password_hash, public_id) VALUES (?, ?, ?)");
        const result = stmt.run(username, passwordHash, publicId);
        const user = getUserById(result.lastInsertRowid as number);
        if (!user) {
            throw new DatabaseError("User created but could not be retrieved", "createUser");
        }
        return user;
    });

    try {
        return createUserTransaction();
    } catch (error) {
        if (error instanceof DatabaseError) {
            throw error;
        }
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            throw new DatabaseError(`Username '${username}' already exists`, "createUser", error);
        }
        throw new DatabaseError("Failed to create user", "createUser", error);
    }
}

export function getUserById(id: number): User | null {
    const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
    return stmt.get(id) as User | null;
}

export function getUserByUsername(username: string): User | null {
    const stmt = db.prepare("SELECT * FROM users WHERE username = ?");
    return stmt.get(username) as User | null;
}

export function getUserByPublicId(publicId: string): User | null {
    const stmt = db.prepare("SELECT * FROM users WHERE public_id = ?");
    return stmt.get(publicId) as User | null;
}

export function updateUsername(userId: number, newUsername: string): User {
    const updateTransaction = db.transaction(() => {
        const stmt = db.prepare("UPDATE users SET username = ? WHERE id = ?");
        const result = stmt.run(newUsername, userId);

        if (result.changes === 0) {
            throw new DatabaseError(`User with id ${userId} not found`, "updateUsername");
        }

        const user = getUserById(userId);
        if (!user) {
            throw new DatabaseError("User updated but could not be retrieved", "updateUsername");
        }
        return user;
    });

    try {
        return updateTransaction();
    } catch (error) {
        if (error instanceof DatabaseError) {
            throw error;
        }
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            throw new DatabaseError(`Username '${newUsername}' is already taken`, "updateUsername", error);
        }
        throw new DatabaseError("Failed to update username", "updateUsername", error);
    }
}

export interface WatchedAnimeRow {
    id: number;
    user_id: number;
    anime_id: number;
    status: WatchStatus;
    episodes_watched: number;
    rating: number | null;
    notes: string | null;
    date_added: string;
    date_updated: string;
}

export function addToWatchList(userId: number, animeId: number, status: string): WatchedAnimeRow {
    const addToListTransaction = db.transaction(() => {
        const stmt = db.prepare(`
            INSERT INTO watched_anime (user_id, anime_id, status)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, anime_id) DO UPDATE SET
                status = excluded.status,
                date_updated = datetime('now')
        `);
        stmt.run(userId, animeId, status);
        const row = getWatchedAnime(userId, animeId);
        if (!row) {
            throw new DatabaseError("Failed to add/update watch list entry", "addToWatchList");
        }
        return row;
    });

    try {
        return addToListTransaction();
    } catch (error) {
        if (error instanceof DatabaseError) {
            throw error;
        }
        throw new DatabaseError("Failed to add to watch list", "addToWatchList", error);
    }
}

export function restoreWatchList(userId: number, rows: WatchedAnimeRow[]): number {
    const stmt = db.prepare(`
        INSERT INTO watched_anime (user_id, anime_id, status, episodes_watched, rating, notes, date_added, date_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, anime_id) DO UPDATE SET
        status = excluded.status,
        episodes_watched = excluded.episodes_watched,
        rating = excluded.rating,
        notes = excluded.notes,
        date_added = excluded.date_added,
        date_updated = excluded.date_updated
    `);

    const restoreMany = db.transaction((watched: WatchedAnimeRow[]) => {
        let count = 0;
        for (const w of watched) {
            const result = stmt.run(
                userId,
                w.anime_id,
                w.status,
                w.episodes_watched,
                w.rating,
                w.notes ?? null,
                w.date_added,
                w.date_updated,
            );
            if (result.changes > 0) {
                count++;
            }
        }
        return count;
    });

    try {
        return restoreMany(rows);
    } catch (error) {
        throw new DatabaseError(`Failed to restore ${rows.length} anime to watch list`, "restoreWatchList", error);
    }
}

export function bulkAddToWatchList(userId: number, animeIds: number[], status: string): number {
    const stmt = db.prepare(`
        INSERT INTO watched_anime (user_id, anime_id, status)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, anime_id) DO NOTHING
    `);

    const insertMany = db.transaction((ids: number[]) => {
        let count = 0;
        for (const animeId of ids) {
            const result = stmt.run(userId, animeId, status);
            if (result.changes > 0) {
                count++;
            }
        }
        return count;
    });

    try {
        return insertMany(animeIds);
    } catch (error) {
        throw new DatabaseError(
            `Failed to bulk add ${animeIds.length} anime to watch list`,
            "bulkAddToWatchList",
            error,
        );
    }
}

export type BulkImportEntry = {
    animeId: number;
    status: WatchStatus;
    episodesWatched: number;
    rating: number | null;
    notes: string | null;
};

export function bulkImportToWatchList(userId: number, entries: BulkImportEntry[]): number {
    const stmt = db.prepare(`
        INSERT INTO watched_anime (user_id, anime_id, status, episodes_watched, rating, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, anime_id) DO UPDATE SET
            status = excluded.status,
            episodes_watched = excluded.episodes_watched,
            rating = excluded.rating,
            notes = excluded.notes,
            date_updated = datetime('now')
    `);

    const importMany = db.transaction((items: BulkImportEntry[]) => {
        let count = 0;
        for (const entry of items) {
            const result = stmt.run(
                userId,
                entry.animeId,
                entry.status,
                entry.episodesWatched,
                entry.rating,
                entry.notes,
            );
            if (result.changes > 0) {
                count++;
            }
        }
        return count;
    });

    try {
        return importMany(entries);
    } catch (error) {
        throw new DatabaseError(
            `Failed to bulk import ${entries.length} anime to watch list`,
            "bulkImportToWatchList",
            error,
        );
    }
}

export function updateWatchStatus(
    userId: number,
    animeId: number,
    updates: { status?: string; episodes_watched?: number; rating?: number | null; notes?: string | null },
): WatchedAnimeRow {
    const updateTransaction = db.transaction(() => {
        const fields: string[] = ["date_updated = datetime('now')"];
        const values: (string | number | null)[] = [];

        if (updates.status !== undefined) {
            fields.push("status = ?");
            values.push(updates.status);
        }
        if (updates.episodes_watched !== undefined) {
            fields.push("episodes_watched = ?");
            values.push(updates.episodes_watched);
        }
        if (updates.rating !== undefined) {
            fields.push("rating = ?");
            values.push(updates.rating);
        }
        if (updates.notes !== undefined) {
            fields.push("notes = ?");
            values.push(updates.notes);
        }

        values.push(userId, animeId);

        const stmt = db.prepare(`UPDATE watched_anime SET ${fields.join(", ")} WHERE user_id = ? AND anime_id = ?`);
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new DatabaseError(
                `No watch list entry found for user ${userId} and anime ${animeId}`,
                "updateWatchStatus",
            );
        }

        const row = getWatchedAnime(userId, animeId);
        if (!row) {
            throw new DatabaseError("Updated entry could not be retrieved", "updateWatchStatus");
        }
        return row;
    });

    try {
        return updateTransaction();
    } catch (error) {
        if (error instanceof DatabaseError) {
            throw error;
        }
        throw new DatabaseError("Failed to update watch status", "updateWatchStatus", error);
    }
}

export function removeFromWatchList(userId: number, animeId: number): boolean {
    try {
        const stmt = db.prepare("DELETE FROM watched_anime WHERE user_id = ? AND anime_id = ?");
        const result = stmt.run(userId, animeId);
        return result.changes > 0;
    } catch (error) {
        throw new DatabaseError("Failed to remove from watch list", "removeFromWatchList", error);
    }
}

export function getWatchedAnime(userId: number, animeId: number): WatchedAnimeRow | null {
    const stmt = db.prepare("SELECT * FROM watched_anime WHERE user_id = ? AND anime_id = ?");
    return stmt.get(userId, animeId) as WatchedAnimeRow | null;
}

export function getAllWatched(userId: number): WatchedAnimeRow[] {
    const stmt = db.prepare("SELECT * FROM watched_anime WHERE user_id = ? ORDER BY date_updated DESC");
    return stmt.all(userId) as WatchedAnimeRow[];
}

export function getWatchedByStatus(userId: number, status: WatchStatus): WatchedAnimeRow[] {
    const stmt = db.prepare("SELECT * FROM watched_anime WHERE user_id = ? AND status = ? ORDER BY date_updated DESC");
    return stmt.all(userId, status) as WatchedAnimeRow[];
}

export function getWatchedCount(userId: number): number {
    const stmt = db.prepare("SELECT COUNT(*) as count FROM watched_anime WHERE user_id = ?");
    const result = stmt.get(userId) as { count: number };
    return result.count;
}

export function getWatchedCountByStatus(userId: number): Record<string, number> {
    const stmt = db.prepare("SELECT status, COUNT(*) as count FROM watched_anime WHERE user_id = ? GROUP BY status");
    const rows = stmt.all(userId) as { status: string; count: number }[];
    const counts: Record<string, number> = {};

    for (const row of rows) {
        counts[row.status] = row.count;
    }

    return counts;
}

export function getTopRatedAnime(userId: number, limit: number = 5): WatchedAnimeRow[] {
    const stmt = db.prepare(
        "SELECT * FROM watched_anime WHERE user_id = ? AND rating IS NOT NULL ORDER BY rating DESC, date_added DESC LIMIT ?",
    );
    return stmt.all(userId, limit) as WatchedAnimeRow[];
}

export function getRecentAnime(userId: number, limit: number = 5, excludeIds: number[] = []): WatchedAnimeRow[] {
    if (excludeIds.length === 0) {
        const stmt = db.prepare("SELECT * FROM watched_anime WHERE user_id = ? ORDER BY date_added DESC LIMIT ?");
        return stmt.all(userId, limit) as WatchedAnimeRow[];
    }
    const placeholders = excludeIds.map(() => "?").join(",");
    const stmt = db.prepare(
        `SELECT * FROM watched_anime WHERE user_id = ? AND anime_id NOT IN (${placeholders}) ORDER BY date_added DESC LIMIT ?`,
    );
    return stmt.all(userId, ...excludeIds, limit) as WatchedAnimeRow[];
}

const DEFAULT_SETTINGS: UserSettings = {};

export function getUserSettings(userId: number): UserSettings {
    const stmt = db.prepare("SELECT settings FROM user_settings WHERE user_id = ?");
    const row = stmt.get(userId) as { settings: string } | undefined;

    if (!row) {
        return DEFAULT_SETTINGS;
    }

    try {
        return JSON.parse(row.settings) as UserSettings;
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export function updateUserSettings(userId: number, updates: Partial<UserSettings>): UserSettings {
    const updateTransaction = db.transaction(() => {
        const current = getUserSettings(userId);
        const merged: UserSettings = {
            ...current,
            ...updates,
            browse: updates.browse ? { ...current.browse, ...updates.browse } : current.browse,
            myList: updates.myList ? { ...current.myList, ...updates.myList } : current.myList,
        };

        const settingsJson = JSON.stringify(merged);

        const stmt = db.prepare(`
            INSERT INTO user_settings (user_id, settings, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET
                settings = excluded.settings,
                updated_at = datetime('now')
        `);
        stmt.run(userId, settingsJson);

        return merged;
    });

    try {
        return updateTransaction();
    } catch (error) {
        throw new DatabaseError("Failed to update user settings", "updateUserSettings", error);
    }
}

export interface BookmarkedUser {
    id: number;
    username: string;
    public_id: string;
    created_at: string;
    bookmarked_at: string;
    watching_count: number;
    completed_count: number;
    last_activity: string | null;
}

export function addBookmark(userId: number, bookmarkedUserId: number): boolean {
    if (userId === bookmarkedUserId) {
        return false;
    }

    try {
        const stmt = db.prepare("INSERT INTO bookmarks (user_id, bookmarked_user_id) VALUES (?, ?)");
        const result = stmt.run(userId, bookmarkedUserId);
        return result.changes > 0;
    } catch (error) {
        if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
            return false;
        }
        throw new DatabaseError("Failed to add bookmark", "addBookmark", error);
    }
}

export function removeBookmark(userId: number, bookmarkedUserId: number): boolean {
    try {
        const stmt = db.prepare("DELETE FROM bookmarks WHERE user_id = ? AND bookmarked_user_id = ?");
        const result = stmt.run(userId, bookmarkedUserId);
        return result.changes > 0;
    } catch (error) {
        throw new DatabaseError("Failed to remove bookmark", "removeBookmark", error);
    }
}

export function hasBookmark(userId: number, bookmarkedUserId: number): boolean {
    const stmt = db.prepare("SELECT 1 FROM bookmarks WHERE user_id = ? AND bookmarked_user_id = ?");
    return stmt.get(userId, bookmarkedUserId) !== undefined;
}

export function getBookmarkedUsers(userId: number): BookmarkedUser[] {
    const stmt = db.prepare(`
        SELECT
            u.id,
            u.username,
            u.public_id,
            u.created_at,
            b.created_at as bookmarked_at,
            (SELECT COUNT(*) FROM watched_anime WHERE user_id = u.id AND status = 'watching') as watching_count,
            (SELECT COUNT(*) FROM watched_anime WHERE user_id = u.id AND status = 'completed') as completed_count,
            (SELECT MAX(date_updated) FROM watched_anime WHERE user_id = u.id) as last_activity
        FROM bookmarks b
        JOIN users u ON b.bookmarked_user_id = u.id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
    `);
    return stmt.all(userId) as BookmarkedUser[];
}

export default db;
